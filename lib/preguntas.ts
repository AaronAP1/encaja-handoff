import preguntasJson from "@/data/preguntas-flujo.json";
import { estaRespondida } from "./respuestas";
import type { ClavePregunta, Respuestas } from "./tipos";

export interface OpcionPregunta {
  v: string;
  label: string;
  sub: string;
}

export interface Pregunta {
  key: ClavePregunta;
  multi: boolean;
  seccion: string;
  titulo: string;
  ayuda: string;
  opciones: OpcionPregunta[];
}

/** Las preguntas tal cual data/preguntas-flujo.json (validadas en preguntas.test.ts) */
export const PREGUNTAS = preguntasJson as Pregunta[];

export const TOTAL_PREGUNTAS = PREGUNTAS.length;

/** Índice de la primera pregunta sin responder, o la última si todas están respondidas */
export function primeraSinResponder(r: Respuestas): number {
  const i = PREGUNTAS.findIndex((p) => !estaRespondida(r, p.key));
  return i === -1 ? PREGUNTAS.length - 1 : i;
}

export function cuantasRespondidas(r: Respuestas): number {
  return PREGUNTAS.filter((p) => estaRespondida(r, p.key)).length;
}

export function etiquetaOpcion(clave: ClavePregunta, valor: string): string | null {
  return PREGUNTAS.find((p) => p.key === clave)?.opciones.find((o) => o.v === valor)?.label ?? null;
}
