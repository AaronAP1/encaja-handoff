import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ButtonLink } from "@/components/Button";
import { Card } from "@/components/Card";
import { FotoModelo } from "@/components/CarSilhouette";
import { HeaderNav } from "@/components/SiteHeader";
import { VerdictChip } from "@/components/VerdictChip";
import { buscarModelo, CATALOGO, fichaTecnica, precioTexto, transmisionTexto } from "@/lib/catalogo";
import { evaluarPerfil, fraseParaTi, puntosVidaReal, resultados } from "@/lib/reglas";
import { consulta, hayPerfil, leerRespuestas } from "@/lib/respuestas";
import { CalculadoraCosto } from "./CalculadoraCosto";

type Params = { slug: string };
type Busqueda = Record<string, string | string[] | undefined>;

export function generateStaticParams() {
  return CATALOGO.map((m) => ({ slug: m.slug }));
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const m = buscarModelo((await params).slug);
  return { title: m ? m.nombre : "Modelo no encontrado" };
}

export default async function PaginaAuto({ params, searchParams }: { params: Promise<Params>; searchParams: Promise<Busqueda> }) {
  const m = buscarModelo((await params).slug);
  if (!m) notFound();
  const r = leerRespuestas(await searchParams);
  const q = consulta(r);
  const conPerfil = hayPerfil(r);

  const lista = resultados(r);
  const posicion = lista.findIndex((x) => x.modelo.slug === m.slug);
  const frase = conPerfil ? fraseParaTi(evaluarPerfil(m, r), r) : null;
  const puntos = puntosVidaReal(m, r);
  const ficha = fichaTecnica(m);
  const otros = lista.filter((x) => x.modelo.slug !== m.slug).slice(0, 2).map((x) => x.modelo.slug);
  const hrefComparar = `/comparar${consulta(r, { ids: [m.slug, ...otros].join(",") })}`;

  const fichaLista = (
    <dl className="m-0 grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-x-5 gap-y-3.5 text-sm">
      {ficha.map((f) => (
        <div key={f.etiqueta}>
          <dt className="text-xs text-texto-2">{f.etiqueta}</dt>
          <dd className="m-0 mt-0.5">{f.valor}</dd>
        </div>
      ))}
    </dl>
  );

  return (
    <>
      <HeaderNav activo="costo" hrefs={{ encontrar: `/resultados${q}`, comparar: hrefComparar, costo: `/auto/${m.slug}${q}#costo` }} />

      <div className="mx-auto flex max-w-[1240px] flex-col gap-7 px-4 pb-14 pt-7 sm:px-8">
        <Link href={`/resultados${q}`} className="flex min-h-11 items-center gap-1.5 self-start text-sm text-texto-2 no-underline hover:text-azul-oscuro">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M15 18l-6-6 6-6" />
          </svg>
          Volver a tus opciones
        </Link>

        <div className="flex flex-wrap items-stretch gap-7">
          <FotoModelo tipo={m.carroceria} leyenda="Foto oficial del modelo" className="min-h-[190px] flex-[1_1_420px] rounded-tarjeta sm:min-h-[280px]" />
          <div className="flex flex-[1_1_420px] flex-col justify-center gap-3.5">
            {conPerfil && posicion >= 0 ? (
              <span className="text-sm text-texto-2">
                Opción {posicion + 1} de {lista.length} para tu perfil
              </span>
            ) : null}
            <h1 className="m-0 text-[clamp(28px,4vw,44px)] font-extrabold tracking-display">{m.nombre}</h1>
            <span className="text-base text-texto-2">
              Desde {precioTexto(m)} · {m.asientos} asientos · {m.motor.litros} L · {transmisionTexto(m)}
            </span>
            <Card className="flex flex-col gap-1.5 rounded-2xl p-[18px]">
              <span className="text-[13px] text-texto-2">Veredicto para ti</span>
              {frase ? (
                <span className="text-lg font-semibold leading-[1.35]">{frase}</span>
              ) : conPerfil ? (
                <span className="text-lg font-semibold leading-[1.35]">No encaja con lo que marcaste.</span>
              ) : (
                <Link href="/preguntas" className="text-lg font-semibold leading-[1.35]">
                  Responde las preguntas para ver el veredicto para tu uso
                </Link>
              )}
            </Card>
          </div>
        </div>

        <div className="flex flex-wrap items-start gap-7">
          <main className="flex min-w-0 flex-[999_1_560px] flex-col gap-6">
            <section className="flex flex-col gap-3" aria-labelledby="vida-real">
              <h2 id="vida-real" className="m-0 text-xl font-semibold">
                En tu vida real
              </h2>
              <div className="grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-3">
                {puntos.map((p) => (
                  <Card key={p.titulo} className="flex flex-col gap-2 p-4">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="m-0 text-[15px] font-semibold">{p.titulo}</h3>
                      <VerdictChip nivel={p.nivel} />
                    </div>
                    <p className="m-0 text-sm leading-normal text-[#33373E]">{p.texto}</p>
                  </Card>
                ))}
              </div>
            </section>

            {/* Lo técnico siempre está, pero en segundo plano: plegado en móvil */}
            <Card as="section" className="hidden flex-col gap-3 rounded-2xl p-5 md:flex" aria-labelledby="ficha">
              <h2 id="ficha" className="m-0 text-base font-semibold">
                Ficha técnica
              </h2>
              {fichaLista}
            </Card>
            <Card as="details" className="group md:hidden">
              <summary className="flex min-h-[52px] cursor-pointer list-none items-center justify-between px-3.5 text-[15px] font-semibold [&::-webkit-details-marker]:hidden">
                <span>Ficha técnica completa</span>
                <span className="text-[13px] font-medium text-texto-2">
                  <span className="group-open:hidden">Ver</span>
                  <span className="hidden group-open:inline">Ocultar</span>
                </span>
              </summary>
              <div className="px-3.5 pb-3.5">{fichaLista}</div>
            </Card>

            <div className="grid grid-cols-2 gap-2.5 md:hidden">
              <ButtonLink href={hrefComparar} variante="secundario" className="!rounded-tarjeta !font-semibold !text-asfalto">
                Comparar
              </ButtonLink>
              <ButtonLink href="#costo" className="!rounded-tarjeta !font-semibold">
                Costo mensual
              </ButtonLink>
            </div>
          </main>

          <CalculadoraCosto
            precioUSD={m.precioListaUSD}
            combustibleInicial={r.comb === "gasolina" ? "Gasolina" : "GLP"}
          />
        </div>
      </div>
    </>
  );
}
