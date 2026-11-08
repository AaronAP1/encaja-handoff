import detalleBrv from "@/data/detalle-honda-brv.json";
import modelosEjemplo from "@/data/modelos-ejemplo.json";
import type { Modelo, Nivel } from "./tipos";

/**
 * Catálogo tipado. Solo datos que vienen del paquete de diseño:
 * nada de precios, potencias ni alturas inventadas (null = placeholder visible).
 * Completar desde fichas oficiales vendidas en Perú (docs/05-pendientes-y-legal.md).
 */

/** Texto visible cuando falta el porqué de una evaluación editorial */
export const PORQUE_POR_REDACTAR = "[Porqué por redactar con la ficha oficial]";

function ejemplo(id: "rush" | "brv" | "xpander") {
  const m = modelosEjemplo.find((x) => x.id === id);
  if (!m) throw new Error(`Falta ${id} en data/modelos-ejemplo.json`);
  return m;
}

const rush = ejemplo("rush");
const brv = ejemplo("brv");
const xpander = ejemplo("xpander");

export const CATALOGO: readonly Modelo[] = [
  {
    slug: "toyota-rush",
    marca: "Toyota",
    nombre: rush.nombre,
    articulo: "el",
    version: null,
    carroceria: "SUV",
    precioListaUSD: null,
    asientos: 7,
    terceraFila: null,
    motor: { litros: 1.5, descripcion: null, hp: null, potenciaTexto: null, torqueTexto: null, turbo: false, inyeccion: null },
    transmision: null,
    traccion: "trasera",
    alturaPisoMm: null,
    maleteroLitros: { conTerceraFila: null, sinTerceraFila: null },
    glpCompatible: true,
    seguridad: { airbags: null, frenadoAutomatico: null, latinNcap: null },
    redTalleresRegiones: null,
    rangoCostoMensual: null,
    motorResumen: rush.motor,
    resumen: rush.resumen,
    destaca: "es el más preparado para trocha frecuente",
    rasgoCorto: "tracción trasera",
    editorial: {
      ciudad: { nivel: "Bien", porque: PORQUE_POR_REDACTAR },
      trocha: { nivel: "Bien", porque: "Tracción trasera. El más preparado para trocha frecuente." },
      talleres: { nivel: "Bien", porque: "Simple, durable y con talleres en todo el país." },
    },
    vidaReal: null,
    fuente: { url: null, fecha: null },
  },
  {
    slug: "honda-br-v",
    marca: "Honda",
    nombre: brv.nombre,
    articulo: "la",
    version: null,
    carroceria: "SUV",
    precioListaUSD: null,
    asientos: 7,
    terceraFila: "niños",
    motor: {
      litros: 1.5,
      descripcion: detalleBrv.fichaTecnica.motor,
      hp: 119,
      potenciaTexto: detalleBrv.fichaTecnica.potencia,
      torqueTexto: detalleBrv.fichaTecnica.torque,
      turbo: false,
      inyeccion: null,
    },
    transmision: "CVT",
    traccion: "delantera",
    alturaPisoMm: null,
    maleteroLitros: { conTerceraFila: null, sinTerceraFila: null },
    glpCompatible: true,
    seguridad: { airbags: null, frenadoAutomatico: "versiones-altas", latinNcap: null },
    redTalleresRegiones: null,
    rangoCostoMensual: null,
    motorResumen: brv.motor,
    resumen: brv.resumen,
    destaca: "es más cómoda y segura",
    rasgoCorto: "la más cómoda y segura en carretera",
    editorial: {
      ciudad: { nivel: "Bien", porque: "Suave y fácil de manejar en tráfico. Su tamaño se maneja bien en cocheras normales." },
      carretera: { nivel: "Bien", porque: "Silenciosa y estable. Con 119 HP adelanta sin sufrir en la Panamericana." },
      trocha: { nivel: "Justo", porque: "Buena altura al piso, pero la caja CVT se esfuerza en barro profundo y subidas lentas." },
      seguridad: { nivel: "Bien", porque: textoVidaReal("Seguridad en viaje") },
      talleres: { nivel: "Justo", porque: textoVidaReal("Talleres en provincia") },
    },
    vidaReal: detalleBrv.puntosVidaReal.map((p) => ({ ...p, nivel: p.nivel as Nivel })),
    fuente: { url: null, fecha: null },
  },
  {
    slug: "mitsubishi-xpander-cross",
    marca: "Mitsubishi",
    nombre: xpander.nombre,
    articulo: "la",
    version: null,
    carroceria: "Crossover",
    precioListaUSD: null,
    asientos: 7,
    terceraFila: null,
    motor: { litros: 1.5, descripcion: null, hp: null, potenciaTexto: null, torqueTexto: null, turbo: false, inyeccion: null },
    transmision: null,
    traccion: "delantera",
    alturaPisoMm: null,
    maleteroLitros: { conTerceraFila: null, sinTerceraFila: null },
    glpCompatible: true,
    seguridad: { airbags: null, frenadoAutomatico: null, latinNcap: null },
    redTalleresRegiones: null,
    rangoCostoMensual: null,
    motorResumen: xpander.motor,
    resumen: xpander.resumen,
    destaca: "tiene suspensión cómoda en ripio",
    rasgoCorto: "suspensión cómoda en ripio",
    editorial: {
      ciudad: { nivel: "Bien", porque: PORQUE_POR_REDACTAR },
      trocha: { nivel: "Bien", porque: "Suspensión cómoda en ripio y buena altura al piso." },
      talleres: { nivel: "Justo", porque: PORQUE_POR_REDACTAR },
    },
    vidaReal: null,
    fuente: { url: null, fecha: null },
  },
];

function textoVidaReal(titulo: string): string {
  const p = detalleBrv.puntosVidaReal.find((x) => x.titulo === titulo);
  if (!p) throw new Error(`Falta "${titulo}" en data/detalle-honda-brv.json`);
  return p.texto;
}

export function buscarModelo(slug: string): Modelo | undefined {
  return CATALOGO.find((m) => m.slug === slug);
}

export function nombreCompleto(m: Modelo): string {
  return m.nombre;
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
  return [
    { etiqueta: "Motor", valor: m.motor.descripcion ?? `${m.motor.litros} L` },
    { etiqueta: "Potencia", valor: m.motor.potenciaTexto ?? (m.motor.hp ? `${m.motor.hp} HP` : "[HP]") },
    { etiqueta: "Torque", valor: m.motor.torqueTexto ?? "[torque según ficha Perú]" },
    { etiqueta: "Transmisión", valor: m.transmision ?? "[según versión]" },
    { etiqueta: "Tracción", valor: TRACCION[m.traccion] },
    { etiqueta: "Altura al piso", valor: m.alturaPisoMm ? `${m.alturaPisoMm} mm` : "[mm según ficha Perú]" },
  ];
}

export function precioTexto(m: Modelo): string {
  return m.precioListaUSD ? `US$ ${m.precioListaUSD.toLocaleString("es-PE")}` : "US$ [precio]";
}

export function potenciaCorta(m: Modelo): string {
  return m.motor.hp ? `${m.motor.hp} HP` : "[HP]";
}

export function transmisionTexto(m: Modelo): string {
  return m.transmision ?? "[según versión]";
}

export function traccionTexto(m: Modelo): string {
  return TRACCION[m.traccion];
}
