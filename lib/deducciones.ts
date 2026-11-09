import type { Respuestas } from "./tipos";

export interface Deduccion {
  que: string;
  porque: string;
}

/**
 * Panel "Lo que vamos entendiendo" de /preguntas.
 * Tal cual el prototipo (docs/04-logica.md → Deducciones en vivo).
 */
export function deducciones(r: Respuestas): Deduccion[] {
  const d: Deduccion[] = [];
  if (r.pas === "6-7") d.push({ que: "Necesitas tercera fila.", porque: "Buscamos 7 asientos reales, no solo de emergencia." });
  if (r.pas === "5") d.push({ que: "Cinco cómodos.", porque: "Revisamos que atrás quepan tres sin apretarse." });
  if (r.usos.trocha) d.push({ que: "Altura al piso alta.", porque: "Y evitamos cajas que sufren en barro profundo." });
  if (r.usos.sierra) d.push({ que: "Fuerza en altura.", porque: "Un motor sin turbo pierde potencia sobre 3,000 m." });
  if (glpProbablementeConviene(r))
    d.push({ que: "El GLP probablemente te conviene.", porque: "Calculamos en cuánto tiempo recuperas la conversión." });
  if (r.noche === "seguido") d.push({ que: "Seguridad activa.", porque: "Priorizamos frenado automático y buenos faros." });
  if (r.carga.viaje && r.pas === "6-7")
    d.push({ que: "Maletero con la tercera fila en uso.", porque: "Con 7 a bordo, muchos autos casi no tienen maletero." });
  if (r.carga.bebe) d.push({ que: "Maletero ancho y puertas amplias.", porque: "Para el coche de bebé sin pelearte." });
  if (r.pres) d.push({ que: "Filtramos por costo mensual total.", porque: "No por el precio de lista del concesionario." });
  return d;
}

/** Misma condición que la deducción del GLP */
export function glpProbablementeConviene(r: Respuestas): boolean {
  return r.km === "mucho" || (r.km === "medio" && !!r.usos.carretera);
}
