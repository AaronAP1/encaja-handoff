import { CATALOGO } from "./catalogo";
import { glpProbablementeConviene } from "./deducciones";
import { hayPerfil } from "./respuestas";
import { rasgosDeCarroceria } from "./swipe";
import type { Dimension, Modelo, Nivel, Respuestas, Veredicto } from "./tipos";

/**
 * Motor de reglas: (modelo, respuestas) => { nivel, porque }.
 *
 * Cada dimensión tiene una regla declarativa que se calcula desde la ficha técnica
 * (docs/04-logica.md). Si falta un dato de la ficha o un umbral aún no validado,
 * la regla devuelve null y se usa la evaluación editorial del catálogo.
 * `reglas.test.ts` verifica que la evaluación editorial nunca contradiga a la regla.
 */

/** Umbrales por validar con mecánicos y conductores de provincia antes de publicarse */
export interface Umbrales {
  /** Altura al piso mínima para trocha (mm) */
  alturaMinimaTrochaMm: number | null;
  /** Talleres oficiales en regiones para "Bien" */
  talleresParaBien: number | null;
  /** Talleres oficiales en regiones para "Justo" (debajo: "Difícil") */
  talleresParaJusto: number | null;
}

export const UMBRALES: Umbrales = {
  /** PROVISIONAL (2026-11-08, acordado con el dueño del producto): validar con conductores de provincia */
  alturaMinimaTrochaMm: 200,
  talleresParaBien: null,
  talleresParaJusto: null,
};

export interface Regla {
  dimension: Dimension;
  /** Si esta dimensión importa para lo que contó la persona */
  aplica: (r: Respuestas) => boolean;
  /** Evaluación desde la ficha; null si falta un dato o un umbral */
  evaluar: (m: Modelo, r: Respuestas, u: Umbrales) => Veredicto | null;
  /** Criterio público (se muestra en /como-evaluamos) */
  criterio: string[];
}

const v = (nivel: Nivel, porque: string): Veredicto => ({ nivel, porque });

