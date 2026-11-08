import { VALORES, type Carga, type ClavePregunta, type Respuestas, type Uso } from "./tipos";

/** Lo mínimo que entiende URLSearchParams y el `searchParams` de Next */
export type ParamsEntrada =
  | URLSearchParams
  | Record<string, string | string[] | undefined>
  | null
  | undefined;

export function respuestasVacias(): Respuestas {
  return { pas: null, usos: {}, km: null, trafico: null, noche: null, carga: {}, pres: null, comb: null, gusto: [] };
}

function leer(params: ParamsEntrada, clave: string): string | null {
  if (!params) return null;
  if (params instanceof URLSearchParams) return params.get(clave);
  const v = params[clave];
  if (Array.isArray(v)) return v[0] ?? null;
  return v ?? null;
}

function uno<T extends string>(valor: string | null, permitidos: readonly T[]): T | null {
  return valor !== null && (permitidos as readonly string[]).includes(valor) ? (valor as T) : null;
}

function lista<T extends string>(valor: string | null, permitidos: readonly T[]): T[] {
  if (!valor) return [];
  const vistos = new Set<T>();
  for (const parte of valor.split(",")) {
    const v = uno(parte.trim(), permitidos);
    if (v) vistos.add(v);
  }
  return [...vistos];
}

function aMapa<T extends string>(valores: T[]): Partial<Record<T, boolean>> {
  return Object.fromEntries(valores.map((v) => [v, true])) as Partial<Record<T, boolean>>;
}

function marcados<T extends string>(mapa: Partial<Record<T, boolean>>, orden: readonly T[]): T[] {
  return orden.filter((v) => mapa[v]);
}

/** Lee las respuestas desde la URL. Ignora valores desconocidos. */
export function leerRespuestas(params: ParamsEntrada): Respuestas {
  return {
    pas: uno(leer(params, "pas"), VALORES.pas),
    usos: aMapa(lista(leer(params, "usos"), VALORES.usos)),
    km: uno(leer(params, "km"), VALORES.km),
    trafico: uno(leer(params, "trafico"), VALORES.trafico),
    noche: uno(leer(params, "noche"), VALORES.noche),
    carga: aMapa(lista(leer(params, "carga"), VALORES.carga)),
    pres: uno(leer(params, "pres"), VALORES.pres),
    comb: uno(leer(params, "comb"), VALORES.comb),
    gusto: lista(leer(params, "gusto"), VALORES.gusto),
  };
}

/** Convierte respuestas en search params estables (mismo orden siempre: URLs compartibles) */
export function escribirRespuestas(r: Respuestas): URLSearchParams {
  const p = new URLSearchParams();
  if (r.pas) p.set("pas", r.pas);
  const usos = marcados<Uso>(r.usos, VALORES.usos);
  if (usos.length) p.set("usos", usos.join(","));
  if (r.km) p.set("km", r.km);
  if (r.trafico) p.set("trafico", r.trafico);
  if (r.noche) p.set("noche", r.noche);
  const carga = marcados<Carga>(r.carga, VALORES.carga);
  if (carga.length) p.set("carga", carga.join(","));
  if (r.pres) p.set("pres", r.pres);
  if (r.comb) p.set("comb", r.comb);
  if (r.gusto.length) p.set("gusto", r.gusto.join(","));
  return p;
}

/** "?pas=6-7&usos=ciudad" o "" si no hay nada */
export function consulta(r: Respuestas, extra?: Record<string, string | undefined>): string {
  const p = escribirRespuestas(r);
  for (const [k, v] of Object.entries(extra ?? {})) if (v) p.set(k, v);
  const s = p.toString().replaceAll("%2C", ",");
  return s ? `?${s}` : "";
}

export function estaRespondida(r: Respuestas, clave: ClavePregunta): boolean {
  if (clave === "usos") return Object.values(r.usos).some(Boolean);
  if (clave === "carga") return Object.values(r.carga).some(Boolean);
  return r[clave] !== null;
}

export function hayPerfil(r: Respuestas): boolean {
  return (
    r.pas !== null ||
    estaRespondida(r, "usos") ||
    r.km !== null ||
    r.trafico !== null ||
    r.noche !== null ||
    estaRespondida(r, "carga") ||
    r.pres !== null ||
    r.comb !== null
  );
}

/**
 * Elige una opción de una pregunta. En multi-selección alterna; en las demás reemplaza.
 * Valores fuera de la lista se ignoran (devuelve las mismas respuestas).
 */
export function elegir(r: Respuestas, clave: ClavePregunta, valor: string): Respuestas {
  switch (clave) {
    case "usos": {
      const v = uno(valor, VALORES.usos);
      return v ? { ...r, usos: { ...r.usos, [v]: !r.usos[v] } } : r;
    }
    case "carga": {
      const v = uno(valor, VALORES.carga);
      return v ? { ...r, carga: { ...r.carga, [v]: !r.carga[v] } } : r;
    }
    case "pas": {
      const v = uno(valor, VALORES.pas);
      return v ? { ...r, pas: v } : r;
    }
    case "km": {
      const v = uno(valor, VALORES.km);
      return v ? { ...r, km: v } : r;
    }
    case "trafico": {
      const v = uno(valor, VALORES.trafico);
      return v ? { ...r, trafico: v } : r;
    }
    case "noche": {
      const v = uno(valor, VALORES.noche);
      return v ? { ...r, noche: v } : r;
    }
    case "pres": {
      const v = uno(valor, VALORES.pres);
      return v ? { ...r, pres: v } : r;
    }
  }
}

export function estaElegida(r: Respuestas, clave: ClavePregunta, valor: string): boolean {
  if (clave === "usos") return !!r.usos[valor as Uso];
  if (clave === "carga") return !!r.carga[valor as Carga];
  return r[clave] === valor;
}
