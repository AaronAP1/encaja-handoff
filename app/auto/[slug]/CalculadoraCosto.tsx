"use client";

import { useId, useState } from "react";
import { Card } from "@/components/Card";
import { OptionButton } from "@/components/OptionButton";
import { calcularCostoMensual, PARAMETROS_VACIOS, PLAZOS, soles, type CombustibleCosto, type Plazo } from "@/lib/costo";

interface Props {
  precioUSD: number | null;
  combustibleInicial: CombustibleCosto;
}

/**
 * Calculadora de costo mensual total. Mientras falten precios, tasas y consumos
 * reales, cada concepto se muestra como placeholder "S/ [ ]" (docs/05).
 */
export function CalculadoraCosto({ precioUSD, combustibleInicial }: Props) {
  const [combustible, setCombustible] = useState<CombustibleCosto>(combustibleInicial);
  const [plazo, setPlazo] = useState<Plazo>(48);
  const [km, setKm] = useState("");
  const id = useId();

  const kmMes = km.trim() === "" ? null : Math.max(0, Number(km));
  const costo = calcularCostoMensual(
    { ...PARAMETROS_VACIOS, precioUSD, plazoMeses: plazo, kmMes: Number.isFinite(kmMes) ? kmMes : null },
    combustible,
  );

  return (
    <Card
      as="aside"
      id="costo"
      aria-labelledby={`${id}-titulo`}
      className="box-border flex max-w-full flex-[1_1_340px] scroll-mt-4 flex-col gap-[18px] p-[22px]"
    >
      <h2 id={`${id}-titulo`} className="m-0 text-lg font-semibold">
        ¿Cuánto te cuesta al mes?
      </h2>

      <Card className="flex flex-col gap-0.5 p-[18px]" aria-live="polite">
        <span className="text-[13px] text-texto-2">Total estimado</span>
        <span className="text-4xl font-extrabold tracking-display">{soles(costo.total, "S/ [total]")}</span>
        <span className="text-[13px] text-texto-2">
          con {combustible} y crédito a {plazo} meses
        </span>
      </Card>

      <div className="flex flex-col gap-2">
        <span id={`${id}-fuel`} className="text-[13px] text-texto-2">
          Combustible
        </span>
        <div role="group" aria-labelledby={`${id}-fuel`} className="grid grid-cols-2 gap-2">
          {(["GLP", "Gasolina"] as const).map((c) => (
            <OptionButton key={c} tamano="pill" seleccionado={combustible === c} titulo={c} onClick={() => setCombustible(c)} className="!min-h-11 !text-sm" />
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <span id={`${id}-plazo`} className="text-[13px] text-texto-2">
          Plazo del crédito
        </span>
        <div role="group" aria-labelledby={`${id}-plazo`} className="grid grid-cols-3 gap-2">
          {PLAZOS.map((p) => (
            <OptionButton
              key={p}
              tamano="pill"
              seleccionado={plazo === p}
              titulo={`${p} m`}
              aria-label={`${p} meses`}
              onClick={() => setPlazo(p)}
              className="!min-h-11 !text-sm"
            />
          ))}
        </div>
      </div>

      <label className="flex flex-col gap-2 text-[13px] text-texto-2">
        Kilómetros al mes
        <input
          type="number"
          inputMode="numeric"
          min={0}
          step={100}
          placeholder="Ej. [km]"
          value={km}
          onChange={(e) => setKm(e.target.value)}
          className="min-h-11 rounded-xl border-2 border-borde bg-white px-3 text-[15px] text-asfalto"
        />
      </label>

      <dl className="m-0 flex flex-col">
        {costo.lineas.map((l) => (
          <div key={l.concepto} className="flex items-baseline justify-between gap-3 border-b border-divisor py-2.5">
            <dt className="flex flex-col gap-0.5">
              <span className="text-sm">{l.concepto}</span>
              <span className="text-xs text-texto-2">{l.nota}</span>
            </dt>
            <dd className="m-0 whitespace-nowrap text-sm font-semibold">{soles(l.monto)}</dd>
          </div>
        ))}
      </dl>

      <Card className="flex flex-col gap-1.5 rounded-xl p-3.5">
        <span className="text-sm font-semibold">La tasa cambia mucho el total</span>
        <span className="text-[13px] leading-[1.45]">Compara la TCEA entre bancos antes de firmar.</span>
        {/* PENDIENTE: enlace "Comparar créditos vehiculares". El diseño no define a dónde lleva;
            se agrega cuando exista el destino (no dejar un enlace a "#"). */}
      </Card>
    </Card>
  );
}
