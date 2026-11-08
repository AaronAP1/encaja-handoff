import type { Metadata } from "next";
import { HeaderSimple } from "@/components/SiteHeader";
import { primeraSinResponder, TOTAL_PREGUNTAS } from "@/lib/preguntas";
import { hayPerfil, leerRespuestas } from "@/lib/respuestas";
import { FlujoPreguntas } from "./FlujoPreguntas";

export const metadata: Metadata = { title: "Preguntas de tu vida" };

export default async function PaginaPreguntas({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const r = leerRespuestas(params);
  const pasoUrl = Number(Array.isArray(params.paso) ? params.paso[0] : params.paso);
  const paso =
    Number.isInteger(pasoUrl) && pasoUrl >= 1 && pasoUrl <= TOTAL_PREGUNTAS
      ? pasoUrl - 1
      : hayPerfil(r)
        ? primeraSinResponder(r)
        : 0;

  return (
    <>
      <HeaderSimple lema="Sin registrarte · Ninguna marca paga por aparecer" />
      <FlujoPreguntas inicial={r} pasoInicial={paso} />
    </>
  );
}
