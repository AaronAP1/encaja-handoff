import type { Metadata } from "next";
import { HeaderNav } from "@/components/SiteHeader";
import { CATALOGO } from "@/lib/catalogo";
import { FICHAS_MINIMAS, resumenesPorModelo } from "@/lib/fichas-minimas";
import { enumerar, MARCAS_PENDIENTES, MERCADO, ORDEN_TIPOS, totalModelos, type TipoMercado } from "@/lib/mercado";
import { ListaModelos } from "./ListaModelos";

export const metadata: Metadata = {
  title: "Todos los modelos",
  description: "Los modelos que cada marca vende en Perú, por tipo: SUV, sedán, hatchback, minivan, pick-up y van.",
};

export default async function PaginaModelos({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const uno = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
  const tipo = ORDEN_TIPOS.find((t) => t === uno(params.tipo)) ?? null;
  const fechas = [...new Set(MERCADO.marcas.map((m) => m.fuente.fecha))].sort();
  const porConcesionario = MERCADO.marcas.filter((m) => m.fuente.tipo === "concesionario").map((m) => m.marca);

  return (
    <>
      <HeaderNav
        activo="modelos"
        hrefs={{ encontrar: "/resultados", comparar: "/comparar", costo: `/auto/${CATALOGO[0]!.slug}#costo` }}
      />
      <main className="mx-auto flex max-w-[1240px] flex-col gap-7 px-4 pb-16 pt-10 sm:px-8">
        <div className="flex max-w-[760px] flex-col gap-2">
          <h1 className="m-0 text-[clamp(28px,4vw,44px)] font-black leading-[1.05] tracking-display">Todos los modelos</h1>
          <p className="m-0 text-[17px] leading-normal text-texto-2">
            {totalModelos()} modelos de {MERCADO.marcas.length} marcas que se venden en Perú, según el sitio oficial de cada
            marca. Los marcados como <strong className="text-asfalto">Evaluado</strong> ya tienen veredicto para tu uso; el resto
            lo estamos sumando.
          </p>
        </div>

        <ListaModelos
          marcas={MERCADO.marcas}
          fichas={resumenesPorModelo()}
          tipoInicial={tipo as TipoMercado | null}
          busquedaInicial={uno(params.q).slice(0, 60)}
        />

        <p className="m-0 max-w-[80ch] text-xs leading-normal text-texto-2">
          Lista consultada el {fechas.length > 1 ? `${fechas[0]} y el ${fechas.at(-1)}` : fechas[0]}. No incluye camiones.{" "}
          {porConcesionario.length
            ? `Para ${enumerar(porConcesionario)} la lista sale de un concesionario multimarca, porque su sitio no se pudo consultar. `
            : ""}
          Aún no están {enumerar(MARCAS_PENDIENTES, "ni")}. Los {FICHAS_MINIMAS.length} modelos marcados «Con ficha» muestran para
          qué usos van según los criterios de Cómo evaluamos, con datos de su ficha oficial; la altura mínima para trocha (200 mm)
          es provisional. Nombres y tipos son los que publica cada marca; los precios se muestran solo en los modelos evaluados.
        </p>
      </main>
    </>
  );
}
