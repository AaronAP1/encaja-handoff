"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { TOTAL_PREGUNTAS } from "@/lib/preguntas";
import { clasesBoton } from "@/components/Button";
import { Card } from "@/components/Card";
import { FotoModelo } from "@/components/FotoModelo";
import { OptionButton } from "@/components/OptionButton";
import { VerdictChip } from "@/components/VerdictChip";
import { reemplazarUrl } from "@/lib/cliente";
import { buscarModelo } from "@/lib/catalogo";
import { alternativas, etiqueta, evaluar, REGLAS, veredictoGeneral } from "@/lib/reglas";
import { consulta } from "@/lib/respuestas";
import type { Dimension, Pasajeros, Respuestas, Uso } from "@/lib/tipos";

const USOS: [Uso, string][] = [
  ["ciudad", "Ciudad"],
  ["carretera", "Carretera"],
  ["trocha", "Trocha"],
  ["sierra", "Sierra"],
];

/** Tres grupos de pasajeros en esta vista; "1–4" equivale a 1-2 o 3-4 del flujo */
const PASAJEROS: { label: string; valor: Pasajeros; incluye: (Pasajeros | null)[] }[] = [
  { label: "1–4", valor: "1-2", incluye: ["1-2", "3-4"] },
  { label: "5", valor: "5", incluye: ["5"] },
  { label: "6–7", valor: "6-7", incluye: ["6-7"] },
];

/** Filas del veredicto de /revisar, en el orden del prototipo */
const DIMENSIONES: Dimension[] = ["ciudad", "carretera", "trocha", "sierra", "pasajeros", "glp"];

