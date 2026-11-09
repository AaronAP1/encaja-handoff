import datos from "@/data/fichas-minimas.json";
import type { FichaMinima } from "./fichas/esquema";
import { claveModelo } from "./mercado";
import { etiqueta, evaluar } from "./reglas";
import { respuestasVacias } from "./respuestas";
import type { Dimension, Modelo, Nivel, Respuestas } from "./tipos";

/**
 * Fichas mínimas (data/fichas-minimas.json, validadas en fichas-minimas.test.ts): solo los
 * datos que usan las reglas, cada uno con su fuente. Dan veredictos por uso para /modelos sin
 * textos editoriales; lo que la fuente no dice queda "[por evaluar]".
 */
export const FICHAS_MINIMAS = (datos as unknown as { fichas: FichaMinima[] }).fichas;

/**
 * El `Modelo` que entiende el motor de reglas, armado solo con los datos de la ficha mínima.
 * Sin textos ni evaluación editorial. Si la ficha no dice la tracción, la regla de trocha
 * no la cuenta a favor (solo suma la trasera, 4x4 o AWD que la ficha confirma).
 */
export function aModeloMinimo(f: FichaMinima): Modelo {
  const d = f.datos;
  return {
    slug: f.slug,
    marca: f.marca,
    nombre: `${f.marca} ${f.nombre}`,
    articulo: "el",
    version: f.version,
    carroceria: f.carroceria === "Minivan" ? "Van" : f.carroceria,
    precioListaUSD: null,
    asientos: d.asientos?.valor ?? 0, // sin dato: pasajeros se marca "[por evaluar]" en paraQueVa
    terceraFila: null,
    motor: {
      litros: 0,
      descripcion: null,
      hp: d.hp?.valor ?? null,
      potenciaTexto: null,
      torqueTexto: null,
      turbo: d.turbo?.valor ?? null,
      inyeccion: d.inyeccion?.valor ?? null,
    },
    transmision: d.transmision?.valor ?? null,
    traccion: d.traccion?.valor ?? "delantera",
    alturaPisoMm: d.alturaPisoMm?.valor ?? null,
    maleteroLitros: { conTerceraFila: null, sinTerceraFila: null },
    glpCompatible: d.glpCompatible?.valor ?? null,
    seguridad: { airbags: null, frenadoAutomatico: d.frenadoAutomatico?.valor ?? null, latinNcap: null },
    redTalleresRegiones: null,
    rangoCostoMensual: null,
    motorResumen: "",
    resumen: "",
    destaca: "",
    rasgoCorto: "",
    editorial: {},
    vidaReal: null,
    fuente: { url: null, fecha: f.revisado },
    versiones: [],
  };
}

const vacias = respuestasVacias();

/** Los usos que se muestran por modelo, cada uno con el perfil que lo activa */
export const USOS_FICHA: readonly { dimension: Dimension; perfil: Respuestas }[] = [
  { dimension: "trocha", perfil: { ...vacias, usos: { trocha: true } } },
  { dimension: "sierra", perfil: { ...vacias, usos: { sierra: true } } },
  { dimension: "pasajeros", perfil: { ...vacias, pas: "6-7" } },
  { dimension: "glp", perfil: { ...vacias, comb: "glp" } },
  { dimension: "seguridad", perfil: { ...vacias, noche: "seguido" } },
];

export interface UsoEvaluado {
  dimension: Dimension;
  etiqueta: string;
  nivel: Nivel | null;
  porque: string | null;
}

/** Para qué usos va el modelo, según las reglas públicas (/como-evaluamos) */
export function paraQueVa(f: FichaMinima): UsoEvaluado[] {
  const m = aModeloMinimo(f);
  return USOS_FICHA.map(({ dimension, perfil }) => {
    const sinAsientos = dimension === "pasajeros" && f.datos.asientos === null;
    const ev = sinAsientos ? null : evaluar(m, dimension, perfil).veredicto;
    return { dimension, etiqueta: etiqueta(dimension, "tarjeta", perfil), nivel: ev?.nivel ?? null, porque: ev?.porque ?? null };
  });
}

export interface DatoVisible {
  etiqueta: string;
  valor: string;
  url: string;
  pagina: number | null;
  nota: string | null;
}

const SI_NO = (v: boolean) => (v ? "Sí" : "No");
const FRENADO = { si: "Sí", no: "No", "versiones-altas": "En algunas versiones" } as const;

/** Los datos de la ficha con su fuente, en el orden en que se leen */
export function datosVisibles(f: FichaMinima): DatoVisible[] {
  const d = f.datos;
  const filas: [string, { valor: unknown; fuente: { url: string; pagina: number | null }; nota?: string } | null, string][] = [
    ["Asientos", d.asientos, String(d.asientos?.valor)],
    ["Altura al piso", d.alturaPisoMm, `${d.alturaPisoMm?.valor} mm`],
    ["Tracción", d.traccion, d.traccion?.valor === "delantera" ? "Delantera" : String(d.traccion?.valor)],
    ["Transmisión", d.transmision, String(d.transmision?.valor)],
    ["Turbo", d.turbo, d.turbo ? SI_NO(d.turbo.valor) : ""],
    ["Potencia", d.hp, `${d.hp?.valor} HP`],
    ["Inyección", d.inyeccion, d.inyeccion?.valor === "directa" ? "Directa" : "Indirecta"],
    ["Apto para GLP", d.glpCompatible, d.glpCompatible ? SI_NO(d.glpCompatible.valor) : ""],
    ["Frenado automático", d.frenadoAutomatico, d.frenadoAutomatico ? FRENADO[d.frenadoAutomatico.valor] : ""],
  ];
  return filas.flatMap(([etiquetaDato, dato, valor]) =>
    dato ? [{ etiqueta: etiquetaDato, valor, url: dato.fuente.url, pagina: dato.fuente.pagina, nota: dato.nota ?? null }] : [],
  );
}

/** Lo que /modelos necesita de cada ficha, por clave de modelo */
export interface ResumenFicha {
  version: string;
  revisado: string;
  usos: UsoEvaluado[];
  datos: DatoVisible[];
}

export function resumenesPorModelo(fichas: readonly FichaMinima[] = FICHAS_MINIMAS): Record<string, ResumenFicha> {
  return Object.fromEntries(
    fichas.map((f) => [claveModelo(f.marca, f.nombre), { version: f.version, revisado: f.revisado, usos: paraQueVa(f), datos: datosVisibles(f) }]),
  );
}
