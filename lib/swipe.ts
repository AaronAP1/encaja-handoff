import tarjetasJson from "@/data/swipe-tarjetas.json";
import type { Carroceria, Rasgo } from "./tipos";

export interface TarjetaSwipe {
  tipo: "SUV" | "Sedán" | "Hatchback" | "Pick-up" | "Van";
  color: string;
  titulo: string;
  texto: string;
  rasgos: Rasgo[];
}

/** Las 10 tarjetas de data/swipe-tarjetas.json */
export const TARJETAS = tarjetasJson as TarjetaSwipe[];

export const NOMBRES_RASGO: Record<Rasgo, string> = {
  aventura: "Aventura",
  urbano: "Ciudad y agilidad",
  familiar: "Espacio y familia",
  deportivo: "Deportivo",
  sobrio: "Sobrio y elegante",
};

const ORDEN_RASGOS = Object.keys(NOMBRES_RASGO) as Rasgo[];

export const PERFILES: Record<Rasgo, { nombre: string; texto: string }> = {
  aventura: { nombre: "Explorador", texto: "Te atraen los autos altos y robustos, listos para salir de la ciudad cuando se pueda." },
  urbano: { nombre: "Urbano ágil", texto: "Te gustan los autos compactos y fáciles de mover, hechos para el día a día en la ciudad." },
  familiar: { nombre: "Práctico de casa grande", texto: "Te fijas en el espacio: que entren todos y todo, sin apretarse." },
  deportivo: { nombre: "Con chispa", texto: "Te atrae el diseño con carácter: bajo, marcado y con presencia." },
  sobrio: { nombre: "Elegante sin vueltas", texto: "Prefieres líneas limpias y autos que no necesitan llamar la atención." },
};

export const PERFIL_SIN_GUSTO = {
  nombre: "Difícil de convencer",
  texto: "Ningún estilo te terminó de enamorar. Empecemos por cómo lo vas a usar y te mostramos opciones.",
};

export interface Voto {
  /** índice de la tarjeta */
  i: number;
  gusta: boolean;
}

export interface Barra {
  k: Rasgo;
  nombre: string;
  pct: number;
}

export interface PerfilSwipe {
  barras: Barra[];
  perfil: { nombre: string; texto: string };
  /** "Con un toque de: …" o "" */
  segundo: string;
  /** Tipos de auto que gustaron, sin repetir, en orden de aparición */
  tiposGusta: string[];
  /** Rasgos con % > 0, de mayor a menor (para pasar a /preguntas?gusto=…) */
  gusto: Rasgo[];
}

/**
 * Por rasgo: % = me gusta / vistos. El rasgo con mayor % define el perfil;
 * el segundo se muestra como "Con un toque de…". Si todo es 0: "Difícil de convencer".
 */
export function calcularPerfil(votos: readonly Voto[], tarjetas: readonly TarjetaSwipe[] = TARJETAS): PerfilSwipe {
  const vistos = Object.fromEntries(ORDEN_RASGOS.map((k) => [k, 0])) as Record<Rasgo, number>;
  const gustados = { ...vistos };
  const tiposGusta: string[] = [];
  for (const voto of votos) {
    const c = tarjetas[voto.i];
    if (!c) continue;
    for (const r of c.rasgos) {
      vistos[r] += 1;
      if (voto.gusta) gustados[r] += 1;
    }
    if (voto.gusta && !tiposGusta.includes(c.tipo)) tiposGusta.push(c.tipo);
  }
  // sort estable: en empate se mantiene el orden de NOMBRES_RASGO, como en el prototipo
  const barras = ORDEN_RASGOS.map((k) => ({
    k,
    nombre: NOMBRES_RASGO[k],
    pct: vistos[k] ? Math.round((gustados[k] / vistos[k]) * 100) : 0,
  })).sort((a, b) => b.pct - a.pct);
  const [top, seg] = barras;
  return {
    barras,
    perfil: top && top.pct > 0 ? PERFILES[top.k] : PERFIL_SIN_GUSTO,
    segundo: seg && seg.pct > 0 ? `Con un toque de: ${seg.nombre.toLowerCase()}.` : "",
    tiposGusta,
    gusto: barras.filter((b) => b.pct > 0).map((b) => b.k).slice(0, 2),
  };
}

/** Rasgos asociados a cada carrocería, según las tarjetas del swipe */
export function rasgosDeCarroceria(c: Carroceria): Rasgo[] {
  const tipo = c === "Crossover" ? "SUV" : c;
  const set = new Set<Rasgo>();
  for (const t of TARJETAS) if (t.tipo === tipo) t.rasgos.forEach((r) => set.add(r));
  return ORDEN_RASGOS.filter((r) => set.has(r));
}

/** Umbral de arrastre para decidir (design-tokens.json → motion.swipeUmbralPx) */
export const UMBRAL_SWIPE_PX = 110;
