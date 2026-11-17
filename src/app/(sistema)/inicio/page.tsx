"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { inicioDoPapel, useAuth } from "@/components/auth";
import { Emblema } from "@/components/logo";

export default function Inicio() {
  const { carregando, perfil } = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (carregando) return;
    router.replace(perfil ? inicioDoPapel(perfil.papel) : "/login");
  }, [carregando, perfil, router]);
  return (
    <div className="grid min-h-dvh place-items-center">
      <Emblema className="size-16 animate-pulse" />
    </div>
  );
}
