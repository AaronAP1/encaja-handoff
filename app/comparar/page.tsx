import type { Metadata } from "next";
import { HeaderNav } from "@/components/SiteHeader";
import { buscarModelo, potenciaCorta, precioTexto, traccionTexto, transmisionTexto } from "@/lib/catalogo";
import { resumenPerfil } from "@/lib/perfil";
import { DIMENSIONES_COMPARAR, etiqueta, evaluar, recomendacion, resultados } from "@/lib/reglas";
import { consulta, leerRespuestas } from "@/lib/respuestas";
import type { Modelo } from "@/lib/tipos";
import { TablaComparar, type FilaComparar } from "./TablaComparar";

export const metadata: Metadata = { title: "Comparar" };

const MAX_MODELOS = 4;

export default async function PaginaComparar({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const r = leerRespuestas(params);
  const q = consulta(r);

  const pedidos = (typeof params.ids === "string" ? params.ids.split(",") : [])
    .map((s) => buscarModelo(s.trim()))
    .filter((m): m is Modelo => !!m);
  const unicos = [...new Map(pedidos.map((m) => [m.slug, m])).values()];
  const modelos = (unicos.length >= 2 ? unicos : resultados(r).map((x) => x.modelo)).slice(0, MAX_MODELOS);

  const filas: FilaComparar[] = [
    { tipo: "grupo", label: "Para tu uso" },
    ...DIMENSIONES_COMPARAR.map((d) => ({
      tipo: "fila" as const,
      label: etiqueta(d, "comparar", r),
      celdas: modelos.map((m) => ({ veredicto: true, nivel: evaluar(m, d, r).veredicto?.nivel ?? null, texto: "" })),
    })),
    { tipo: "grupo", label: "Costo" },
    { tipo: "fila", label: "Precio desde", celdas: modelos.map((m) => ({ veredicto: false, nivel: null, texto: m.precioListaUSD ? precioTexto(m) : "US$ [ ]" })) },
    { tipo: "fila", label: "Total mensual estimado", celdas: modelos.map(() => ({ veredicto: false, nivel: null, texto: "S/ [ ]" })) },
    { tipo: "grupo", label: "Técnico" },
    { tipo: "fila", label: "Motor", celdas: modelos.map((m) => ({ veredicto: false, nivel: null, texto: `${m.motor.litros} L` })) },
    { tipo: "fila", label: "Potencia", celdas: modelos.map((m) => ({ veredicto: false, nivel: null, texto: potenciaCorta(m) })) },
    { tipo: "fila", label: "Transmisión", celdas: modelos.map((m) => ({ veredicto: false, nivel: null, texto: transmisionTexto(m) })) },
    { tipo: "fila", label: "Tracción", celdas: modelos.map((m) => ({ veredicto: false, nivel: null, texto: traccionTexto(m) })) },
  ];

  const rec = recomendacion(modelos, r);
  const perfil = resumenPerfil(r);
  const primero = modelos[0]?.slug;

  return (
    <>
      <HeaderNav
        activo="comparar"
        hrefs={{
          encontrar: `/resultados${q}`,
          comparar: `/comparar${consulta(r, { ids: modelos.map((m) => m.slug).join(",") })}`,
          costo: primero ? `/auto/${primero}${q}#costo` : "/resultados",
        }}
      />
      <div className="mx-auto flex max-w-[1240px] flex-col gap-6 px-4 pb-14 pt-9 sm:px-8">
        <TablaComparar
          modelos={modelos.map((m) => ({ slug: m.slug, nombre: m.nombre, carroceria: m.carroceria, href: `/auto/${m.slug}${q}` }))}
          filas={filas}
          perfil={perfil.join(" · ")}
          recomendacion={rec}
        />
        <p className="m-0 text-xs text-texto-2">Datos entre corchetes se completan con la ficha oficial de cada versión vendida en Perú.</p>
      </div>
    </>
  );
}
