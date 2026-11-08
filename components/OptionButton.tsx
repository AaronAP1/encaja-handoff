import type { ComponentProps } from "react";

type Props = Omit<ComponentProps<"button">, "children"> & {
  seleccionado: boolean;
  titulo: string;
  subtitulo?: string;
  /** "grande": opciones del flujo; "lista": panel de perfil; "pill": botón corto */
  tamano?: "grande" | "lista" | "pill";
};

const TAMANOS = {
  grande: "min-h-[76px] items-start gap-1 rounded-2xl px-[18px] py-4 text-left",
  lista: "min-h-14 items-start gap-0.5 rounded-xl px-3.5 py-2.5 text-left",
  pill: "min-h-12 items-center justify-center rounded-xl px-3 text-center",
};

const TEXTO_TITULO = {
  grande: "text-base font-semibold",
  lista: "text-sm font-semibold",
  pill: "text-[15px] font-semibold",
};

const TEXTO_SUB = {
  grande: "text-[13px] leading-snug text-texto-2",
  lista: "text-xs text-texto-2",
  pill: "text-xs text-texto-2",
};

/**
 * Botón de opción con título y subtítulo. Seleccionado: borde azul 2 px + halo.
 * Usa aria-pressed (es un botón de alternar, no un radio).
 */
export function OptionButton({ seleccionado, titulo, subtitulo, tamano = "grande", className = "", type = "button", ...props }: Props) {
  return (
    <button
      type={type}
      aria-pressed={seleccionado}
      className={`flex flex-col border-2 bg-white text-asfalto transition-shadow ${TAMANOS[tamano]} ${
        seleccionado ? "border-azul shadow-halo" : "border-borde hover:border-[#9AA0A9]"
      } ${className}`}
      {...props}
    >
      <span className={TEXTO_TITULO[tamano]}>{titulo}</span>
      {subtitulo ? <span className={TEXTO_SUB[tamano]}>{subtitulo}</span> : null}
    </button>
  );
}
