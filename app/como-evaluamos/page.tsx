import type { Metadata } from "next";
import contenido from "@/data/landing-contenido.json";
import { Card } from "@/components/Card";
import { HeaderNav } from "@/components/SiteHeader";
import { SignalIcon } from "@/components/SignalIcon";
import { CATALOGO } from "@/lib/catalogo";
import { etiqueta, ORDEN_DIMENSIONES, REGLAS } from "@/lib/reglas";
import type { Nivel } from "@/lib/tipos";

export const metadata: Metadata = { title: "Cómo evaluamos" };

/**
 * Metodología pública (docs/03: "por crear"). Se arma con las mismas reglas que usa el
 * motor (lib/reglas.ts), así lo publicado y lo calculado no se separan.
 * BORRADOR: textos de criterio por revisar con el dueño del producto.
 */
export default function PaginaComoEvaluamos() {
  return (
    <>
      <HeaderNav activo="evaluamos" hrefs={{ encontrar: "/resultados", comparar: "/comparar", costo: `/auto/${CATALOGO[0]!.slug}#costo` }} />
      <main className="mx-auto flex max-w-[1000px] flex-col gap-10 px-4 pb-16 pt-10 sm:px-8">
        <div className="flex flex-col gap-4">
          <h1 className="m-0 text-[clamp(32px,4.6vw,56px)] font-black leading-[0.98] tracking-display text-azul">
            Ninguna marca paga por aparecer. Ni por subir en el ranking.
          </h1>
          <p className="m-0 max-w-[60ch] text-lg leading-[1.55] text-texto-2">
            Nuestras evaluaciones siguen reglas públicas, basadas en fichas oficiales de los modelos vendidos en Perú. Si encuentras un dato
            incorrecto, lo corregimos.
          </p>
        </div>

        <section aria-labelledby="senales" className="flex flex-col gap-4">
          <h2 id="senales" className="m-0 text-[clamp(26px,3vw,34px)] font-black tracking-display">
            Tres señales
          </h2>
          <ul className="m-0 flex list-none flex-wrap gap-x-6 gap-y-3 p-0">
            {contenido.leyendaVeredictos.map((l) => (
              <li key={l.nivel} className="flex items-center gap-2.5 text-[17px]">
                <SignalIcon nivel={l.nivel as Nivel} />
                <span>
                  <strong>{l.nivel}</strong> {l.significa}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="reglas" className="flex flex-col gap-4">
          <h2 id="reglas" className="m-0 text-[clamp(26px,3vw,34px)] font-black tracking-display">
            Las reglas, una por una
          </h2>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-3">
            {ORDEN_DIMENSIONES.map((d) => (
              <Card key={d} className="flex flex-col gap-2 p-5">
                <h3 className="m-0 text-base font-semibold">{d === "pasajeros" ? "Pasajeros" : etiqueta(d, "revisar")}</h3>
                <ul className="m-0 flex flex-col gap-1.5 pl-5 text-sm leading-normal text-texto-2">
                  {REGLAS[d].criterio.map((c) => (
                    <li key={c}>{c}</li>
                  ))}
                </ul>
              </Card>
            ))}
          </div>
          <p className="m-0 text-sm text-texto-2">
            Los umbrales (altura al piso, talleres en regiones) se validan con mecánicos y conductores de provincia antes de publicarse.
          </p>
        </section>

        <section aria-labelledby="costo" className="flex flex-col gap-3">
          <h2 id="costo" className="m-0 text-[clamp(26px,3vw,34px)] font-black tracking-display">
            Costo mensual total
          </h2>
          <p className="m-0 max-w-[60ch] text-base leading-[1.55] text-texto-2">
            Cuota del crédito, combustible (GLP o gasolina), seguro vehicular, mantenimiento, SOAT prorrateado y, si aplica, cochera y
            peajes. Siempre es una estimación: la TCEA cambia mucho el total.
          </p>
        </section>
      </main>
    </>
  );
}
