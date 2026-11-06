"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, LogIn } from "lucide-react";
import { inicioDoPapel, useAuth } from "@/components/auth";
import { Logo } from "@/components/logo";
import { BotaoTema } from "@/components/tema";
import { Aviso, Botao, Campo, Rotulo } from "@/components/ui";
import { supabase } from "@/lib/supabase";
import { emailDeLogin } from "@/lib/usuarios";

export default function Login() {
  const { carregando, perfil } = useAuth();
  const router = useRouter();
  const [usuario, setUsuario] = useState("");
  const [senha, setSenha] = useState("");
  const [ver, setVer] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (!carregando && perfil) router.replace(inicioDoPapel(perfil.papel));
  }, [carregando, perfil, router]);

  async function entrar(e: FormEvent) {
    e.preventDefault();
    setErro(null);
    if (!navigator.onLine) {
      setErro("Sem internet. O primeiro acesso precisa de conexão.");
      return;
    }
    setEnviando(true);
    const { error } = await supabase().auth.signInWithPassword({
      email: emailDeLogin(usuario),
      password: senha,
    });
    setEnviando(false);
    if (error) {
      setErro(
        /invalid login|credentials/i.test(error.message)
          ? "Usuário ou senha incorretos."
          : /banned/i.test(error.message)
            ? "Acesso desativado. Fale com o dono."
            : `Não foi possível entrar: ${error.message}`,
      );
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-5 py-6">
      <div className="flex items-center justify-between">
        <Logo subtitulo="Estoque e vendas" />
        <BotaoTema />
      </div>

      <form onSubmit={entrar} className="my-auto space-y-5 py-10">
        <div>
          <h1 className="font-marca text-4xl font-extrabold uppercase tracking-wide">Entrar</h1>
          <p className="text-suave">Use o usuário e a senha que o dono te passou.</p>
        </div>
        <div>
          <Rotulo htmlFor="usuario">Usuário</Rotulo>
          <Campo
            id="usuario"
            autoComplete="username"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            required
            placeholder="ex.: joao"
            value={usuario}
            onChange={(e) => setUsuario(e.target.value)}
            className="min-h-14 text-lg"
          />
        </div>
        <div>
          <Rotulo htmlFor="senha">Senha</Rotulo>
          <div className="relative">
            <Campo
              id="senha"
              type={ver ? "text" : "password"}
              autoComplete="current-password"
              required
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              className="min-h-14 pr-14 text-lg"
            />
            <button
              type="button"
              onClick={() => setVer((v) => !v)}
              className="absolute inset-y-0 right-1 my-auto grid size-12 place-items-center text-suave"
              aria-label={ver ? "Esconder senha" : "Mostrar senha"}
            >
              {ver ? <EyeOff className="size-6" /> : <Eye className="size-6" />}
            </button>
          </div>
        </div>
        {erro && <Aviso tom="perigo">{erro}</Aviso>}
        <Botao type="submit" tamanho="xl" bloco carregando={enviando}>
          <LogIn className="size-6" /> Entrar
        </Botao>
      </form>
    </main>
  );
}
