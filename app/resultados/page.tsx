import type { Metadata } from "next";
import { CATALOGO } from "@/lib/catalogo";
import { leerRespuestas } from "@/lib/respuestas";
import { Resultados } from "./Resultados";

export const metadata: Metadata = { title: "Tus opciones" };

export default async function PaginaResultados({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const cmp = typeof params.cmp === "string" ? params.cmp.split(",").filter((s) => CATALOGO.some((m) => m.slug === s)) : null;
  return <Resultados inicial={leerRespuestas(params)} compararInicial={cmp} />;
}
