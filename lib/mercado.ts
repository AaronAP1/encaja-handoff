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

/**
 * Marcas que se venden en Perú y aún no están en el listado: su sitio rechaza la consulta
 * automática o tiene el certificado vencido (ver scraping/LEEME.md). Un test verifica que
 * ninguna esté ya en data/mercado.json, para que la nota de /modelos no quede desactualizada.
 */
export const MARCAS_PENDIENTES: readonly string[] = ["Ford", "MG", "Jeep", "Volkswagen", "Peugeot", "Mercedes-Benz", "Audi", "Volvo"];

/** "A, B y C" (o "A, B ni C") */
export function enumerar(xs: readonly string[], conjuncion: "y" | "ni" = "y"): string {
  if (xs.length <= 1) return xs.join("");
  return `${xs.slice(0, -1).join(", ")} ${conjuncion} ${xs.at(-1)}`;
}
