/**
 * Costo mensual total (docs/04-logica.md → Costo mensual total).
 * Cuota + combustible + seguro + mantenimiento + SOAT/12 + cochera y peajes (opcional).
 * Siempre es una ESTIMACIÓN: ningún monto se inventa; si falta un dato, el concepto
 * queda en null y la interfaz muestra el placeholder "S/ [ ]".
 */

export type CombustibleCosto = "GLP" | "Gasolina";
export type Plazo = 36 | 48 | 60;
export const PLAZOS: readonly Plazo[] = [36, 48, 60];

export interface ParametrosCosto {
  /** Precio de lista en dólares */
  precioUSD: number | null;
  /** Soles por dólar */
  tipoCambio: number | null;
  /** Porcentaje de inicial, 0–1 */
  inicial: number | null;
  plazoMeses: Plazo;
  /** Tasa de costo efectivo anual, 0–1 */
  tcea: number | null;
  kmMes: number | null;
  rendimientoGasolinaKmGalon: number | null;
  rendimientoGlpKmLitro: number | null;
  precioGasolinaGalon: number | null;
  precioGlpLitro: number | null;
  costoConversionGlp: number | null;
  /** En cuántos meses se prorratea la conversión */
  mesesProrrateoConversion: number | null;
  seguroAnual: number | null;
  costoServicio: number | null;
  /** Servicios oficiales cada N km */
  kmEntreServicios: number;
  soatAnual: number | null;
  /** Opcional: si es null no bloquea el total */
  cocheraPeajesMes: number | null;
}

export const PARAMETROS_VACIOS: ParametrosCosto = {
  precioUSD: null,
  tipoCambio: null,
  inicial: null,
  plazoMeses: 48,
  tcea: null,
  kmMes: null,
  rendimientoGasolinaKmGalon: null,
  rendimientoGlpKmLitro: null,
  precioGasolinaGalon: null,
  precioGlpLitro: null,
  costoConversionGlp: null,
  mesesProrrateoConversion: null,
  seguroAnual: null,
  costoServicio: null,
  kmEntreServicios: 5000,
  soatAnual: null,
  cocheraPeajesMes: null,
};

export interface LineaCosto {
  concepto: string;
  nota: string;
  monto: number | null;
  opcional?: boolean;
}

export interface CostoMensual {
  lineas: LineaCosto[];
  /** null mientras falte algún concepto obligatorio */
  total: number | null;
}

/** Cuota de un crédito francés con tasa mensual equivalente a la TCEA */
export function cuotaMensual(montoFinanciado: number, tcea: number, meses: number): number {
  if (montoFinanciado <= 0) return 0;
  const i = Math.pow(1 + tcea, 1 / 12) - 1;
  if (i === 0) return montoFinanciado / meses;
  return (montoFinanciado * i) / (1 - Math.pow(1 + i, -meses));
}

function todos(...xs: (number | null)[]): boolean {
  return xs.every((x) => x !== null && Number.isFinite(x));
}

export function calcularCostoMensual(p: ParametrosCosto, combustible: CombustibleCosto): CostoMensual {
  const cuota = todos(p.precioUSD, p.tipoCambio, p.inicial, p.tcea)
    ? cuotaMensual(p.precioUSD! * p.tipoCambio! * (1 - p.inicial!), p.tcea!, p.plazoMeses)
    : null;

  let gasto: number | null = null;
  if (combustible === "GLP") {
    if (todos(p.kmMes, p.rendimientoGlpKmLitro, p.precioGlpLitro, p.costoConversionGlp, p.mesesProrrateoConversion)) {
      gasto = (p.kmMes! / p.rendimientoGlpKmLitro!) * p.precioGlpLitro! + p.costoConversionGlp! / p.mesesProrrateoConversion!;
    }
  } else if (todos(p.kmMes, p.rendimientoGasolinaKmGalon, p.precioGasolinaGalon)) {
    gasto = (p.kmMes! / p.rendimientoGasolinaKmGalon!) * p.precioGasolinaGalon!;
  }

  const seguro = p.seguroAnual !== null ? p.seguroAnual / 12 : null;
  const mantenimiento = todos(p.kmMes, p.costoServicio) ? (p.kmMes! / p.kmEntreServicios) * p.costoServicio! : null;
  const soat = p.soatAnual !== null ? p.soatAnual / 12 : null;

  const glp = combustible === "GLP";
  const lineas: LineaCosto[] = [
    { concepto: "Cuota del crédito", nota: "Según inicial, plazo y TCEA", monto: cuota },
    {
      concepto: glp ? "Combustible (GLP)" : "Combustible (gasolina)",
      nota: glp ? "Precio GLP de tu zona + conversión prorrateada" : "Precio gasohol de tu zona",
      monto: gasto,
    },
    { concepto: "Seguro vehicular", nota: "Obligatorio si es con crédito", monto: seguro },
    { concepto: "Mantenimiento", nota: `Servicios oficiales cada ${p.kmEntreServicios.toLocaleString("en-US")} km`, monto: mantenimiento },
    { concepto: "SOAT (prorrateado)", nota: "Pago anual dividido entre 12", monto: soat },
    { concepto: "Cochera y peajes", nota: "Opcional, si aplica", monto: p.cocheraPeajesMes, opcional: true },
  ];

  const obligatorias = lineas.filter((l) => !l.opcional).map((l) => l.monto);
  const total = todos(...obligatorias)
    ? obligatorias.reduce<number>((s, x) => s + (x ?? 0), 0) + (p.cocheraPeajesMes ?? 0)
    : null;
  return { lineas, total };
}

/** "S/ 1,234" o el placeholder que corresponda */
export function soles(monto: number | null, placeholder = "S/ [ ]"): string {
  if (monto === null) return placeholder;
  return `S/ ${Math.round(monto).toLocaleString("en-US")}`;
}
