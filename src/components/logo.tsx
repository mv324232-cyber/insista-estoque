export function Emblema({ className = "size-9" }: { className?: string }) {
  // Espiga estilizada dentro de um selo — troque por sua logo (public/icons) se quiser.
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden>
      <rect width="64" height="64" rx="16" fill="var(--cor-primaria)" />
      <g fill="none" stroke="var(--cor-primaria-texto)" strokeWidth="3.2" strokeLinecap="round">
        <path d="M32 52V18" />
        <path d="M32 24c-6-1-9-5-9-9 5 0 9 3 9 9zM32 24c6-1 9-5 9-9-5 0-9 3-9 9z" />
        <path d="M32 34c-6-1-9-5-9-9 5 0 9 3 9 9zM32 34c6-1 9-5 9-9-5 0-9 3-9 9z" />
        <path d="M32 44c-6-1-9-5-9-9 5 0 9 3 9 9zM32 44c6-1 9-5 9-9-5 0-9 3-9 9z" />
      </g>
    </svg>
  );
}

export function Logo({ subtitulo }: { subtitulo?: string }) {
  return (
    <span className="flex items-center gap-2.5">
      <Emblema />
      <span className="leading-none">
        <span className="block font-marca text-2xl font-extrabold uppercase tracking-[0.12em]">Insista</span>
        {subtitulo && <span className="block text-[11px] font-semibold uppercase tracking-wider text-suave">{subtitulo}</span>}
      </span>
    </span>
  );
}