export const REGLAS: Record<Dimension, Regla> = {
  ciudad: {
    dimension: "ciudad",
    aplica: (r) => !!r.usos.ciudad,
    evaluar: () => null,
    criterio: ["Evaluación editorial: manejo en tráfico, tamaño y cochera."],
  },
  carretera: {
    dimension: "carretera",
    aplica: (r) => !!r.usos.carretera,
    evaluar: () => null,
    criterio: ["Evaluación editorial: estabilidad, ruido y fuerza para adelantar."],
  },
  trocha: {
    dimension: "trocha",
    aplica: (r) => !!r.usos.trocha,
    evaluar: (m, _r, u) => {
      if (m.alturaPisoMm === null || u.alturaMinimaTrochaMm === null) return null;
      if (m.alturaPisoMm < u.alturaMinimaTrochaMm) return v("Difícil", "Poca altura al piso para caminos sin asfaltar.");
      if (m.traccion === "trasera" || m.traccion === "4x4" || m.traccion === "AWD")
        return v("Bien", `Buena altura al piso y tracción ${m.traccion === "trasera" ? "trasera" : m.traccion}.`);
      if (m.transmision === "CVT")
        return v("Justo", "Buena altura al piso, pero la caja CVT se esfuerza en barro profundo y subidas lentas.");
      if (m.transmision === "AT" || m.transmision === "MT") return v("Bien", "Buena altura al piso y una caja que aguanta el barro.");
      return null;
    },
    criterio: [
      "Altura al piso bajo el umbral: Difícil.",
      "Altura suficiente y caja CVT: Justo (la CVT se esfuerza en barro).",
      "Altura suficiente y caja AT/MT, o tracción trasera/4x4: Bien.",
    ],
  },
  sierra: {
    dimension: "sierra",
    aplica: (r) => !!r.usos.sierra,
    evaluar: (m) => {
      if (m.motor.turbo === null) return null;
      return m.motor.turbo
        ? v("Bien", "Motor turbo: mantiene la fuerza sobre 3,000 m.")
        : v("Justo", "Motor sin turbo: sobre 3,000 m pierde fuerza, más aún con el carro lleno.");
    },
    criterio: ["Sin turbo: Justo (sobre 3,000 m pierde fuerza).", "Con turbo: Bien."],
  },
  pasajeros: {
    dimension: "pasajeros",
    aplica: (r) => r.pas !== null,
    evaluar: (m, r) => {
      if (r.pas === "6-7") {
        if (m.asientos < 7) return v("Difícil", `Tiene ${m.asientos} asientos.`);
        if (m.terceraFila === "niños")
          return v("Justo", "La tercera fila sirve para niños o trayectos cortos, y con ella en uso el maletero queda chico.");
        if (m.terceraFila === "adultos") return v("Bien", "La tercera fila sirve también para adultos.");
        return null;
      }
      if (r.pas === "5") {
        if (m.asientos >= 7 && m.terceraFila !== null)
          return v("Bien", "Cinco van cómodos, y con la tercera fila plegada tienes buen maletero.");
        return null;
      }
      if (r.pas === "1-2" || r.pas === "3-4") {
        if (m.asientos >= 7) return v("Bien", "Te sobra espacio. Revisa si realmente necesitas un auto de 7 asientos.");
        return null;
      }
      return null;
    },
    criterio: [
      "Para 6 o 7: tercera fila solo para niños es Justo; para adultos, Bien; 5 asientos, Difícil.",
    ],
  },
  glp: {
    dimension: "glp",
    aplica: (r) => r.comb === "glp" || (r.comb !== "gasolina" && glpProbablementeConviene(r)),
    evaluar: (m) => {
      const compatible = m.glpCompatible ?? (m.motor.inyeccion === null ? null : m.motor.inyeccion === "indirecta");
      if (compatible === null) return null;
      if (compatible)
        return v("Bien", "Motor compatible. Pregunta dónde reubican la llanta de repuesto y si se mantiene la garantía.");
      return m.motor.inyeccion === "directa"
        ? v("Justo", "Motor de inyección directa: la conversión es más delicada.")
        : v("Difícil", "Motor no recomendado para convertir a GLP.");
    },
    criterio: [
      "Inyección indirecta: Bien (con aviso de la llanta de repuesto y la garantía).",
      "Inyección directa: Justo o Difícil.",
    ],
  },
  seguridad: {
    dimension: "seguridad",
    aplica: (r) => r.noche === "seguido",
    evaluar: (m) => {
      const f = m.seguridad.frenadoAutomatico;
      if (f === null) return null;
      if (f === "si") return v("Bien", "Trae frenado automático.");
      if (f === "versiones-altas") return v("Bien", "Las versiones altas traen frenado automático.");
      return v("Justo", "No trae frenado automático.");
    },
    criterio: ["Si manejas seguido de noche, con lluvia o neblina: priorizamos frenado automático y buenos faros."],
  },
  talleres: {
    dimension: "talleres",
    aplica: (r) => !!r.usos.trocha || !!r.usos.sierra,
    evaluar: (m, _r, u) => {
      const n = m.redTalleresRegiones;
      if (n === null || u.talleresParaBien === null || u.talleresParaJusto === null) return null;
      if (n >= u.talleresParaBien) return v("Bien", "Red oficial amplia en regiones.");
      if (n >= u.talleresParaJusto) return v("Justo", "Revisa si hay taller en las ciudades a las que viajas.");
      return v("Difícil", "Pocos talleres oficiales fuera de Lima.");
    },
    criterio: ["Según la red oficial de talleres en regiones (umbrales por definir)."],
  },
};

/** Orden en que se muestran las dimensiones */
export const ORDEN_DIMENSIONES: readonly Dimension[] = [
  "ciudad",
  "carretera",
  "trocha",
  "sierra",
  "pasajeros",
  "glp",
  "seguridad",
  "talleres",
];

/** Lo que muestra una tarjeta de resultados cuando aún no hay perfil (como en el diseño) */
export const DIMENSIONES_POR_DEFECTO: readonly Dimension[] = ["ciudad", "trocha", "sierra", "glp"];

/** Filas fijas de "Para tu uso" en /comparar (como en el diseño) */
export const DIMENSIONES_COMPARAR: readonly Dimension[] = ["ciudad", "trocha", "sierra", "glp", "talleres"];

export type Contexto = "tarjeta" | "revisar" | "comparar" | "detalle";

