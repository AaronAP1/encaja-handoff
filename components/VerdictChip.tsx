import type { Nivel } from "@/lib/tipos";
import { SignalIcon } from "./SignalIcon";

const FONDO: Record<Nivel, string> = {
  Bien: "bg-bien",
  Justo: "bg-justo",
  Difícil: "bg-dificil",
};

/** Texto para lo que aún no se puede evaluar (falta un dato de la ficha) */
export const TEXTO_SIN_DATO = "[por evaluar]";

interface ChipProps {
  nivel: Nivel | null;
  /** Si se pasa, el chip dice "Trocha: Bien" */
  uso?: string;
  className?: string;
}

/** Chip de veredicto: forma + color + texto. Con nivel null muestra el placeholder sin forma. */
export function VerdictChip({ nivel, uso, className = "" }: ChipProps) {
  if (!nivel) {
    return (
      <span
        className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border-2 border-dashed border-borde px-2.5 py-1 text-xs font-semibold text-texto-2 ${className}`}
      >
        {uso ? `${uso}: ` : ""}
        {TEXTO_SIN_DATO}
      </span>
    );
  }
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold text-white ${FONDO[nivel]} ${className}`}
    >
      <SignalIcon nivel={nivel} size={14} tono="blanco" />
      {uso ? `${uso}: ` : ""}
      {nivel}
    </span>
  );
}

interface BloqueProps {
  nivel: Nivel | null;
  uso: string;
}

/** Bloque de veredicto de las tarjetas de resultados: uso arriba, nivel abajo */
export function VerdictBlock({ nivel, uso }: BloqueProps) {
  if (!nivel) {
    return (
      <li className="flex flex-col gap-0.5 rounded-boton border-2 border-dashed border-borde px-3 py-2 text-asfalto">
        <span className="text-xs text-texto-2">{uso}</span>
        <span className="text-sm font-semibold text-texto-2">{TEXTO_SIN_DATO}</span>
      </li>
    );
  }
  return (
    <li className={`flex flex-col gap-0.5 rounded-boton px-3 py-2.5 text-white ${FONDO[nivel]}`}>
      <span className="text-xs opacity-90">{uso}</span>
      <span className="flex items-center gap-1.5 text-sm font-semibold">
        <SignalIcon nivel={nivel} size={14} tono="blanco" />
        {nivel}
      </span>
    </li>
  );
}

/** Leyenda Bien / Justo / Difícil con sus formas */
export function LeyendaVeredictos({ className = "" }: { className?: string }) {
  return (
    <ul className={`m-0 flex list-none flex-wrap items-center gap-3.5 p-0 text-[13px] text-texto-2 ${className}`}>
      {(["Bien", "Justo", "Difícil"] as const).map((n) => (
        <li key={n} className="flex items-center gap-1.5">
          <SignalIcon nivel={n} size={14} />
          {n}
        </li>
      ))}
    </ul>
  );
}
