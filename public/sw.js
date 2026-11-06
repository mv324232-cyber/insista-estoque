/* Service worker da Insista — permite abrir o app e dar baixa sem internet.
 *
 * Estratégias:
 *  - Páginas (navegação): rede primeiro; sem rede, usa a cópia guardada.
 *  - Arquivos do Next (/_next/static): cache primeiro (são imutáveis).
 *  - Fotos dos produtos (Supabase Storage): cache primeiro.
 *  - Chamadas à API do Supabase: nunca passam pelo cache (a fila offline cuida disso).
 */
const VERSAO = "insista-v2";
const CACHE_PAGINAS = `${VERSAO}-paginas`;
const CACHE_ESTATICOS = `${VERSAO}-estaticos`;
const CACHE_FOTOS = `${VERSAO}-fotos`;
const PAGINAS_ESSENCIAIS = ["/vender", "/login", "/"];
const ARQUIVOS_BASE = ["/manifest.webmanifest", "/icons/icon-192.png", "/icons/icon-512.png", "/offline.html"];

/** Lê o HTML de uma página e guarda também os JS/CSS que ela usa. */
async function guardarPaginaCompleta(url, resposta) {
  const paginas = await caches.open(CACHE_PAGINAS);
  await paginas.put(url, resposta.clone());
  const html = await resposta.text();
  const arquivos = [...new Set(html.match(/\/_next\/static\/[^"'\s)\\]+/g) || [])];
  const estaticos = await caches.open(CACHE_ESTATICOS);
  await Promise.all(
    arquivos.map(async (a) => {
      if (await estaticos.match(a)) return;
      try {
        const r = await fetch(a);
        if (r.ok) await estaticos.put(a, r);
      } catch {}
    }),
  );
}

self.addEventListener("install", (evento) => {
  evento.waitUntil(
    (async () => {
      const estaticos = await caches.open(CACHE_ESTATICOS);
      await Promise.all(ARQUIVOS_BASE.map((a) => estaticos.add(a).catch(() => {})));
      for (const p of PAGINAS_ESSENCIAIS) {
        try {
          const r = await fetch(p, { cache: "no-store" });
          if (r.ok) await guardarPaginaCompleta(p, r);
        } catch {}
      }
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (evento) => {
  evento.waitUntil(
    (async () => {
      const nomes = await caches.keys();
      await Promise.all(nomes.filter((n) => !n.startsWith(VERSAO)).map((n) => caches.delete(n)));
      await self.clients.claim();
    })(),
  );
});

// A página avisa quais arquivos já carregou, para guardá-los também.
self.addEventListener("message", (evento) => {
  const dados = evento.data || {};
  if (dados.tipo !== "guardar" || !Array.isArray(dados.urls)) return;
  evento.waitUntil(
    (async () => {
      const estaticos = await caches.open(CACHE_ESTATICOS);
      for (const u of dados.urls) {
        try {
          const url = new URL(u, self.location.origin);
          if (url.origin !== self.location.origin) continue;
          if (url.pathname.startsWith("/_next/static/")) {
            if (!(await estaticos.match(url.pathname))) {
              const r = await fetch(url.pathname);
              if (r.ok) await estaticos.put(url.pathname, r);
            }
          } else if (!url.pathname.startsWith("/api/")) {
            const r = await fetch(url.pathname, { cache: "no-store" });
            if (r.ok && (r.headers.get("content-type") || "").includes("text/html")) {
              await guardarPaginaCompleta(url.pathname, r);
            }
          }
        } catch {}
      }
    })(),
  );
});

function chavePagina(url) {
  // /vender?x=1 e /vender/ usam a mesma cópia
  const p = url.pathname.replace(/\/+$/, "") || "/";
  return p;
}

self.addEventListener("fetch", (evento) => {
  const req = evento.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // Fotos públicas do Supabase Storage
  if (url.pathname.includes("/storage/v1/object/public/")) {
    evento.respondWith(
      (async () => {
        const cache = await caches.open(CACHE_FOTOS);
        const salvo = await cache.match(req);
        if (salvo) return salvo;
        try {
          const r = await fetch(req);
          if (r.ok || r.type === "opaque") cache.put(req, r.clone());
          return r;
        } catch {
          return new Response("", { status: 504 });
        }
      })(),
    );
    return;
  }

  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return;

  // Arquivos do Next: imutáveis
  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/")) {
    evento.respondWith(
      (async () => {
        const cache = await caches.open(CACHE_ESTATICOS);
        const salvo = await cache.match(url.pathname);
        if (salvo) return salvo;
        const r = await fetch(req);
        if (r.ok) cache.put(url.pathname, r.clone());
        return r;
      })(),
    );
    return;
  }

  // Navegação entre páginas
  if (req.mode === "navigate") {
    evento.respondWith(
      (async () => {
        const chave = chavePagina(url);
        try {
          const controle = new AbortController();
          const limite = setTimeout(() => controle.abort(), 5000); // sinal ruim: não espera para sempre
          const r = await fetch(req, { signal: controle.signal });
          clearTimeout(limite);
          if (r.ok && (r.headers.get("content-type") || "").includes("text/html")) {
            evento.waitUntil(guardarPaginaCompleta(chave, r.clone()));
          }
          return r;
        } catch {
          const paginas = await caches.open(CACHE_PAGINAS);
          const salvo =
            (await paginas.match(chave)) ||
            (chave.startsWith("/vender") ? await paginas.match("/vender") : null) ||
            (await paginas.match("/vender"));
          if (salvo) return salvo;
          return (await caches.match("/offline.html")) || new Response("Sem conexão", { status: 503 });
        }
      })(),
    );
  }
});