const ETIQUETAS: Record<Exclude<Dimension, "pasajeros">, Record<Contexto, string>> = {
  ciudad: { tarjeta: "Ciudad", revisar: "Ciudad", comparar: "Ciudad", detalle: "Ciudad" },
  carretera: { tarjeta: "Carretera", revisar: "Carretera", comparar: "Carretera", detalle: "Carretera" },
  trocha: { tarjeta: "Trocha", revisar: "Trocha", comparar: "Trocha", detalle: "Trocha con barro" },
  sierra: { tarjeta: "Sierra cargado", revisar: "Sierra", comparar: "Sierra con carro lleno", detalle: "Sierra con el carro lleno" },
  glp: { tarjeta: "Usar GLP", revisar: "Convertir a GLP", comparar: "Convertir a GLP", detalle: "Convertir a GLP" },
  seguridad: { tarjeta: "Seguridad en viaje", revisar: "Seguridad en viaje", comparar: "Seguridad en viaje", detalle: "Seguridad en viaje" },
  talleres: {
    tarjeta: "Talleres en provincia",
    revisar: "Talleres en provincia",
    comparar: "Talleres en provincia",
    detalle: "Talleres en provincia",
  },
};

export function etiqueta(dimension: Dimension, contexto: Contexto, r?: Respuestas): string {
  if (dimension === "pasajeros") {
    if (r?.pas === "6-7") return "6 o 7 pasajeros";
    if (r?.pas === "5") return "5 pasajeros";
    return "Pocos pasajeros";
  }
  return ETIQUETAS[dimension][contexto];
}

// ── Evaluación ────────────────────────────────────────────────────────────

export interface Evaluacion {
  dimension: Dimension;
  /** null = falta un dato de la ficha: se muestra como "[por evaluar]", nunca como veredicto */
  veredicto: Veredicto | null;
  origen: "regla" | "editorial" | "sin-dato";
}

export function evaluar(m: Modelo, dimension: Dimension, r: Respuestas, u: Umbrales = UMBRALES): Evaluacion {
  const editorial = dimension === "pasajeros" ? undefined : m.editorial[dimension];
  if (editorial) return { dimension, veredicto: editorial, origen: "editorial" };
  const regla = REGLAS[dimension].evaluar(m, r, u);
  if (regla) return { dimension, veredicto: regla, origen: "regla" };
  return { dimension, veredicto: null, origen: "sin-dato" };
}

/** Dimensiones que importan para lo que contó la persona, en orden de lectura */
export function dimensionesDelPerfil(r: Respuestas): Dimension[] {
  return ORDEN_DIMENSIONES.filter((d) => REGLAS[d].aplica(r));
}

export function evaluarPerfil(m: Modelo, r: Respuestas, dims: readonly Dimension[] = dimensionesDelPerfil(r)): Evaluacion[] {
  return dims.map((d) => evaluar(m, d, r));
}

const PUNTOS: Record<Nivel, number> = { Bien: 2, Justo: 1, Difícil: 0 };

export function puntosNivel(nivel: Nivel | undefined): number {
  return nivel ? PUNTOS[nivel] : 0;
}

/** Suma de puntos; un dato faltante cuenta como Justo para no premiar ni castigar */
export function puntaje(evals: readonly Evaluacion[]): number {
  return evals.reduce((s, e) => s + (e.veredicto ? PUNTOS[e.veredicto.nivel] : PUNTOS.Justo), 0);
}

/**
 * Un modelo encaja si no tiene ningún Difícil en lo que marcaste y cae en tu presupuesto
 * (cuando ambos montos se conocen).
 */
export function encaja(m: Modelo, r: Respuestas): boolean {
  const evals = evaluarPerfil(m, r);
  if (evals.some((e) => e.veredicto?.nivel === "Difícil")) return false;
  if (r.pres && m.rangoCostoMensual && Number(m.rangoCostoMensual) > Number(r.pres)) return false;
  return true;
}

/** Afinidad con el gusto del swipe: el primer rasgo pesa 2, el segundo 1 */
export function afinidad(m: Modelo, r: Respuestas): number {
  const rasgos = rasgosDeCarroceria(m.carroceria);
  return r.gusto.reduce((s, g, i) => s + (rasgos.includes(g) ? (i === 0 ? 2 : 1) : 0), 0);
}

export interface Resultado {
  modelo: Modelo;
  evaluaciones: Evaluacion[];
  puntaje: number;
  afinidad: number;
}

/**
 * Modelos que encajan, ordenados: primero por gusto (solo entre los que ya sirven),
 * luego por puntaje y al final por orden del catálogo.
 */
