import { siluetaDe } from "@/lib/hero";
import type { Carroceria } from "@/lib/tipos";

interface Props {
  tipo: Carroceria | "SUV" | "Sedán" | "Pick-up" | "Van" | "Hatchback";
  /** Color de la carrocería */
  color?: string;
  className?: string;
  etiqueta?: string;
}

/** Silueta lateral (data/siluetas-autos.json). Se usa mientras no haya fotos con licencia. */
export function CarSilhouette({ tipo, color = "#C9CED6", className, etiqueta }: Props) {
  const s = siluetaDe(tipo === "Crossover" ? "SUV" : tipo);
  return (
    <svg
      viewBox="70 60 620 220"
      className={className}
      {...(etiqueta ? { role: "img", "aria-label": etiqueta } : { "aria-hidden": true })}
    >
      <path d={s.svg.carroceria} fill={color} stroke="#2A2D33" strokeWidth={2.5} />
      <path d={s.svg.ventanas} fill="#2F3540" stroke="#2A2D33" strokeWidth={2} />
      <path d={s.svg.lineas} fill="none" stroke="#2A2D33" strokeOpacity={0.45} strokeWidth={2} />
      {s.svg.ruedas.map((r) => (
        <g key={r.cx}>
          <circle cx={r.cx} cy={r.cy} r={r.r} fill="#1C1E22" />
          <circle cx={r.cx} cy={r.cy} r={19} fill="#B8BDC4" />
        </g>
      ))}
    </svg>
  );
}

/** Espacio de foto (placeholder #E4E9F1) con la silueta del tipo de auto */
export function FotoModelo({
  tipo,
  className = "",
  leyenda,
}: {
  tipo: Carroceria;
  className?: string;
  /** "Foto oficial del modelo" en las vistas grandes */
  leyenda?: string;
}) {
  return (
    <div className={`flex flex-col items-center justify-center gap-2 bg-placeholder p-3 ${className}`}>
      <CarSilhouette tipo={tipo} className="h-auto w-[78%] max-w-[360px]" />
      {leyenda ? <span className="text-[13px] text-texto-2">{leyenda}</span> : null}
    </div>
  );
}
