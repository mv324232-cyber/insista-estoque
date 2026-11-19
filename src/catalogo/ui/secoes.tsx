"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { Droplets, MessageCircle, ShieldCheck, ShoppingBag, Shirt, Sun, Truck, Wind } from "lucide-react";
import { LOJA, MEDIDAS, imagem, linkWhatsapp, precoTexto } from "../config";
import { PRODUTOS } from "../produtos";
import { Espiga, IconeWhatsapp } from "./icones";
import { Revelar, TituloSecao } from "./revelar";
import { Marca } from "./cabecalho";

const BENEFICIOS = [
  { icone: Sun, titulo: "Proteção UV50+", texto: "Bloqueia os raios do sol no campo e na cidade." },
  { icone: Wind, titulo: "Tecido dry", texto: "Leve, macio e respirável para o dia inteiro." },
  { icone: Droplets, titulo: "Secagem rápida", texto: "Não segura o suor, mais conforto na lida." },
  { icone: ShieldCheck, titulo: "Não desbota", texto: "Estampa sublimada total, cores vivas por muito tempo." },
];

export function Beneficios() {
  return (
    <section className="grao relative overflow-hidden bg-l-couro px-4 py-20 sm:px-6 sm:py-28">
      <div aria-hidden className="absolute -right-20 top-10 -z-10 size-[28rem] rounded-full bg-l-vermelho/15 blur-3xl" />
      <div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-2">
        <div>
          <Revelar>
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.3em] text-l-trigo">Feita para a lida</p>
            <h2 className="font-display text-5xl uppercase leading-[0.92] sm:text-7xl">
              Qualidade que <span className="text-l-vermelho">aguenta</span> o tranco.
            </h2>
            <p className="mt-5 max-w-lg text-lg text-l-areia">
              Do sol do meio-dia à poeira da estrada: cada camiseta Insista é pensada para trabalhar com você e ainda chegar bonita na
              cidade.
            </p>
          </Revelar>
          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            {BENEFICIOS.map((b, i) => (
              <Revelar key={b.titulo} atraso={i * 0.08}>
                <div className="h-full rounded-2xl border border-l-tinta/10 bg-l-preto/40 p-5 transition hover:border-l-trigo/40">
                  <b.icone className="size-8 text-l-trigo" />
                  <p className="mt-3 font-display text-xl uppercase">{b.titulo}</p>
                  <p className="mt-1 text-sm text-l-areia">{b.texto}</p>
                </div>
              </Revelar>
            ))}
          </div>
        </div>
        <Revelar className="relative" y={50}>
          <div className="relative mx-auto aspect-square max-w-xl overflow-hidden rounded-3xl border border-l-tinta/10 shadow-2xl">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imagem("02", "anuncio")} alt="Anúncio da camiseta Agro é Minha Vida" loading="lazy" className="size-full object-cover" />
          </div>
          <motion.div
            initial={{ rotate: -12, scale: 0.6, opacity: 0 }}
            whileInView={{ rotate: -8, scale: 1, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ type: "spring", stiffness: 140, damping: 12, delay: 0.3 }}
            className="absolute -left-2 -top-5 grid size-32 place-items-center rounded-full couro border-4 border-dashed border-[#f4c56a]/80 text-center text-[#f8e7c4] shadow-xl sm:-left-6 sm:size-40"
          >
            <span>
              <span className="block text-xs font-bold uppercase tracking-widest">cada uma</span>
              <span className="block font-display text-3xl leading-none sm:text-4xl">{precoTexto(LOJA.preco)}</span>
            </span>
          </motion.div>
        </Revelar>
      </div>
    </section>
  );
}

