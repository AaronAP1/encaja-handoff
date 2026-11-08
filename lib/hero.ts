import siluetasJson from "@/data/siluetas-autos.json";
import { leerEtiquetaVeredicto, senal } from "./senal";
import type { Nivel } from "./tipos";

export type TipoSilueta = "SUV" | "Sedán" | "Pick-up" | "Van" | "Hatchback";

export interface Silueta {
  tipo: TipoSilueta;
  perfilDeUso: string;
  svg: {
    viewBox: string;
    ruedas: { cx: number; cy: number; r: number }[];
    carroceria: string;
    ventanas: string;
    lineas: string;
  };
  veredictosEjemplo: string[];
}

/** data/siluetas-autos.json: SUV, Sedán, Pick-up, Van, Hatchback */
export const SILUETAS = siluetasJson as Silueta[];

export function siluetaDe(tipo: string): Silueta {
  const s = SILUETAS.find((x) => x.tipo === tipo);
  if (!s) throw new Error(`No hay silueta para "${tipo}"`);
  return s;
}

/**
 * Altura del techo y de las ventanas de cada silueta, para anclar las llamadas
 * del hero (tomado del diseño web/01-landing).
 */
const ANCLAS: Record<TipoSilueta, { techoY: number; ventanaY: number }> = {
  SUV: { techoY: 88, ventanaY: 118 },
  Sedán: { techoY: 96, ventanaY: 126 },
  "Pick-up": { techoY: 90, ventanaY: 120 },
  Van: { techoY: 62, ventanaY: 100 },
  Hatchback: { techoY: 92, ventanaY: 122 },
};

export interface LlamadaHero {
  texto: string;
  nivel: Nivel;
  /** punto en el auto */
  punto: { cx: number; cy: number };
  /** línea guía */
  guia: string;
  /** texto alineado a la derecha en x=728 */
  textoY: number;
  /** señal de veredicto junto al texto */
  senal: { d: string; fill: string };
}

export interface AutoHero {
  silueta: Silueta;
  llamadas: [LlamadaHero, LlamadaHero, LlamadaHero, LlamadaHero];
  aria: string;
}

export function autoHero(s: Silueta): AutoHero {
  const { techoY, ventanaY } = ANCLAS[s.tipo];
  const t2 = ventanaY - 7;
  const geo = [
    { punto: { cx: 470, cy: techoY }, guia: `M470,${techoY} L520,40 L740,40`, textoY: 34, senalY: 30 },
    { punto: { cx: 470, cy: ventanaY }, guia: `M470,${ventanaY} L740,${ventanaY}`, textoY: t2, senalY: t2 - 4 },
    { punto: { cx: 640, cy: 185 }, guia: "M640,185 L740,185", textoY: 177, senalY: 173 },
    { punto: { cx: 560, cy: 215 }, guia: "M560,215 L600,268 L740,268", textoY: 260, senalY: 256 },
  ] as const;
  const llamadas = geo.map((g, k) => {
    const texto = s.veredictosEjemplo[k] ?? "";
    const { nivel } = leerEtiquetaVeredicto(texto);
    return { texto, nivel, punto: g.punto, guia: g.guia, textoY: g.textoY, senal: senal(nivel, 744, g.senalY, 7) };
  }) as AutoHero["llamadas"];
  return {
    silueta: s,
    llamadas,
    aria: `${s.tipo} partido en dos: a la izquierda como en el catálogo; a la derecha, en planos, cómo rinde en tu uso: ${s.veredictosEjemplo.join(", ")}`,
  };
}

export const ROTACION_HERO_MS = 5000;
export const FUNDIDO_MS = 300;
