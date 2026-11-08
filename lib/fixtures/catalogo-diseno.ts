import { aModelo } from "../fichas/cargar";
import type { FichaModelo } from "../fichas/esquema";
import type { Modelo } from "../tipos";
import fichas from "./fichas-diseno.json";

/**
 * Copia FIJA del catálogo tal como vino en el paquete de diseño (solo para tests).
 * Los tests de conformidad con los prototipos usan esto y no el catálogo vivo,
 * para que cargar fichas reales en data/modelos/ no los rompa.
 */
export const CATALOGO_DISENO: readonly Modelo[] = (fichas as unknown as FichaModelo[]).map((f) => aModelo(f, []));

export function modeloDiseno(slug: "toyota-rush" | "honda-br-v" | "mitsubishi-xpander-cross"): Modelo {
  const m = CATALOGO_DISENO.find((x) => x.slug === slug);
  if (!m) throw new Error(slug);
  return m;
}
