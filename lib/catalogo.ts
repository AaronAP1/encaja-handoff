import { aModelo } from "./fichas/cargar";
import { FICHAS, PRECIOS } from "./fichas/indice";
import type { Modelo } from "./tipos";

/**
 * Catálogo tipado, armado desde data/modelos/*.json (ficha por versión) y data/precios.json.
 * Nada de precios, potencias ni alturas inventadas: null = placeholder visible.
 * Cómo cargar una ficha nueva: data/modelos/LEEME.md.
 */
export const CATALOGO: readonly Modelo[] = FICHAS.map((f) => aModelo(f, PRECIOS));

/** Texto que se ve cuando falta el porqué de una evaluación editorial */
export const PORQUE_POR_REDACTAR = "[Porqué por redactar con la ficha oficial]";

export function buscarModelo(slug: string): Modelo | undefined {
  return CATALOGO.find((m) => m.slug === slug);
}

function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

/** Encuentra un modelo a partir de lo que la persona escribió ("honda brv", "Rush", "honda-br-v") */
export function buscarPorTexto(texto: string): Modelo | undefined {
  const q = normalizar(texto);
  if (!q) return undefined;
  const exacto = CATALOGO.find((m) => normalizar(m.nombre) === q || normalizar(m.slug) === q);
  if (exacto || q.length < 3) return exacto;
  return CATALOGO.find(
    (m) => normalizar(m.nombre).includes(q) || q.includes(normalizar(m.nombre.replace(m.marca, ""))),
  );
}

export function aSlug(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// ── Formato de ficha (placeholders entre corchetes cuando falta el dato) ──

const TRACCION: Record<Modelo["traccion"], string> = {
  delantera: "Delantera",
  trasera: "Trasera",
  "4x4": "4x4",
  AWD: "AWD",
};

export function fichaTecnica(m: Modelo): { etiqueta: string; valor: string }[] {
  const filas = [
    { etiqueta: "Motor", valor: m.motor.descripcion ?? `${m.motor.litros} L` },
    { etiqueta: "Potencia", valor: m.motor.potenciaTexto ?? (m.motor.hp ? `${m.motor.hp} HP` : "[HP]") },
    { etiqueta: "Torque", valor: m.motor.torqueTexto ?? "[torque según ficha Perú]" },
    { etiqueta: "Transmisión", valor: m.transmision ?? "[según versión]" },
    { etiqueta: "Tracción", valor: TRACCION[m.traccion] },
    { etiqueta: "Altura al piso", valor: m.alturaPisoMm ? `${m.alturaPisoMm} mm` : "[mm según ficha Perú]" },
  ];
  // los veredictos se calculan con una versión: si se conoce su nombre, se dice cuál
  return m.version ? [{ etiqueta: "Versión evaluada", valor: m.version }, ...filas] : filas;
}

export function precioTexto(m: Modelo): string {
  return m.precioListaUSD ? `US$ ${m.precioListaUSD.toLocaleString("en-US")}` : "US$ [precio]";
}

export function potenciaCorta(m: Modelo): string {
  return m.motor.hp ? `${m.motor.hp} HP` : "[HP]";
}

/** "CVT", "MT o CVT" si las versiones cambian de caja, o "[según versión]" si no se conoce */
export function transmisionTexto(m: Modelo): string {
  const cajas = [...new Set(m.versiones.flatMap((v) => (v.transmision ? [v.transmision] : [])))];
  return cajas.length ? cajas.join(" o ") : "[según versión]";
}

export function traccionTexto(m: Modelo): string {
  return TRACCION[m.traccion];
}
