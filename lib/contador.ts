import type { Respuestas } from "./tipos";

/**
 * Contador "Modelos que encajan contigo" del flujo de preguntas.
 *
 * Usa el catálogo FICTICIO de 16 entradas del prototipo (docs/04-logica.md), por eso la
 * tarjeta dice "catálogo de prueba". Reemplazar por `contarQueEncajan` (lib/reglas.ts)
 * cuando el catálogo real tenga 20–30 modelos (docs/05-pendientes-y-legal.md).
 */
export const USAR_CATALOGO_DE_PRUEBA = true;

/** [asientos, alto, glp, automatica, rangoPrecio] */
type EntradaPrueba = readonly [number, 0 | 1, 0 | 1, 0 | 1, 1 | 2 | 3 | 4];

export const CATALOGO_DE_PRUEBA: readonly EntradaPrueba[] = [
  [7, 1, 1, 1, 2], [7, 1, 1, 0, 2], [7, 0, 1, 1, 2], [7, 1, 0, 1, 3], [7, 1, 0, 1, 4], [5, 1, 1, 1, 2], [5, 0, 1, 1, 1], [5, 1, 1, 0, 1],
  [5, 0, 0, 1, 3], [5, 1, 0, 1, 3], [5, 0, 1, 0, 1], [7, 1, 1, 1, 3], [5, 1, 1, 1, 2], [5, 0, 1, 1, 2], [7, 0, 0, 1, 4], [5, 1, 0, 0, 2],
];

export function contarEnCatalogoDePrueba(r: Respuestas): number {
  return CATALOGO_DE_PRUEBA.filter(([asientos, alto, glp, auto, tier]) => {
    if (r.pas === "6-7" && asientos < 7) return false;
    if (r.usos.trocha && !alto) return false;
    if (r.km === "mucho" && !glp) return false;
    if (r.trafico === "mucho" && !auto) return false;
    if (r.pres && tier > Number(r.pres)) return false;
    return true;
  }).length;
}