export function resultados(r: Respuestas, catalogo: readonly Modelo[] = CATALOGO): Resultado[] {
  const dims = hayPerfil(r) ? dimensionesDelPerfil(r) : [...DIMENSIONES_POR_DEFECTO];
  return catalogo
    .map((modelo, i) => ({ i, modelo }))
    .filter(({ modelo }) => encaja(modelo, r))
    .map(({ i, modelo }) => {
      const evaluaciones = evaluarPerfil(modelo, r, dims);
      return { i, modelo, evaluaciones, puntaje: puntaje(evaluaciones), afinidad: afinidad(modelo, r) };
    })
    .sort((a, b) => b.afinidad - a.afinidad || b.puntaje - a.puntaje || a.i - b.i)
    .map(({ modelo, evaluaciones, puntaje: p, afinidad: af }) => ({ modelo, evaluaciones, puntaje: p, afinidad: af }));
}

export function contarQueEncajan(r: Respuestas, catalogo: readonly Modelo[] = CATALOGO): number {
  return catalogo.filter((m) => encaja(m, r)).length;
}

// ── Frases de veredicto ───────────────────────────────────────────────────

export interface VeredictoGeneral {
  titulo: string;
  resumen: string;
  /** Color de la franja superior de la tarjeta */
  color: string;
}

/** Tarjeta "Veredicto para tu uso" de /revisar (tal cual el prototipo) */
export function veredictoGeneral(evals: readonly Evaluacion[]): VeredictoGeneral {
  const niveles = evals.flatMap((e) => (e.veredicto ? [e.veredicto.nivel] : []));
  const justos = niveles.filter((n) => n === "Justo").length;
  const dificiles = niveles.filter((n) => n === "Difícil").length;
  if (dificiles > 0 || justos >= 3)
    return {
      titulo: "Hay opciones que te sirven mejor",
      resumen: "Para tu uso, varias cosas quedan justas. Mira las alternativas antes de decidir.",
      color: "#B3261E",
    };
  if (justos > 0)
    return {
      titulo: `Te sirve, con ${justos} ${justos === 1 ? "cosa" : "cosas"} a tener en cuenta`,
      resumen: "Encaja con lo principal de tu uso. Revisa los puntos marcados como Justo.",
      color: "#1A56C4",
    };
  return { titulo: "Te sirve bien", resumen: "Para lo que nos contaste, no vemos puntos débiles importantes.", color: "#0E6B4E" };
}

export function listaHumana(partes: readonly string[]): string {
  if (partes.length <= 1) return partes.join("");
  return `${partes.slice(0, -1).join(", ")} y ${partes[partes.length - 1]}`;
}

/** "Encaja bien en ciudad y carretera. Tiene 2 cosas que debes saber antes de comprar." */
export function fraseParaTi(evals: readonly Evaluacion[], r: Respuestas): string | null {
  const conDato = evals.filter((e) => e.veredicto);
  if (conDato.length === 0) return null;
  const usos: Dimension[] = ["ciudad", "carretera", "trocha", "sierra"];
  const bien = conDato
    .filter((e) => usos.includes(e.dimension) && e.veredicto?.nivel === "Bien")
    .map((e) => etiqueta(e.dimension, "revisar", r).toLowerCase());
  const ojo = conDato.filter((e) => e.veredicto?.nivel !== "Bien").length;
  const cosas = `Tiene ${ojo} ${ojo === 1 ? "cosa" : "cosas"} que debes saber antes de comprar.`;
  if (bien.length && ojo) return `Encaja bien en ${listaHumana(bien)}. ${cosas}`;
  if (bien.length) return `Encaja bien en ${listaHumana(bien)}.`;
  if (ojo) return cosas;
  return "Para lo que nos contaste, no vemos puntos débiles importantes.";
}

/** Dimensiones que se describen en "En tu vida real" cuando el modelo no tiene puntos escritos a mano */
const DIMENSIONES_VIDA_REAL: readonly Dimension[] = ["ciudad", "carretera", "trocha", "sierra", "pasajeros", "glp", "seguridad", "talleres"];

export interface PuntoVidaReal {
  titulo: string;
  /** null = falta el dato: se muestra "[por evaluar]" */
  nivel: Nivel | null;
  texto: string;
}

export function puntosVidaReal(m: Modelo, r: Respuestas): PuntoVidaReal[] {
  if (m.vidaReal) return m.vidaReal;
  return DIMENSIONES_VIDA_REAL.filter((d) => d !== "pasajeros" || r.pas !== null).map((d) => {
    const e = evaluar(m, d, r);
    return {
      titulo: etiqueta(d, "detalle", r),
      nivel: e.veredicto?.nivel ?? null,
      texto: e.veredicto?.porque ?? "[Dato pendiente de la ficha oficial Perú]",
    };
  });
}

// ── Recomendación en /comparar ────────────────────────────────────────────

