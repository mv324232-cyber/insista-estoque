"use client";

import { useEffect, type ReactNode } from "react";
import { ProvedorAuth } from "./auth";
import { ProvedorAvisos } from "./avisos";

function registrarServiceWorker() {
  if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
  navigator.serviceWorker
    .register("/sw.js")
    .then(() => navigator.serviceWorker.ready)
    .then((reg) => {
      // guarda no cache os arquivos já carregados nesta página (para abrir sem internet)
      const urls = performance
        .getEntriesByType("resource")
        .map((e) => e.name)
        .filter((u) => u.startsWith(location.origin) && u.includes("/_next/static/"));
      reg.active?.postMessage({ tipo: "guardar", urls: [...urls, location.pathname] });
    })
    .catch(() => {});
}

export function Provedores({ children }: { children: ReactNode }) {
  useEffect(() => {
    registrarServiceWorker();
  }, []);
  return (
    <ProvedorAvisos>
      <ProvedorAuth>{children}</ProvedorAuth>
    </ProvedorAvisos>
  );
}
