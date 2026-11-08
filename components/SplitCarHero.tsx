"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useMovimientoReducido } from "@/lib/cliente";
import { autoHero, FUNDIDO_MS, ROTACION_HERO_MS, SILUETAS } from "@/lib/hero";

const AUTOS = SILUETAS.map(autoHero);

/**
 * Titular partido + auto partido en la línea central: a la izquierda como en el catálogo,
 * a la derecha en planos con 4 veredictos. Rota cada 5 s (fundido de 300 ms) y se detiene
 * al elegir un tipo. Con prefers-reduced-motion no rota.
 */
export function SplitCarHero() {
  const [i, setI] = useState(0);
  const [fundido, setFundido] = useState(false);
  const [detenido, setDetenido] = useState(false);
  const reducido = useMovimientoReducido();
  const t2 = useRef<ReturnType<typeof setTimeout> | null>(null);
  const id = useId().replace(/:/g, "");

  function ir(n: number, conFundido: boolean) {
    if (t2.current) clearTimeout(t2.current);
    if (!conFundido) {
      setI(n);
      setFundido(false);
      return;
    }
    setFundido(true);
    t2.current = setTimeout(() => {
      setI(n);
      setFundido(false);
    }, FUNDIDO_MS);
  }

  useEffect(() => {
    if (reducido || detenido) return;
    const timer = setInterval(() => {
      if (t2.current) clearTimeout(t2.current);
      setFundido(true);
      t2.current = setTimeout(() => {
        setI((x) => (x + 1) % AUTOS.length);
        setFundido(false);
      }, FUNDIDO_MS);
    }, ROTACION_HERO_MS);
    return () => clearInterval(timer);
  }, [reducido, detenido]);

  useEffect(() => () => {
    if (t2.current) clearTimeout(t2.current);
  }, []);

  const auto = AUTOS[i] ?? AUTOS[0]!;
  const { silueta: s, llamadas } = auto;

  return (
    <>
      <div className="grid w-full max-w-[1200px] grid-cols-2">
        <div className="flex flex-col items-end gap-2 pr-3 text-right sm:pr-7">
          <span className="text-sm text-[#C9CCD2] sm:text-base">Pantalla grande, aros 18&apos;&apos; y buen diseño</span>
          <h1 className="m-0 text-[clamp(34px,6vw,86px)] font-light leading-[0.95] tracking-display text-white">
            Que te
            <br />
            guste.
          </h1>
        </div>
        <div className="flex flex-col items-start gap-2 pl-3 sm:pl-7">
          <span className="text-sm text-[#E3EBFA] sm:text-base">Para tu uso: {s.perfilDeUso}</span>
          <p className="m-0 text-[clamp(34px,6vw,86px)] font-black leading-[0.95] tracking-display text-white">
            Y que te
            <br />
            sirva.
          </p>
        </div>
      </div>

      <div
        className="w-full max-w-[820px] transition-opacity ease-in-out"
        style={{ opacity: fundido ? 0 : 1, transitionDuration: `${FUNDIDO_MS}ms` }}
      >
        <svg viewBox={s.svg.viewBox} className="block h-auto w-full" role="img" aria-label={auto.aria}>
          <defs>
            <clipPath id={`${id}-izq`}>
              <rect x="0" y="0" width="380" height="300" />
            </clipPath>
            <clipPath id={`${id}-der`}>
              <rect x="380" y="0" width="380" height="300" />
            </clipPath>
          </defs>
          <g clipPath={`url(#${id}-izq)`}>
            <path d="M60,262 L700,262" stroke="#4A4F58" strokeWidth={3} strokeLinecap="round" />
            <path d={s.svg.carroceria} fill="#565C66" />
            <path d={s.svg.ventanas} fill="#8A909A" />
            <path d={s.svg.lineas} fill="none" stroke="#6E747E" strokeWidth={2} />
            <circle cx="200" cy="215" r="38" fill="#16181B" />
            <circle cx="200" cy="215" r="20" fill="#B8BDC4" />
            <circle cx="200" cy="215" r="6" fill="#565C66" />
          </g>
          <g clipPath={`url(#${id}-der)`} fill="none" stroke="#FFFFFF" strokeWidth={2.2} strokeDasharray="7 5">
            <path d="M60,262 L700,262" strokeWidth={3} />
            <path d={s.svg.carroceria} />
            <path d={s.svg.ventanas} />
            <path d={s.svg.lineas} strokeOpacity={0.55} />
            <circle cx="560" cy="215" r="38" />
            <circle cx="560" cy="215" r="20" />
          </g>
          <g stroke="#FFFFFF" strokeWidth={1.6} fill="#FFFFFF" fontFamily="var(--font-overpass), sans-serif" fontSize={14} fontWeight={600}>
            {llamadas.map((l) => (
              <g key={l.guia}>
                <circle cx={l.punto.cx} cy={l.punto.cy} r={4.5} stroke="none" />
                <path d={l.guia} fill="none" />
                <text x="728" y={l.textoY} textAnchor="end" stroke="none">
                  {l.texto}
                </text>
                <path d={l.senal.d} fill={l.senal.fill} stroke="#FFFFFF" strokeWidth={1.5} />
              </g>
            ))}
          </g>
        </svg>
      </div>

      <div role="group" aria-label="Tipo de auto" className="flex flex-wrap justify-center gap-2">
        {AUTOS.map((a, n) => (
          <button
            key={a.silueta.tipo}
            type="button"
            aria-pressed={n === i}
            onClick={() => {
              setDetenido(true);
              ir(n, !reducido);
            }}
            className={`min-h-11 rounded-letrero border-2 px-[18px] text-[15px] font-extrabold ${
              n === i ? "border-white bg-asfalto text-white shadow-[0_0_0_2px_#2A2D33]" : "border-asfalto bg-white text-asfalto"
            }`}
          >
            {a.silueta.tipo}
          </button>
        ))}
      </div>
    </>
  );
}
