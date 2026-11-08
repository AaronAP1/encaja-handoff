import datos from "@/data/mercado.json";
import type { Mercado, ModeloMercado } from "./fichas/esquema";

/** Listado de modelos a la venta en Perú (data/mercado.json, validado en mercado.test.ts) */
export const MERCADO = datos as unknown as Mercado;

export type TipoMercado = ModeloMercado["tipo"];

/** Orden en que se muestran los filtros */
export const ORDEN_TIPOS: readonly TipoMercado[] = ["SUV", "Sedán", "Hatchback", "Minivan", "Pick-up", "Van", "Otro"];

export function totalModelos(m: Mercado = MERCADO): number {
  return m.marcas.reduce((s, marca) => s + marca.modelos.length, 0);
}

/** Texto sin tildes ni mayúsculas para buscar ("Sedan" encuentra "Sedán") */
export function normalizarBusqueda(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

/** Ancla estable para cada marca ("Omoda | Jaecoo" → "omoda-jaecoo") */
export function anclaMarca(marca: string): string {
  return normalizarBusqueda(marca)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
