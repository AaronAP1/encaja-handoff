import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { clasesBoton } from "@/components/Button";
import { Card } from "@/components/Card";
import { HeaderSimple } from "@/components/SiteHeader";
import { consulta } from "@/lib/respuestas";
import { buscarSituacion, respuestasDeSituacion, SITUACIONES } from "@/lib/situaciones";

type Params = { slug: string };

export function generateStaticParams() {
  return SITUACIONES.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const s = buscarSituacion((await params).slug);
  return { title: s ? s.nombre : "Empieza por tu situación" };
}

export default async function PaginaSituacion({ params }: { params: Promise<Params> }) {
  const s = buscarSituacion((await params).slug);
  if (!s) notFound();
  const q = consulta(respuestasDeSituacion(s.slug));

  return (
    <>
      <HeaderSimple lema="Sin registrarte · Nadie te va a llamar" />
      <main className="mx-auto flex max-w-[1240px] flex-col gap-7 px-4 pb-14 pt-9 sm:px-8">
        <nav aria-label="Tu situación">
          <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
            {SITUACIONES.map((x) => {
              const activa = x.slug === s.slug;
              return (
                <li key={x.slug}>
                  <Link
                    href={`/situacion/${x.slug}`}
                    aria-current={activa ? "page" : undefined}
                    className={`flex min-h-12 items-center rounded-full border-2 px-5 text-[15px] font-semibold no-underline ${
                      activa ? "border-azul bg-azul text-white hover:text-white" : "border-borde bg-white text-asfalto hover:border-azul hover:text-asfalto"
                    }`}
                  >
                    {x.nombre}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="flex flex-wrap items-end gap-8">
          <div className="flex flex-[1_1_560px] flex-col gap-3">
            <h1 className="m-0 text-[clamp(30px,4.2vw,50px)] font-extrabold leading-[1.08] tracking-display">{s.titulo}</h1>
            <p className="m-0 max-w-[680px] text-[17px] leading-[1.55] text-texto-2">{s.intro}</p>
          </div>
          <Card className="flex flex-[0_1_340px] flex-col gap-2.5 p-[18px]">
            <span className="text-[13px] text-texto-2">Tipos de auto que suelen encajar</span>
            <ul className="m-0 flex list-none flex-wrap gap-1.5 p-0">
              {s.tipos.map((t) => (
                <li key={t} className="rounded-full bg-azul px-3 py-1.5 text-sm font-semibold text-white">
                  {t}
                </li>
              ))}
            </ul>
          </Card>
        </div>

        <section className="flex flex-col gap-3.5" aria-labelledby="importa">
          <h2 id="importa" className="m-0 text-xl font-semibold">
            Lo que más importa en tu caso
          </h2>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(250px,1fr))] gap-3">
            {s.importa.map((i) => (
              <Card key={i.n} className="flex flex-col gap-2 p-5">
                <span className="text-2xl font-extrabold text-azul" aria-hidden="true">
                  {i.n}
                </span>
                <h3 className="m-0 text-base font-semibold">{i.titulo}</h3>
                <p className="m-0 text-sm leading-normal text-texto-2">{i.texto}</p>
              </Card>
            ))}
          </div>
        </section>

        <Card as="section" aria-labelledby="errores" className="flex flex-col gap-3 px-6 py-[22px]">
          <h2 id="errores" className="m-0 text-[17px] font-semibold">
            Errores comunes en tu situación
          </h2>
          <ul className="m-0 flex flex-col gap-2 pl-5 text-[15px] leading-normal">
            {s.errores.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        </Card>

        <Card as="section" className="flex flex-wrap items-center justify-between gap-5 rounded-[22px] p-7">
          <div className="flex flex-[1_1_420px] flex-col gap-1.5">
            <span className="text-xl font-semibold">Ya sabemos {s.yaSabemos}.</span>
            <span className="text-[15px] text-texto-2">Te faltan {s.faltan} preguntas para ver los modelos que encajan contigo.</span>
          </div>
          <div className="flex flex-wrap gap-2.5">
            <Link href={`/preguntas${q}`} className={clasesBoton("primario", "lg", "!min-h-[52px] !rounded-tarjeta !text-[15px] !font-semibold")}>
              Seguir · {s.faltan} preguntas
            </Link>
            <Link href={`/resultados${q}`} className={clasesBoton("secundario", "lg", "!min-h-[52px] !rounded-tarjeta !text-[15px] !font-semibold")}>
              Ver ejemplos ya
            </Link>
          </div>
        </Card>
      </main>
    </>
  );
}
