import { FORMA_NIVEL, senal } from "@/lib/senal";
import type { Nivel } from "@/lib/tipos";

interface Props {
  nivel: Nivel;
  /** Lado del ícono en px */
  size?: number;
  /** "color": forma rellena del color del nivel. "blanco": forma blanca (para chips sólidos) */
  tono?: "color" | "blanco";
  /** Si se pasa, el ícono se anuncia; si no, es decorativo (el texto al lado ya dice el nivel) */
  etiqueta?: string;
  className?: string;
}

/**
 * Señal de veredicto: Bien = círculo, Justo = rombo, Difícil = octágono.
 * Siempre va acompañada de texto; nunca se usa solo el color.
 */
export function SignalIcon({ nivel, size = 26, tono = "color", etiqueta, className }: Props) {
  const { d, fill } = senal(nivel, 13, 13, 9);
  const relleno = tono === "blanco" ? "#FFFFFF" : fill;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 26 26"
      className={className}
      style={{ flexShrink: 0 }}
      {...(etiqueta ? { role: "img", "aria-label": etiqueta } : { "aria-hidden": true })}
      data-forma={FORMA_NIVEL[nivel]}
    >
      <path d={d} fill={relleno} stroke={relleno} strokeWidth={2} />
    </svg>
  );
}
