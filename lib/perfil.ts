import { VALORES, type Pasajeros, type Respuestas, type Uso } from "./tipos";

export const ETIQUETA_PASAJEROS: Record<Pasajeros, string> = {
  "1-2": "1–2",
  "3-4": "3–4",
  "5": "5",
  "6-7": "6–7",
};

export const ETIQUETA_USO: Record<Uso, string> = {
  ciudad: "Ciudad",
  carretera: "Carretera",
  trocha: "Trocha",
  sierra: "Sierra",
};

/** Resumen corto del perfil: ["6–7 pasajeros", "Ciudad", "Carretera", "Trocha", "GLP"] */
export function resumenPerfil(r: Respuestas): string[] {
  const partes: string[] = [];
  if (r.pas) partes.push(`${ETIQUETA_PASAJEROS[r.pas]} pasajeros`);
  for (const u of VALORES.usos) if (r.usos[u]) partes.push(ETIQUETA_USO[u]);
  if (r.comb === "glp") partes.push("GLP");
  if (r.comb === "gasolina") partes.push("Gasolina");
  return partes;
}