export interface Segmento {
  texto: string;
  fuerte?: boolean;
}

function mejorEn(
  modelos: readonly Modelo[],
  dims: readonly Dimension[],
  r: Respuestas,
  desempate: readonly Dimension[] = [],
): { modelo: Modelo; puntos: number } | null {
  let mejor: { modelo: Modelo; puntos: number; extra: number } | null = null;
  for (const m of modelos) {
    const puntos = dims.reduce((s, d) => s + puntosNivel(evaluar(m, d, r).veredicto?.nivel), 0);
    const extra = desempate.reduce((s, d) => s + puntosNivel(evaluar(m, d, r).veredicto?.nivel), 0);
    if (!mejor || puntos > mejor.puntos || (puntos === mejor.puntos && extra > mejor.extra)) mejor = { modelo: m, puntos, extra };
  }
  return mejor;
}

/**
 * "Si vas a trocha seguido, el Toyota Rush. Si casi todo es ciudad y carretera,
 * la Honda BR-V es más cómoda y segura."
 */
export function recomendacion(modelos: readonly Modelo[], r: Respuestas): Segmento[] | null {
  if (modelos.length < 2) return null;
  const segmentos: Segmento[] = [];
  const exigente: Dimension | null = r.usos.trocha ? "trocha" : r.usos.sierra ? "sierra" : null;
  let elegido: Modelo | null = null;

  if (exigente) {
    const niveles = modelos.map((m) => puntosNivel(evaluar(m, exigente, r).veredicto?.nivel));
    const distingue = new Set(niveles).size > 1;
    const a = distingue ? mejorEn(modelos, [exigente], r, DIMENSIONES_COMPARAR) : null;
    if (a) {
      elegido = a.modelo;
      segmentos.push(
        { texto: `Si vas a ${exigente === "trocha" ? "trocha" : "la sierra"} seguido, ${a.modelo.articulo} ` },
        { texto: a.modelo.nombre, fuerte: true },
        { texto: ". " },
      );
    }
  }

  if (elegido) {
    const resto = modelos.filter((m) => m !== elegido);
    const b = mejorEn(resto, ["ciudad", "carretera", "seguridad"], r, DIMENSIONES_COMPARAR);
    if (b && b.puntos > 0) {
      segmentos.push(
        { texto: `Si casi todo es ciudad y carretera, ${b.modelo.articulo} ` },
        { texto: b.modelo.nombre, fuerte: true },
        { texto: ` ${b.modelo.destaca}.` },
      );
    }
  } else {
    const dims = hayPerfil(r) ? dimensionesDelPerfil(r) : DIMENSIONES_COMPARAR;
    const c = mejorEn(modelos, dims, r, DIMENSIONES_COMPARAR);
    if (c) {
      segmentos.push(
        { texto: `Para tu uso, ${c.modelo.articulo} ` },
        { texto: c.modelo.nombre, fuerte: true },
        { texto: " es la opción que mejor encaja." },
      );
    }
  }
  return segmentos.length ? segmentos : null;
}

// ── Alternativas en /revisar ──────────────────────────────────────────────

export interface Alternativa {
  modelo: Modelo;
  por: string;
}

/**
 * Si la trocha es frecuente: modelos con mejor nivel en trocha.
 * Si es sierra: modelos con nivel igual o mejor (cuando el actual no está en Bien).
 */
export function alternativas(actual: Modelo, r: Respuestas, catalogo: readonly Modelo[] = CATALOGO): { titulo: string; lista: Alternativa[] } | null {
  const dim: Dimension | null = r.usos.trocha ? "trocha" : r.usos.sierra ? "sierra" : null;
  if (!dim) return null;
  const nivelActual = evaluar(actual, dim, r).veredicto?.nivel;
  if (nivelActual === "Bien") return null;
  const base = puntosNivel(nivelActual);
  const lista = catalogo
    .filter((m) => m.slug !== actual.slug)
    .map((m) => ({ m, nivel: evaluar(m, dim, r).veredicto?.nivel }))
    .filter(({ nivel }) => nivel && (dim === "trocha" ? puntosNivel(nivel) > base : puntosNivel(nivel) >= base))
    .map(({ m, nivel }) => ({ modelo: m, por: `${etiqueta(dim, "revisar", r)}: ${nivel} · ${m.rasgoCorto}` }));
  if (!lista.length) return null;
  return {
    titulo: dim === "trocha" ? "Si la trocha es frecuente, estas encajan mejor" : "Para sierra, también mira estas",
    lista,
  };
}
