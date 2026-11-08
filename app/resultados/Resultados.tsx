"use client";

import Link from "next/link";
import { useEffect, useId, useMemo, useState } from "react";
import { Button, clasesBoton } from "@/components/Button";
import { Card } from "@/components/Card";
import { FotoModelo } from "@/components/CarSilhouette";
import { OptionButton } from "@/components/OptionButton";
import { HeaderNav } from "@/components/SiteHeader";
import { LeyendaVeredictos, VerdictBlock } from "@/components/VerdictChip";
import { almacenamiento, reemplazarUrl } from "@/lib/cliente";
import { CATALOGO } from "@/lib/catalogo";
import { ETIQUETA_PASAJEROS, resumenPerfil } from "@/lib/perfil";
import { PREGUNTAS } from "@/lib/preguntas";
import { etiqueta, resultados } from "@/lib/reglas";
import { consulta } from "@/lib/respuestas";
import { VALORES, type Combustible, type Presupuesto, type Respuestas, type Uso } from "@/lib/tipos";

const USOS: { id: Uso; label: string; sub: string }[] = [
  { id: "ciudad", label: "Ciudad", sub: "Tráfico, cochera, rompemuelles" },
  { id: "carretera", label: "Carretera", sub: "Viajes largos asfaltados" },
  { id: "trocha", label: "Trocha", sub: "Caminos sin asfaltar, barro" },
  { id: "sierra", label: "Sierra", sub: "Subidas sobre 3,000 m" },
];

const COMBUSTIBLES: { id: Combustible; label: string }[] = [
  { id: "gasolina", label: "Gasolina" },
  { id: "glp", label: "GLP" },
  { id: "igual", label: "Igual" },
];

const OPCIONES_PRESUPUESTO = PREGUNTAS.find((p) => p.key === "pres")?.opciones ?? [];

export const CLAVE_BUSQUEDA_GUARDADA = "encaja:busqueda";

interface Props {
  inicial: Respuestas;
  /** null = sin elegir todavía (se marcan los dos primeros) */
  compararInicial: string[] | null;
}

