import Link from "next/link";
import type { ComponentProps } from "react";

export type Variante = "primario" | "secundario" | "letrero" | "claro";
export type Tamano = "md" | "lg" | "xl";

const BASE =
  "inline-flex items-center justify-center gap-2.5 text-center font-extrabold no-underline transition-colors disabled:cursor-not-allowed";

const VARIANTES: Record<Variante, string> = {
  // botón azul principal
  primario:
    "bg-azul text-white hover:bg-azul-oscuro hover:text-white disabled:bg-borde disabled:text-texto-2 aria-disabled:bg-borde aria-disabled:text-texto-2",
  // blanco con borde azul
  secundario: "border-2 border-azul bg-white text-azul-oscuro hover:bg-placeholder hover:text-azul-oscuro",
  // HighwaySignButton: fondo asfalto, borde blanco 3 px y anillo exterior asfalto 3 px
  letrero:
    "border-[3px] border-white bg-asfalto text-white shadow-[0_0_0_3px_#2A2D33] hover:bg-[#1f2126] hover:text-white",
  // blanco sobre fondo oscuro (nav de la portada)
  claro: "bg-white text-asfalto hover:bg-placeholder hover:text-asfalto",
};

const TAMANOS: Record<Tamano, string> = {
  md: "min-h-11 rounded-letrero px-4 text-sm",
  lg: "min-h-[54px] rounded-boton px-6 text-base",
  xl: "min-h-[60px] rounded-boton px-[30px] text-xl",
};

export function clasesBoton(variante: Variante = "primario", tamano: Tamano = "lg", extra = "") {
  return `${BASE} ${VARIANTES[variante]} ${TAMANOS[tamano]} ${extra}`;
}

type BotonProps = ComponentProps<"button"> & { variante?: Variante; tamano?: Tamano };

export function Button({ variante, tamano, className, type = "button", ...props }: BotonProps) {
  return <button type={type} className={clasesBoton(variante, tamano, className)} {...props} />;
}

type EnlaceProps = ComponentProps<typeof Link> & { variante?: Variante; tamano?: Tamano };

export function ButtonLink({ variante, tamano, className, ...props }: EnlaceProps) {
  return <Link className={clasesBoton(variante, tamano, className)} {...props} />;
}