export function TabelaMedidas({ compacta = false }: { compacta?: boolean }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-l-tinta/10">
      <table className="w-full text-center">
        <thead className="bg-l-vermelho text-white">
          <tr className={compacta ? "text-xs" : "text-xs sm:text-sm"}>
            <th className="px-2 py-3 font-bold uppercase tracking-wider">Tam.</th>
            <th className="px-2 py-3 font-bold uppercase tracking-wider">Largura</th>
            <th className="px-2 py-3 font-bold uppercase tracking-wider">Comprimento</th>
            <th className="px-2 py-3 font-bold uppercase tracking-wider">Manga</th>
          </tr>
        </thead>
        <tbody>
          {MEDIDAS.map((m, i) => (
            <tr key={m.tamanho} className={i % 2 ? "bg-l-tinta/[0.03]" : "bg-transparent"}>
              <td className={`font-display ${compacta ? "py-2 text-xl" : "py-3 text-2xl sm:text-3xl"} text-l-trigo`}>{m.tamanho}</td>
              <td className={compacta ? "py-2" : "py-3 text-lg"}>{m.largura} cm</td>
              <td className={compacta ? "py-2" : "py-3 text-lg"}>{m.comprimento} cm</td>
              <td className={compacta ? "py-2" : "py-3 text-lg"}>{m.manga} cm</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="bg-l-tinta/[0.03] px-3 py-2 text-xs text-l-areia">Pode haver variação de até 2 cm. Modelo brasileiro.</p>
    </div>
  );
}

function DesenhoMedidas() {
  // camiseta manga longa (vista frontal) com as três medidas
  return (
    <svg viewBox="0 0 360 330" className="w-full max-w-md" role="img" aria-label="Como medir: largura de axila a axila, comprimento do ombro à barra e manga do ombro ao punho">
      <path
        d="M132 20 C142 40 160 48 180 48 C200 48 218 40 228 20 L268 32 L300 62 L340 262 L304 272 L262 120 L262 304 L98 304 L98 120 L56 272 L20 262 L60 62 L92 32 Z"
        fill="var(--color-l-couro-2)"
        stroke="var(--color-l-trigo)"
        strokeOpacity=".55"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="M132 20 C142 40 160 48 180 48 C200 48 218 40 228 20" fill="none" stroke="var(--color-l-trigo)" strokeOpacity=".55" strokeWidth="6" />
      <g fontFamily="sans-serif" fontWeight="800" fontSize="13" letterSpacing="1">
        {/* largura */}
        <line x1="100" y1="128" x2="260" y2="128" stroke="#d0142f" strokeWidth="3" />
        <circle cx="100" cy="128" r="5" fill="#d0142f" />
        <circle cx="260" cy="128" r="5" fill="#d0142f" />
        <rect x="134" y="105" width="92" height="20" rx="4" fill="#d0142f" />
        <text x="180" y="119.5" textAnchor="middle" fill="#fff">LARGURA</text>
        {/* comprimento */}
        <line x1="180" y1="52" x2="180" y2="300" stroke="var(--color-l-trigo)" strokeWidth="3" strokeDasharray="7 5" />
        <circle cx="180" cy="52" r="5" fill="var(--color-l-trigo)" />
        <circle cx="180" cy="300" r="5" fill="var(--color-l-trigo)" />
        <rect x="120" y="200" width="120" height="20" rx="4" fill="var(--color-l-trigo)" />
        <text x="180" y="214.5" textAnchor="middle" fill="var(--color-l-preto)">COMPRIMENTO</text>
        {/* manga */}
        <line x1="268" y1="34" x2="320" y2="266" stroke="var(--color-l-creme)" strokeWidth="3" />
        <circle cx="268" cy="34" r="5" fill="var(--color-l-creme)" />
        <circle cx="320" cy="266" r="5" fill="var(--color-l-creme)" />
        <rect x="276" y="140" width="62" height="20" rx="4" fill="var(--color-l-creme)" />
        <text x="307" y="154.5" textAnchor="middle" fill="var(--color-l-preto)">MANGA</text>
      </g>
    </svg>
  );
}

export function Medidas() {
  return (
    <section id="medidas" className="scroll-mt-20 bg-l-carvao px-4 py-20 sm:px-6 sm:py-28">
      <TituloSecao selo="Acerte no tamanho" titulo="Tabela de" destaque="medidas">
        Meça uma camiseta que você já usa e compare. As medidas são iguais para todas as estampas.
      </TituloSecao>
      <div className="mx-auto grid max-w-5xl items-center gap-10 md:grid-cols-2">
        <Revelar className="flex justify-center">
          <DesenhoMedidas />
        </Revelar>
        <Revelar atraso={0.1}>
          <TabelaMedidas />
          <ul className="mt-5 space-y-2 text-sm text-l-areia">
            <li><strong className="text-l-creme">Largura:</strong> de uma axila à outra, com a camiseta esticada.</li>
            <li><strong className="text-l-creme">Comprimento:</strong> do ponto mais alto do ombro até a barra.</li>
            <li><strong className="text-l-creme">Manga:</strong> do ombro até o punho.</li>
          </ul>
        </Revelar>
      </div>
    </section>
  );
}

const PASSOS = [
  { icone: Shirt, titulo: "Escolha", texto: "Navegue pelas coleções e escolha suas estampas favoritas." },
  { icone: ShoppingBag, titulo: "Monte a sacola", texto: "Selecione tamanho e quantidade. Pode misturar à vontade." },
  { icone: MessageCircle, titulo: "Finalize no WhatsApp", texto: "Seu pedido chega pronto. Combinamos pagamento e frete." },
  { icone: Truck, titulo: "Receba", texto: "Enviamos para todo o Brasil, direto na sua casa ou fazenda." },
];

export function ComoComprar() {
  return (
    <section id="como-comprar" className="grao scroll-mt-20 bg-l-preto px-4 py-20 sm:px-6 sm:py-28">
      <TituloSecao selo="Simples assim" titulo="Como" destaque="comprar" />
      <div role="list" className="relative mx-auto grid max-w-6xl gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div aria-hidden className="pesponto absolute left-[12%] right-[12%] top-12 hidden lg:block" />
        {PASSOS.map((p, i) => (
          <Revelar key={p.titulo} atraso={i * 0.1}>
            <div role="listitem" className="relative h-full rounded-2xl border border-l-tinta/10 bg-l-carvao p-6 text-center">
              <span className="mx-auto grid size-16 place-items-center rounded-2xl bg-l-vermelho text-white shadow-[0_10px_25px_-10px_rgb(208_20_47/0.9)]">
                <p.icone className="size-8" />
              </span>
              <span className="absolute right-4 top-3 font-display text-5xl text-l-tinta/[0.07]">0{i + 1}</span>
              <p className="mt-4 font-display text-2xl uppercase">{p.titulo}</p>
              <p className="mt-1 text-sm text-l-areia">{p.texto}</p>
            </div>
          </Revelar>
        ))}
      </div>
    </section>
  );
}

export function ChamadaFinal() {
  const vitrine = ["64", "09", "51", "14", "98"];
  return (
    <section className="couro costura relative overflow-hidden px-4 py-20 text-[#f8e7c4] sm:px-6">
      <div aria-hidden className="absolute inset-0 bg-[radial-gradient(80%_80%_at_80%_50%,rgb(0_0_0/0.35),transparent_70%)]" />
      <div className="relative mx-auto grid max-w-7xl items-center gap-10 lg:grid-cols-2">
        <Revelar>
          <p className="font-script text-3xl text-[#f4c56a]">Chegou a hora</p>
          <h2 className="font-display text-4xl uppercase leading-[0.95] sm:text-6xl">
            Bora vestir
            <br />o agro?
          </h2>
          <p className="mt-4 max-w-md text-lg text-white/85">
            Chama no WhatsApp: tiramos dúvidas, ajudamos com o tamanho e fechamos seu pedido rapidinho.
          </p>
          <a
            href={linkWhatsapp("Olá, Insista! Quero fazer um pedido.")}
            target="_blank"
            rel="noopener"
            className="mt-8 inline-flex min-h-16 items-center gap-3 rounded-xl bg-[#0b0a09] px-8 font-bold uppercase tracking-wider shadow-2xl transition hover:scale-[1.02]"
          >
            <IconeWhatsapp className="size-7 text-[#25d366]" /> {LOJA.whatsappExibicao}
          </a>
        </Revelar>
        <div className="relative h-64 sm:h-80">
          {vitrine.map((c, i) => (
            <motion.div
              key={c}
              initial={{ opacity: 0, y: 60, rotate: 0 }}
              whileInView={{ opacity: 1, y: 0, rotate: (i - 2) * 7 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08, type: "spring", stiffness: 120, damping: 14 }}
              className="absolute top-1/2 w-[48%] -translate-y-1/2 drop-shadow-[0_20px_30px_rgb(0_0_0/0.5)]"
              style={{ left: `${i * 13}%`, zIndex: i === 2 ? 10 : 5 - Math.abs(i - 2) }}
            >
              <Link href={`/produto/${c}`} tabIndex={-1} aria-hidden>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imagem(c, "camiseta-p")} alt="" loading="lazy" className="w-full" />
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function Rodape() {
  return (
    <footer className="border-t border-l-tinta/10 bg-l-preto px-4 pb-24 pt-14 text-l-areia sm:px-6 sm:pb-14">
      <div className="mx-auto grid max-w-7xl gap-10 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <Marca />
          <p className="mt-4 max-w-sm text-sm">
            Camisetas manga longa com estampa total para quem vive o agro. {PRODUTOS.length} estampas exclusivas, do trator à cavalgada.
          </p>
          <p className="mt-4 flex items-center gap-2 font-display text-lg uppercase text-l-creme">
            <Espiga className="size-5 text-l-vermelho" /> {LOJA.slogan}
          </p>
        </div>
        <div>
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.25em] text-l-creme">Navegue</p>
          <ul className="space-y-2 text-sm">
            <li><Link href="/#colecoes" className="hover:text-l-creme">Coleções</Link></li>
            <li><Link href="/#catalogo" className="hover:text-l-creme">Catálogo completo</Link></li>
            <li><Link href="/#medidas" className="hover:text-l-creme">Tabela de medidas</Link></li>
            <li><Link href="/#como-comprar" className="hover:text-l-creme">Como comprar</Link></li>
          </ul>
        </div>
        <div>
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.25em] text-l-creme">Atendimento</p>
          <a
            href={linkWhatsapp("Olá, Insista!")}
            target="_blank"
            rel="noopener"
            className="flex items-center gap-2 text-sm font-semibold text-l-creme hover:text-[#25d366]"
          >
            <IconeWhatsapp /> {LOJA.whatsappExibicao}
          </a>
          <p className="mt-2 text-sm">Envio para todo o Brasil.</p>
        </div>
      </div>
      <div className="mx-auto mt-10 flex max-w-7xl flex-col gap-2 border-t border-l-tinta/10 pt-6 text-xs sm:flex-row sm:items-center sm:justify-between">
        <p>© {new Date().getFullYear()} Insista. Todos os direitos reservados.</p>
        <Link href="/login" className="hover:text-l-creme">
          Área da equipe
        </Link>
      </div>
    </footer>
  );
}
