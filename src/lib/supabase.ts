"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cliente: SupabaseClient | null = null;

/** Cliente Supabase do navegador (sessão guardada no aparelho). */
export function supabase(): SupabaseClient {
  if (!cliente) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const chave = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !chave) {
      throw new Error("Configure NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY.");
    }
    cliente = createClient(url, chave, {
      auth: { persistSession: true, autoRefreshToken: true, storageKey: "insista-auth" },
      realtime: { params: { eventsPerSecond: 5 } },
    });
  }
  return cliente;
}
