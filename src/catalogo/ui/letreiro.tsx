import { Espiga } from "./icones";

const FRASES = [
  "Proteção UV50+",
  "Tecido dry respirável",
  "Estampa total sublimada",
  "Não desbota",
  "Secagem rápida",
  "Envio para todo o Brasil",
  "Feita para quem vive o agro",
];

/** Faixa vermelha inclinada com benefícios rolando. */
export function Letreiro() {
  const itens = [...FRASES, ...FRASES];
  return (
    <div className="relative z-10 -my-6 -rotate-2 overflow-hidden border-y-2 border-black/30 bg-l-vermelho py-4 shadow-[0_20px_40px_-20px_rgb(208_20_47/0.8)]" aria-label="Benefícios">
      <div className="letreiro flex w-max items-center gap-8">
        {itens.map((f, i) => (
          <span key={i} className="flex items-center gap-8 font-display text-2xl uppercase tracking-wider text-white sm:text-3xl" aria-hidden={i >= FRASES.length}>
            {f}
            <Espiga className="size-6 text-white/70" />
          </span>
        ))}
      </div>
    </div>
  );
}
