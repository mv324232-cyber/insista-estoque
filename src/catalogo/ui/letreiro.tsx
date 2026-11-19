import { Wheat } from "lucide-react";

const FRASES = [
  "Proteção UV50+",
  "Tecido dry respirável",
  "Estampa total sublimada",
  "Não desbota",
  "Secagem rápida",
  "Envio para todo o Brasil",
  "Feita pra quem vive o agro",
];

/** Faixa de couro costurado com os benefícios rolando. */
export function Letreiro() {
  const itens = [...FRASES, ...FRASES];
  return (
    <div className="couro costura relative z-10 overflow-hidden py-5 shadow-[0_14px_30px_-14px_rgb(60_30_10/0.7)]" aria-label="Benefícios">
      <div className="letreiro flex w-max items-center gap-10">
        {itens.map((f, i) => (
          <span key={i} className="flex items-center gap-10 whitespace-nowrap font-display text-lg uppercase text-[#f8e7c4] sm:text-xl" aria-hidden={i >= FRASES.length}>
            {f}
            <Wheat className="size-5 text-[#f4c56a]" />
          </span>
        ))}
      </div>
    </div>
  );
}
