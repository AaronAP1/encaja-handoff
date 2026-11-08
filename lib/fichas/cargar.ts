import type { Modelo } from "../tipos";
import type { FichaModelo, Precio } from "./esquema";

/**
 * Convierte una ficha (data/modelos/*.json) y la lista de precios en el `Modelo`
 * que usa el motor de reglas.
 *
 * - Los veredictos se calculan con la versión de referencia (`versionReferencia`).
 * - El precio "Desde" es el menor precio conocido entre todas las versiones.
 */
export function aModelo(f: FichaModelo, precios: readonly Precio[]): Modelo {
  const ref = f.versiones.find((v) => v.id === f.versionReferencia);
  if (!ref) throw new Error(`${f.slug}: versionReferencia "${f.versionReferencia}" no existe`);

  const precioDe = (version: string) => precios.find((p) => p.modelo === f.slug && p.version === version);
  const versiones = f.versiones.map((v) => ({
    id: v.id,
    nombre: v.nombre,
    transmision: v.transmision,
    precioListaUSD: precioDe(v.id)?.precioListaUSD ?? null,
  }));
  const conocidos = versiones.flatMap((v) => (v.precioListaUSD === null ? [] : [v.precioListaUSD]));

  return {
    slug: f.slug,
    marca: f.marca,
    nombre: f.nombre,
    articulo: f.articulo,
    version: ref.nombre,
    carroceria: f.carroceria,
    precioListaUSD: conocidos.length ? Math.min(...conocidos) : null,
    asientos: ref.asientos,
    terceraFila: ref.terceraFila,
    motor: { ...ref.motor },
    transmision: ref.transmision,
    traccion: ref.traccion,
    alturaPisoMm: ref.alturaPisoMm,
    maleteroLitros: { ...ref.maleteroLitros },
    glpCompatible: ref.glpCompatible,
    seguridad: { ...ref.seguridad },
    redTalleresRegiones: f.redTalleresRegiones.valor,
    rangoCostoMensual: precioDe(ref.id)?.rangoCostoMensual ?? null,
    motorResumen: f.textos.motorResumen,
    resumen: f.textos.resumen,
    destaca: f.textos.destaca,
    rasgoCorto: f.textos.rasgoCorto,
    editorial: { ...f.evaluacionEditorial },
    vidaReal: f.vidaReal ? f.vidaReal.map((p) => ({ ...p })) : null,
    fuente: { url: ref.fuente.url, fecha: ref.fuente.fecha },
    versiones,
  };
}
