/** Tipos compartidos. Modelo de datos según docs/04-logica.md. */

export type Nivel = "Bien" | "Justo" | "Difícil";
export const NIVELES: readonly Nivel[] = ["Bien", "Justo", "Difícil"];

// ── Respuestas del usuario ────────────────────────────────────────────────
// Las claves coinciden con data/preguntas-flujo.json (pas, usos, km, …).

export type Pasajeros = "1-2" | "3-4" | "5" | "6-7";
export type Uso = "ciudad" | "carretera" | "trocha" | "sierra";
export type Km = "poco" | "medio" | "mucho" | "nose";
export type Trafico = "mucho" | "algo" | "poco";
export type Noche = "seguido" | "aveces" | "nunca";
export type Carga = "bebe" | "mercado" | "viaje" | "trabajo";
/** Rangos de presupuesto mensual 1–4; los montos están por definir (docs/05). */
export type Presupuesto = "1" | "2" | "3" | "4";
export type Combustible = "gasolina" | "glp" | "igual";
export type Rasgo = "aventura" | "urbano" | "familiar" | "deportivo" | "sobrio";

export const VALORES = {
  pas: ["1-2", "3-4", "5", "6-7"],
  usos: ["ciudad", "carretera", "trocha", "sierra"],
  km: ["poco", "medio", "mucho", "nose"],
  trafico: ["mucho", "algo", "poco"],
  noche: ["seguido", "aveces", "nunca"],
  carga: ["bebe", "mercado", "viaje", "trabajo"],
  pres: ["1", "2", "3", "4"],
  comb: ["gasolina", "glp", "igual"],
  gusto: ["aventura", "urbano", "familiar", "deportivo", "sobrio"],
} as const satisfies Record<string, readonly string[]>;

export interface Respuestas {
  pas: Pasajeros | null;
  usos: Partial<Record<Uso, boolean>>;
  km: Km | null;
  trafico: Trafico | null;
  noche: Noche | null;
  carga: Partial<Record<Carga, boolean>>;
  pres: Presupuesto | null;
  /** Preferencia de combustible (panel de perfil en /resultados) */
  comb: Combustible | null;
  /** Perfil de gusto del swipe: solo ordena, nunca recomienda algo que no sirve */
  gusto: Rasgo[];
}

/** Las 7 preguntas del flujo */
export type ClavePregunta = "pas" | "usos" | "km" | "trafico" | "noche" | "carga" | "pres";

// ── Catálogo ──────────────────────────────────────────────────────────────

export type Carroceria = "SUV" | "Sedán" | "Hatchback" | "Pick-up" | "Van" | "Crossover";
export type Transmision = "MT" | "AT" | "CVT" | "DCT";
export type Traccion = "delantera" | "trasera" | "4x4" | "AWD";

/** Cada aspecto que evaluamos de un modelo para un uso */
export type Dimension =
  | "ciudad"
  | "carretera"
  | "trocha"
  | "sierra"
  | "pasajeros"
  | "glp"
  | "trafico"
  | "seguridad"
  | "talleres";

export interface Veredicto {
  nivel: Nivel;
  porque: string;
}

export interface Modelo {
  slug: string;
  marca: string;
  nombre: string;
  /** "el" Toyota Rush, "la" Honda BR-V */
  articulo: "el" | "la";
  version: string | null;
  carroceria: Carroceria;
  /** null = placeholder visible hasta tener la ficha oficial Perú */
  precioListaUSD: number | null;
  asientos: number;
  terceraFila: "adultos" | "niños" | null;
  motor: {
    litros: number;
    descripcion: string | null;
    hp: number | null;
    potenciaTexto: string | null;
    torqueTexto: string | null;
    turbo: boolean | null;
    inyeccion: "indirecta" | "directa" | null;
  };
  transmision: Transmision | null;
  traccion: Traccion;
  alturaPisoMm: number | null;
  maleteroLitros: { conTerceraFila: number | null; sinTerceraFila: number | null };
  /** En la práctica: inyección indirecta */
  glpCompatible: boolean | null;
  seguridad: {
    airbags: number | null;
    frenadoAutomatico: "si" | "no" | "versiones-altas" | null;
    latinNcap: number | null;
  };
  redTalleresRegiones: number | null;
  /** Rango de costo mensual total (1–4) para filtrar por presupuesto; null = por calcular */
  rangoCostoMensual: Presupuesto | null;
  /** Línea corta bajo el nombre en resultados */
  motorResumen: string;
  resumen: string;
  /** Frase para la recomendación en /comparar ("es más cómoda y segura") */
  destaca: string;
  /** Rasgo corto para sugerirlo como alternativa ("tracción trasera") */
  rasgoCorto: string;
  /** Evaluaciones editoriales (criterio propio, con metodología pública) */
  editorial: Partial<Record<Dimension, Veredicto>>;
  /** Puntos "En tu vida real" escritos a mano para la ficha; si falta, se generan */
  vidaReal: { titulo: string; nivel: Nivel; texto: string }[] | null;
  /** Fuente de la ficha de la versión de referencia */
  fuente: { url: string | null; fecha: string | null };
  /** Todas las versiones cargadas (los veredictos usan la de referencia) */
  versiones: { id: string; nombre: string | null; transmision: Transmision | null; precioListaUSD: number | null }[];
}