export function RevisarModelo({ slug, inicial }: { slug: string; inicial: Respuestas }) {
  const m = buscarModelo(slug)!;
  const [r, setR] = useState(inicial);
  const q = consulta(r);

  useEffect(() => {
    reemplazarUrl(`/revisar/${slug}${q}`);
  }, [slug, q]);

  const filas = DIMENSIONES.filter((d) => REGLAS[d].aplica(r)).map((d) => evaluar(m, d, r));
  const general = veredictoGeneral(filas);
  const alt = alternativas(m, r);
  const idsComparar = [m.slug, ...(alt?.lista.map((a) => a.modelo.slug) ?? [])].join(",");

  return (
    <main className="mx-auto flex max-w-[1240px] flex-col gap-7 px-4 pb-14 pt-9 sm:px-8">
      <div className="flex flex-wrap items-center gap-7">
        <FotoModelo tipo={m.carroceria} slug={m.slug} nombre={m.nombre} leyenda="Foto oficial del modelo" className="min-h-[200px] flex-[0_1_360px] rounded-tarjeta max-sm:flex-[1_1_100%]" />
        <div className="flex flex-[1_1_420px] flex-col gap-2.5">
          <span className="text-[13px] font-semibold text-azul">Ya tienes uno en mente</span>
          <h1 className="m-0 text-[clamp(30px,4vw,46px)] font-extrabold leading-[1.1] tracking-display">
            ¿Te sirve {m.articulo} {m.nombre}?
          </h1>
          <p className="m-0 text-base leading-normal text-texto-2">
            Cuéntanos en tres toques para qué {m.articulo === "el" ? "lo" : "la"} quieres. El veredicto cambia con tus respuestas.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-start gap-7">
        <Card as="section" aria-labelledby="tu-uso" className="box-border flex flex-[1_1_380px] flex-col gap-[22px] p-6">
          <h2 id="tu-uso" className="m-0 text-[17px] font-semibold">
            Tu uso
          </h2>
          <fieldset className="m-0 border-0 p-0">
            <legend className="mb-2.5 p-0 text-sm font-semibold">¿Por dónde vas a manejar?</legend>
            <div className="grid grid-cols-2 gap-2">
              {USOS.map(([u, label]) => (
                <OptionButton
                  key={u}
                  tamano="pill"
                  titulo={label}
                  seleccionado={!!r.usos[u]}
                  onClick={() => setR((x) => ({ ...x, usos: { ...x.usos, [u]: !x.usos[u] } }))}
                />
              ))}
            </div>
          </fieldset>
          <fieldset className="m-0 border-0 p-0">
            <legend className="mb-2.5 p-0 text-sm font-semibold">¿Cuántos viajan normalmente?</legend>
            <div className="grid grid-cols-3 gap-2">
              {PASAJEROS.map((p) => (
                <OptionButton
                  key={p.label}
                  tamano="pill"
                  titulo={p.label}
                  aria-label={`${p.label} pasajeros`}
                  seleccionado={p.incluye.includes(r.pas)}
                  onClick={() => setR((x) => ({ ...x, pas: p.incluye.includes(x.pas) ? x.pas : p.valor }))}
                />
              ))}
            </div>
          </fieldset>
          <fieldset className="m-0 border-0 p-0">
            <legend className="mb-2.5 p-0 text-sm font-semibold">¿Piensas convertirlo a GLP?</legend>
            <div className="grid grid-cols-2 gap-2">
              <OptionButton tamano="pill" titulo="Sí" seleccionado={r.comb === "glp"} onClick={() => setR((x) => ({ ...x, comb: "glp" }))} />
              <OptionButton tamano="pill" titulo="No" seleccionado={r.comb === "gasolina"} onClick={() => setR((x) => ({ ...x, comb: "gasolina" }))} />
            </div>
          </fieldset>
          <Link href={`/preguntas${q}`} className="flex min-h-11 items-center self-start text-sm font-semibold">
            Prefiero responder las {TOTAL_PREGUNTAS} preguntas completas
          </Link>
        </Card>

        <section aria-live="polite" aria-label="Veredicto para tu uso" className="flex min-w-0 flex-[999_1_560px] flex-col gap-4">
          <Card className="flex flex-col gap-1.5 p-6" style={{ borderTop: `8px solid ${filas.length ? general.color : "#D5D8DD"}` }}>
            <span className="text-[13px] text-texto-2">Veredicto para tu uso</span>
            {filas.length ? (
              <>
                <span className="text-[clamp(24px,3vw,34px)] font-extrabold leading-[1.15]">{general.titulo}</span>
                <span className="text-[15px] leading-normal text-texto-2">{general.resumen}</span>
              </>
            ) : (
              <span className="text-xl font-semibold leading-[1.3]">Marca tu uso y aquí aparece el veredicto.</span>
            )}
          </Card>

          {filas.length ? (
            <Card className="px-5 py-2">
              <ul className="m-0 list-none p-0">
                {filas.map((f) => (
                  <li key={f.dimension} className="flex items-start gap-3.5 border-b border-divisor py-3.5 last:border-b-0">
                    <VerdictChip nivel={f.veredicto?.nivel ?? null} className="min-w-[78px] justify-center" />
                    <div className="flex flex-col gap-1">
                      <span className="text-[15px] font-semibold">{etiqueta(f.dimension, "revisar", r)}</span>
                      <span className="text-sm leading-normal text-[#33373E]">
                        {f.veredicto?.porque ?? "[Dato pendiente de la ficha oficial Perú]"}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}

          {alt ? (
            <Card className="flex flex-col gap-3.5 p-5">
              <h2 className="m-0 text-base font-semibold">{alt.titulo}</h2>
              <div className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-3">
                {alt.lista.map((a) => (
                  <Link
                    key={a.modelo.slug}
                    href={`/auto/${a.modelo.slug}${q}`}
                    className="flex items-center gap-3 rounded-tarjeta border-2 border-borde p-3.5 text-asfalto no-underline hover:border-azul hover:text-asfalto"
                  >
                    <FotoModelo tipo={a.modelo.carroceria} slug={a.modelo.slug} nombre={a.modelo.nombre} className="h-12 w-[72px] shrink-0 rounded-letrero !p-1" />
                    <span className="flex flex-col gap-1">
                      <span className="text-[15px] font-semibold">{a.modelo.nombre}</span>
                      <span className="text-[13px] text-texto-2">{a.por}</span>
                    </span>
                  </Link>
                ))}
              </div>
            </Card>
          ) : null}

          <div className="flex flex-wrap gap-2.5">
            <Link href={`/auto/${m.slug}${q}#costo`} className={clasesBoton("primario", "lg", "flex-[1_1_200px] !rounded-tarjeta !text-[15px] !font-semibold")}>
              Ver costo mensual
            </Link>
            <Link
              href={`/comparar${consulta(r, { ids: idsComparar.includes(",") ? idsComparar : undefined })}`}
              className={clasesBoton("secundario", "lg", "flex-[1_1_200px] !rounded-tarjeta !text-[15px] !font-semibold !text-asfalto")}
            >
              Comparar con otras opciones
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
