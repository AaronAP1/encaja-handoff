import situacionesJson from "@/data/situaciones.json";
import { respuestasVacias } from "./respuestas";
import type { Respuestas } from "./tipos";

export interface Situacion {
  slug: SlugSituacion;
  nombre: string;
  titulo: string;
  intro: string;
  tipos: string[];
  yaSabemos: string;
  faltan: number;
  importa: { n: string; titulo: string; texto: string }[];
  errores: string[];
}

export const SLUGS_SITUACION = ["mi-primer-auto", "familia-grande", "viajo-a-provincia", "lo-uso-para-trabajar"] as const;
export type SlugSituacion = (typeof SLUGS_SITUACION)[number];

/** data/situaciones.json en el mismo orden que los slugs de docs/03 */
export const SITUACIONES: Situacion[] = situacionesJson.map((s, i) => {
  const slug = SLUGS_SITUACION[i];
  if (!slug) throw new Error("data/situaciones.json tiene más situaciones que slugs");
  return { ...s, slug };
});

export function buscarSituacion(slug: string): Situacion | undefined {
  return SITUACIONES.find((s) => s.slug === slug);
}

/**
 * Respuestas que cada situación deja pre-llenadas (2 de 7 → "Te faltan 5 preguntas").
 * POR VALIDAR con el dueño del producto: el paquete no dice qué respuestas se infieren.
 * La persona puede cambiarlas volviendo atrás en el flujo.
 */
const PRELLENADO: Record<SlugSituacion, (r: Respuestas) => Respuestas> = {
  "mi-primer-auto": (r) => ({ ...r, pas: "1-2", usos: { ciudad: true } }),
  "familia-grande": (r) => ({ ...r, pas: "6-7", carga: { viaje: true } }),
  "viajo-a-provincia": (r) => ({ ...r, usos: { carretera: true }, noche: "aveces" }),
  "lo-uso-para-trabajar": (r) => ({ ...r, km: "mucho", carga: { trabajo: true } }),
};

export function respuestasDeSituacion(slug: SlugSituacion): Respuestas {
  return PRELLENADO[slug](respuestasVacias());
}