export function Resultados({ inicial, compararInicial }: Props) {
  const [r, setR] = useState(inicial);
  const lista = useMemo(() => resultados(r), [r]);
  const [cmp, setCmp] = useState<string[]>(() => compararInicial ?? lista.slice(0, 2).map((x) => x.modelo.slug));
  const [perfilAbierto, setPerfilAbierto] = useState(false);
  const [aviso, setAviso] = useState("");
  const idPerfil = useId();

  // solo se comparan modelos que siguen en la lista
  const seleccion = cmp.filter((s) => lista.some((x) => x.modelo.slug === s));
  const q = consulta(r);
  const qCmp = consulta(r, { cmp: seleccion.join(",") || undefined });

  useEffect(() => {
    reemplazarUrl(`/resultados${qCmp}`);
  }, [qCmp]);

  const hrefComparar = `/comparar${consulta(r, { ids: seleccion.join(",") || undefined })}`;
  const primero = lista[0]?.modelo.slug ?? CATALOGO[0]!.slug;

  async function guardar() {
    const url = `${window.location.origin}/resultados${qCmp}`;
    almacenamiento.guardar(CLAVE_BUSQUEDA_GUARDADA, url);
    try {
      await navigator.clipboard.writeText(url);
      setAviso("Búsqueda guardada y enlace copiado.");
    } catch {
      setAviso("Búsqueda guardada en este navegador.");
    }
  }

  const toggleUso = (u: Uso) => setR((p) => ({ ...p, usos: { ...p.usos, [u]: !p.usos[u] } }));
  const chips = resumenPerfil(r);

  return (
    <>
      <HeaderNav
        activo="encontrar"
        hrefs={{ encontrar: `/resultados${q}`, comparar: hrefComparar, costo: `/auto/${primero}${q}#costo` }}
        accion={
          <button
            type="button"
            onClick={guardar}
            className="min-h-11 rounded-xl border-2 border-azul bg-white px-4 text-sm font-semibold text-asfalto hover:bg-placeholder"
          >
            Guardar mi búsqueda
          </button>
        }
      />
      <p role="status" className="solo-lector">
        {aviso}
      </p>

      <div className="mx-auto flex max-w-[1240px] flex-col gap-7 px-4 pb-14 pt-10 sm:px-8">
        <div className="flex max-w-[760px] flex-col gap-2">
          <h1 className="m-0 text-[clamp(28px,4vw,40px)] font-extrabold leading-[1.1] tracking-display">
            El auto que te sirve, explicado sin tecnicismos
          </h1>
          <p className="m-0 text-[17px] leading-normal text-texto-2">
            Marca cómo lo vas a usar y los resultados cambian al instante. Cada modelo te dice qué tan bien rinde en tu vida real y cuánto
            te cuesta al mes.
          </p>
          {aviso ? (
            <p aria-hidden="true" className="m-0 text-sm font-semibold text-bien">
              {aviso}
            </p>
          ) : null}
        </div>

        <div className="flex flex-wrap items-start gap-7">
          {/* En móvil el perfil se pliega; en escritorio siempre está a la vista */}
          <div className="flex w-full flex-col gap-3 lg:hidden">
            <button
              type="button"
              aria-expanded={perfilAbierto}
              aria-controls={idPerfil}
              onClick={() => setPerfilAbierto((x) => !x)}
              className="flex min-h-12 items-center justify-between rounded-tarjeta border-2 border-borde bg-white px-4 text-left text-[17px] font-semibold"
            >
              Tu perfil
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true" className={perfilAbierto ? "rotate-180" : ""}>
                <path d="M6 9l6 6 6-6" />
              </svg>
            </button>
            {chips.length ? (
              <ul className="m-0 flex list-none flex-wrap gap-1.5 p-0" aria-label="Tu perfil">
                {chips.map((c) => (
                  <li key={c} className="rounded-full bg-divisor px-2.5 py-1.5 text-xs">
                    {c}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          <Card
            as="aside"
            id={idPerfil}
            aria-label="Tu perfil"
            className={`box-border max-w-full flex-[1_1_300px] flex-col gap-6 p-6 ${perfilAbierto ? "flex" : "hidden lg:flex"}`}
          >
            <h2 className="m-0 text-[17px] font-semibold">Tu perfil</h2>

            <fieldset className="m-0 border-0 p-0">
              <legend className="mb-2.5 p-0 text-sm font-semibold">¿Por dónde vas a manejar?</legend>
              <div className="flex flex-col gap-2">
                {USOS.map((u) => (
                  <OptionButton key={u.id} tamano="lista" seleccionado={!!r.usos[u.id]} titulo={u.label} subtitulo={u.sub} onClick={() => toggleUso(u.id)} />
                ))}
              </div>
            </fieldset>

            <fieldset className="m-0 border-0 p-0">
              <legend className="mb-2.5 p-0 text-sm font-semibold">Pasajeros</legend>
              <div className="grid grid-cols-4 gap-2">
                {VALORES.pas.map((p) => (
                  <OptionButton
                    key={p}
                    tamano="pill"
                    seleccionado={r.pas === p}
                    titulo={ETIQUETA_PASAJEROS[p]}
                    aria-label={`${ETIQUETA_PASAJEROS[p]} pasajeros`}
                    onClick={() => setR((x) => ({ ...x, pas: x.pas === p ? null : p }))}
                    className="!px-1 !text-sm"
                  />
                ))}
              </div>
            </fieldset>

            <fieldset className="m-0 border-0 p-0">
              <legend className="mb-2.5 p-0 text-sm font-semibold">Combustible</legend>
              <div className="grid grid-cols-3 gap-2">
                {COMBUSTIBLES.map((c) => (
                  <OptionButton
                    key={c.id}
                    tamano="pill"
                    seleccionado={r.comb === c.id}
                    titulo={c.label}
                    onClick={() => setR((x) => ({ ...x, comb: x.comb === c.id ? null : c.id }))}
                    className="!px-1"
                  />
                ))}
              </div>
            </fieldset>

            <label className="flex flex-col gap-2 text-sm font-semibold">
              Presupuesto máximo
              <select
                value={r.pres ?? ""}
                onChange={(e) => setR((x) => ({ ...x, pres: (e.target.value || null) as Presupuesto | null }))}
                className="min-h-[46px] rounded-xl border-2 border-borde bg-white px-3 text-[15px] font-normal text-asfalto"
              >
                <option value="">Sin definir</option>
                {OPCIONES_PRESUPUESTO.map((o) => (
                  <option key={o.v} value={o.v}>
                    {o.label} al mes
                  </option>
                ))}
              </select>
            </label>
          </Card>

          <main className="flex min-w-0 flex-[999_1_560px] flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="text-[15px]" role="status">
                <strong>
                  {lista.length} {lista.length === 1 ? "modelo" : "modelos"}
                </strong>{" "}
                {lista.length === 1 ? "encaja" : "encajan"} con tu perfil
              </span>
              <LeyendaVeredictos />
            </div>

            {lista.length === 0 ? (
              <Card className="flex flex-col gap-2 p-6">
                <span className="text-lg font-semibold">Ningún modelo del catálogo encaja con todo lo que marcaste.</span>
                <span className="text-[15px] text-texto-2">Prueba quitando un uso o cambiando el presupuesto.</span>
              </Card>
            ) : null}

            {lista.map(({ modelo: m, evaluaciones }) => {
              const marcado = seleccion.includes(m.slug);
              return (
                <Card as="article" key={m.slug} className="flex flex-wrap items-stretch gap-5 p-5">
                  <FotoModelo tipo={m.carroceria} className="min-h-[120px] flex-[0_0_180px] rounded-xl max-sm:flex-[1_1_100%]" />
                  <div className="flex min-w-0 flex-[1_1_300px] flex-col gap-2.5">
                    <div className="flex flex-col gap-0.5">
                      <h2 className="m-0 text-xl font-semibold">{m.nombre}</h2>
                      <span className="text-[13px] text-texto-2">{m.motorResumen}</span>
                    </div>
                    <p className="m-0 text-sm leading-normal">{m.resumen}</p>
                    <ul className="m-0 grid list-none grid-cols-2 gap-2 p-0 sm:grid-cols-[repeat(auto-fill,minmax(104px,1fr))]">
                      {evaluaciones.map((e) => (
                        <VerdictBlock key={e.dimension} uso={etiqueta(e.dimension, "tarjeta", r)} nivel={e.veredicto?.nivel ?? null} />
                      ))}
                    </ul>
                  </div>
                  <div className="flex flex-[0_1_200px] flex-col justify-between gap-3 border-divisor max-sm:flex-[1_1_100%] sm:border-l sm:pl-5">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-xs text-texto-2">Costo total estimado</span>
                      <span className="text-xl font-semibold">S/ [monto]</span>
                      <span className="text-xs text-texto-2">al mes</span>
                    </div>
                    <div className="flex flex-col gap-2">
                      <Link href={`/auto/${m.slug}${q}`} className={clasesBoton("primario", "md", "!rounded-xl !font-semibold")}>
                        Ver detalle <span className="solo-lector">de {m.nombre}</span>
                      </Link>
                      <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={marcado}
                          onChange={() => setCmp((c) => (c.includes(m.slug) ? c.filter((s) => s !== m.slug) : [...c, m.slug]))}
                          className="size-[18px] accent-azul"
                        />
                        Comparar <span className="solo-lector">{m.nombre}</span>
                      </label>
                    </div>
                  </div>
                </Card>
              );
            })}

            {lista.length > 0 ? (
              <Card className="flex flex-wrap items-center justify-between gap-3 rounded-2xl px-5 py-3.5">
                <span className="text-[15px]" role="status">
                  {seleccion.length} {seleccion.length === 1 ? "modelo seleccionado" : "modelos seleccionados"} para comparar
                </span>
                {seleccion.length >= 2 ? (
                  <Link href={hrefComparar} className={clasesBoton("primario", "md", "!rounded-xl !font-semibold")}>
                    Comparar lado a lado
                  </Link>
                ) : (
                  <Button tamano="md" disabled className="!rounded-xl !font-semibold">
                    Comparar lado a lado
                  </Button>
                )}
              </Card>
            ) : null}

            <p className="m-0 text-xs leading-normal text-texto-2">
              Ranking independiente: ninguna marca paga por aparecer aquí. Evaluaciones basadas en fichas oficiales de modelos vendidos en
              Perú.
            </p>
          </main>
        </div>
      </div>
    </>
  );
}
