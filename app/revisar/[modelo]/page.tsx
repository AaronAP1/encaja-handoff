import type { Metadata } from "next";
import Link from "next/link";
import { BuscadorModelo } from "@/components/BuscadorModelo";
import { Card } from "@/components/Card";
import { Logo } from "@/components/SiteHeader";
import { buscarModelo, buscarPorTexto, CATALOGO } from "@/lib/catalogo";
import { TOTAL_PREGUNTAS } from "@/lib/preguntas";
import { leerRespuestas } from "@/lib/respuestas";
import { RevisarModelo } from "./RevisarModelo";

type Params = { modelo: string };

function resolver(param: string) {
  const texto = decodeURIComponent(param);
  return buscarModelo(texto) ?? buscarPorTexto(texto.replace(/-/g, " "));
}

export function generateStaticParams() {
  return CATALOGO.map((m) => ({ modelo: m.slug }));
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const m = resolver((await params).modelo);
  return { title: m ? `¿Te sirve ${m.articulo} ${m.nombre}?` : "¿Te sirve este auto?" };
}

export default async function PaginaRevisar({
  params,
  searchParams,
}: {
  params: Promise<Params>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { modelo } = await params;
  const m = resolver(modelo);
  const r = leerRespuestas(await searchParams);

  return (
    <>
      <header className="border-b border-borde bg-white">
        <div className="mx-auto box-border flex min-h-16 max-w-[1240px] flex-wrap items-center gap-x-6 gap-y-3 px-4 py-3 sm:px-8">
          <Logo />
          <BuscadorModelo variante="header" valorInicial={m?.nombre ?? decodeURIComponent(modelo).replace(/-/g, " ")} />
          <span className="text-[13px] text-texto-2">Nadie te va a llamar</span>
        </div>
      </header>

      {m ? (
        <RevisarModelo slug={m.slug} inicial={r} />
      ) : (
        <main className="mx-auto flex max-w-[1240px] flex-col gap-5 px-4 pb-14 pt-9 sm:px-8">
          <h1 className="m-0 text-[clamp(28px,4vw,40px)] font-extrabold tracking-display">Aún no evaluamos ese modelo</h1>
          <p className="m-0 max-w-[60ch] text-base leading-normal text-texto-2">
            Estamos sumando modelos al catálogo. Por ahora puedes revisar estos:
          </p>
          <ul className="m-0 grid list-none grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-3 p-0">
            {CATALOGO.map((x) => (
              <li key={x.slug}>
                <Card as={Link} href={`/revisar/${x.slug}`} className="flex min-h-14 items-center p-4 text-base font-semibold text-asfalto no-underline">
                  {x.nombre}
                </Card>
              </li>
            ))}
          </ul>
          <Link href="/preguntas" className="flex min-h-11 items-center self-start text-sm font-semibold">
            Prefiero responder las {TOTAL_PREGUNTAS} preguntas completas
          </Link>
        </main>
      )}
    </>
  );
}
