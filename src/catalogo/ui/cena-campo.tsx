/**
 * Cena de campo animada (substitui um vídeo de fundo): pôr do sol, morros,
 * lavoura em fileiras, trator puxando grade com poeira, colheitadeira ao longe,
 * pássaros e trigo balançando em primeiro plano. Só SVG + CSS (leve e nítido).
 */

// gerador pseudoaleatório fixo (mesmo desenho no servidor e no navegador)
function aleatorio(semente: number) {
  let s = semente;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

const r = aleatorio(42);
const ESPIGAS = Array.from({ length: 64 }, (_, i) => ({
  x: -20 + i * 26.5 + r() * 18,
  altura: 0.75 + r() * 0.55,
  inclina: -6 + r() * 12,
  duracao: 3.2 + r() * 2.6,
  atraso: -r() * 5,
  tom: r() > 0.5 ? "#e0a54c" : r() > 0.45 ? "#c4893a" : "#9a652b",
}));
const ESPIGAS_FUNDO = Array.from({ length: 48 }, (_, i) => ({
  x: -10 + i * 34 + r() * 20,
  altura: 0.45 + r() * 0.3,
  duracao: 3.6 + r() * 2.4,
  atraso: -r() * 5,
}));
const POEIRA = Array.from({ length: 9 }, (_, i) => ({ atraso: i * 0.42, desvio: r() * 14 - 7, tamanho: 9 + r() * 12 }));

/** trator visto de lado, virado para a direita; base nas rodas em y=0 */
function Trator() {
  return (
    <g>
      {/* grade (implemento) puxada atrás */}
      <g fill="#1a100a">
        <rect x="-118" y="-22" width="92" height="7" rx="3" />
        <rect x="-30" y="-24" width="34" height="5" rx="2" />
        {[-110, -88, -66, -44].map((x) => (
          <ellipse key={x} cx={x} cy="-8" rx="8" ry="10" />
        ))}
      </g>
      <g fill="#140c07">
        {/* cabine */}
        <path d="M18 -62 L26 -138 L98 -138 L104 -62 Z" />
        <path d="M30 -128 L36 -76 L92 -76 L88 -128 Z" fill="#f2b45a" opacity=".45" />
        <rect x="20" y="-146" width="88" height="10" rx="3" />
        {/* capô */}
        <path d="M96 -88 L196 -84 Q212 -82 212 -66 L212 -46 L96 -46 Z" />
        <rect x="150" y="-118" width="7" height="34" rx="2" />
        <rect x="146" y="-122" width="15" height="6" rx="2" />
        {/* paralama */}
        <path d="M0 -60 Q55 -122 112 -60 Z" />
      </g>
      {/* roda traseira */}
      <g className="cena-roda" style={{ animationDuration: "1.6s" }}>
        <circle cx="55" cy="-50" r="50" fill="#120a05" />
        <circle cx="55" cy="-50" r="50" fill="none" stroke="#2c1a0e" strokeWidth="9" strokeDasharray="7 6" />
        <circle cx="55" cy="-50" r="22" fill="#2c1a0e" />
        <path d="M55 -72 V-28 M33 -50 H77" stroke="#140c07" strokeWidth="5" />
      </g>
      {/* roda dianteira */}
      <g className="cena-roda" style={{ animationDuration: "0.9s" }}>
        <circle cx="182" cy="-27" r="27" fill="#120a05" />
        <circle cx="182" cy="-27" r="27" fill="none" stroke="#2c1a0e" strokeWidth="6" strokeDasharray="5 5" />
        <circle cx="182" cy="-27" r="11" fill="#2c1a0e" />
        <path d="M182 -38 V-16 M171 -27 H193" stroke="#140c07" strokeWidth="3.5" />
      </g>
      {/* poeira levantada */}
      {POEIRA.map((p, i) => (
        <circle
          key={i}
          className="cena-poeira"
          cx={-120 - p.desvio}
          cy={-10}
          r={p.tamanho}
          fill="#d9a35c"
          style={{ animationDelay: `${p.atraso}s` }}
        />
      ))}
    </g>
  );
}

/** colheitadeira (bem pequena, ao longe), virada para a esquerda */
function Colheitadeira() {
  return (
    <g fill="#2a170c">
      <rect x="-150" y="-26" width="70" height="14" rx="3" />
      <rect x="-86" y="-60" width="110" height="46" rx="6" />
      <rect x="-70" y="-96" width="44" height="38" rx="4" />
      <rect x="-20" y="-84" width="48" height="26" rx="3" />
      <rect x="20" y="-104" width="70" height="7" rx="3" transform="rotate(-12 20 -104)" />
      <circle cx="-56" cy="-14" r="20" />
      <circle cx="12" cy="-12" r="13" />
    </g>
  );
}

function Passaro({ x, y, escala, duracao, atraso }: { x: number; y: number; escala: number; duracao: number; atraso: number }) {
  return (
    <g className="cena-voo" style={{ animationDuration: `${duracao}s`, animationDelay: `${atraso}s` }}>
      <g transform={`translate(${x} ${y}) scale(${escala})`}>
        <path className="cena-asa" d="M-14 0 Q-7 -8 0 0 Q7 -8 14 0" fill="none" stroke="#2a170c" strokeWidth="2.6" strokeLinecap="round" />
      </g>
    </g>
  );
}

export function CenaCampo() {
  return (
    <div aria-hidden className="cena-campo absolute inset-0 overflow-hidden">
      <svg viewBox="0 0 1600 900" preserveAspectRatio="xMidYMax slice" className="absolute inset-0 size-full">
        <defs>
          <linearGradient id="ceu" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="#3b1c10" />
            <stop offset=".3" stopColor="#9a4119" />
            <stop offset=".52" stopColor="#e2832f" />
            <stop offset=".66" stopColor="#ffc76a" />
          </linearGradient>
          <radialGradient id="brilho" cx="860" cy="585" r="620" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#ffe3a1" stopOpacity=".95" />
            <stop offset=".25" stopColor="#ffb85c" stopOpacity=".55" />
            <stop offset="1" stopColor="#ff9a40" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="lavoura" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="#a8682a" />
            <stop offset=".45" stopColor="#6b4019" />
            <stop offset="1" stopColor="#2a180b" />
          </linearGradient>
          <linearGradient id="morroLonge" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="#a5582c" />
            <stop offset="1" stopColor="#6e3a1c" />
          </linearGradient>
          <filter id="nuvem" x="-20%" y="-50%" width="140%" height="200%">
            <feGaussianBlur stdDeviation="14" />
          </filter>
          <symbol id="espiga" viewBox="-20 -200 40 200" overflow="visible">
            <path d="M0 0 Q3 -80 0 -150" fill="none" stroke="currentColor" strokeWidth="3" />
            <path d="M0 -60 Q-14 -80 -16 -104" fill="none" stroke="currentColor" strokeWidth="2.4" />
            <g fill="currentColor">
              {[0, 1, 2, 3, 4, 5, 6].map((k) => (
                <g key={k}>
                  <ellipse cx="-4.5" cy={-152 - k * 7} rx="4.2" ry="6.5" transform={`rotate(-22 -4.5 ${-152 - k * 7})`} />
                  <ellipse cx="4.5" cy={-155 - k * 7} rx="4.2" ry="6.5" transform={`rotate(22 4.5 ${-155 - k * 7})`} />
                </g>
              ))}
              <ellipse cx="0" cy="-204" rx="3.6" ry="6" />
            </g>
            <g stroke="currentColor" strokeWidth="1.1" opacity=".8">
              {[0, 1, 2, 3, 4, 5].map((k) => (
                <g key={k}>
                  <line x1="-7" y1={-156 - k * 7} x2="-19" y2={-172 - k * 9} />
                  <line x1="7" y1={-159 - k * 7} x2="19" y2={-175 - k * 9} />
                </g>
              ))}
            </g>
          </symbol>
        </defs>

        {/* céu e sol */}
        <rect width="1600" height="900" fill="url(#ceu)" />
        <rect width="1600" height="900" fill="url(#brilho)" />
        <circle className="cena-sol" cx="860" cy="590" r="92" fill="#ffe3a3" />
        <g className="cena-nuvens" filter="url(#nuvem)" opacity=".55">
          <ellipse cx="300" cy="230" rx="210" ry="34" fill="#f3a35d" />
          <ellipse cx="820" cy="170" rx="260" ry="30" fill="#d9773f" />
          <ellipse cx="1350" cy="300" rx="230" ry="26" fill="#f6b46a" />
          <ellipse cx="1900" cy="210" rx="240" ry="30" fill="#e58a4a" />
        </g>
        <Passaro x={260} y={260} escala={1} duracao={26} atraso={-4} />
        <Passaro x={300} y={240} escala={0.8} duracao={26} atraso={-4.6} />
        <Passaro x={230} y={285} escala={0.7} duracao={26} atraso={-5.1} />

        {/* morros ao longe */}
        <path d="M0 585 Q180 520 380 560 T760 548 T1150 565 T1600 540 V900 H0 Z" fill="url(#morroLonge)" />
        <g className="cena-colheitadeira">
          <g transform="translate(0 575) scale(.32)">
            <Colheitadeira />
          </g>
        </g>
        <path d="M0 612 Q260 572 520 600 T1040 596 T1600 588 V900 H0 Z" fill="#5e3318" />

        {/* lavoura em fileiras */}
        <path d="M0 640 Q400 610 800 626 T1600 618 V900 H0 Z" fill="url(#lavoura)" />
        <g stroke="#e0a457" strokeOpacity=".22" fill="none">
          {Array.from({ length: 22 }, (_, i) => {
            const base = -900 + i * 155;
            return <path key={i} d={`M${800 + (i - 11) * 18} 630 Q${(800 + base) / 2 + (i - 11) * 12} 760 ${base} 920`} strokeWidth={1 + i * 0.12} />;
          })}
        </g>

        {/* trator passando */}
        <g className="cena-trator">
          <g transform="translate(0 712) scale(.85)">
            <Trator />
          </g>
        </g>

        {/* trigo ao fundo (menor, mais claro) */}
        {ESPIGAS_FUNDO.map((e, i) => (
          <g key={`f${i}`} transform={`translate(${e.x} 815) scale(${e.altura})`}>
            <g className="cena-balanca" style={{ animationDuration: `${e.duracao}s`, animationDelay: `${e.atraso}s`, color: "#7a4a20" }}>
              <use href="#espiga" x="-20" y="-200" width="40" height="200" />
            </g>
          </g>
        ))}
        <rect y="820" width="1600" height="80" fill="#1b0f07" opacity=".45" />
        {/* trigo em primeiro plano */}
        {ESPIGAS.map((e, i) => (
          <g key={i} transform={`translate(${e.x} 912) rotate(${e.inclina}) scale(${e.altura * 1.35})`}>
            <g className="cena-balanca" style={{ animationDuration: `${e.duracao}s`, animationDelay: `${e.atraso}s`, color: e.tom }}>
              <use href="#espiga" x="-20" y="-200" width="40" height="200" />
            </g>
          </g>
        ))}
      </svg>
      {/* partículas de palha no ar */}
      <div className="cena-particulas absolute inset-0" />
    </div>
  );
}
