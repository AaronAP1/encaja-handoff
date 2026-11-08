"use client";

import Link from "next/link";
import { useEffect, useId, useMemo, useState } from "react";
import { Card } from "@/components/Card";
import { reemplazarUrl } from "@/lib/cliente";
import type { Mercado } from "@/lib/fichas/esquema";
import { anclaMarca, normalizarBusqueda, ORDEN_TIPOS, type TipoMercado } from "@/lib/mercado";

interface Props {
  marcas: Mercado["marcas"];
  tipoInicial: TipoMercado | null;
  busquedaInicial: string;
}

function IconoExterno() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M14 4h6v6" />
      <path d="M20 4l-9 9" />
      <path d="M19 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5" />
    </svg>
  );
}

export function ListaModelos({ marcas, tipoInicial, busquedaInicial }: Props) {
  const [tipo, setTipo] = useState<TipoMercado | null>(tipoInicial);
  const [busqueda, setBusqueda] = useState(busquedaInicial);
  const id = useId();

  // Estado en la URL: el listado filtrado se puede compartir
  useEffect(() => {
    const p = new URLSearchParams();
    if (tipo) p.set("tipo", tipo);
    if (busqueda.trim()) p.set("q", busqueda.trim());
    const s = p.toString();
    reemplazarUrl(`/modelos${s ? `?${s}` : ""}`);
  }, [tipo, busqueda]);

  const q = normalizarBusqueda(busqueda);
  // la búsqueda filtra primero; los contadores de tipo reflejan lo que queda
  const buscadas = useMemo(
    () =>
      marcas
        .map((m) => ({
          ...m,
          modelos: m.modelos.filter((x) => !q || normalizarBusqueda(`${m.marca} ${x.nombre} ${x.tipo}`).includes(q)),
        }))
        .filter((m) => m.modelos.length),
    [marcas, q],
  );
  const conteo = useMemo(() => {
    const c = new Map<TipoMercado, number>();
    for (const m of buscadas) for (const x of m.modelos) c.set(x.tipo, (c.get(x.tipo) ?? 0) + 1);
    return c;
  }, [buscadas]);
  const visibles = buscadas
    .map((m) => ({ ...m, modelos: m.modelos.filter((x) => !tipo || x.tipo === tipo) }))
    .filter((m) => m.modelos.length);
  const total = visibles.reduce((s, m) => s + m.modelos.length, 0);
  const totalBuscadas = buscadas.reduce((s, m) => s + m.modelos.length, 0);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4">
        <label htmlFor={`${id}-q`} className="flex max-w-[520px] flex-col gap-2 text-sm font-semibold">
          Busca por modelo o marca
          <input
            id={`${id}-q`}
            type="search"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Por ejemplo: Tucson, Kia, sedán"
            autoComplete="off"
            className="min-h-12 rounded-letrero border-2 border-azul bg-white px-4 text-base font-normal text-asfalto"
          />
        </label>

        <div role="group" aria-label="Tipo de auto" className="flex flex-wrap gap-2">
          {[null, ...ORDEN_TIPOS].map((t) => {
            const n = t ? (conteo.get(t) ?? 0) : totalBuscadas;
            const activo = tipo === t;
            if (t && n === 0 && !activo) return null; // el activo siempre se ve, para poder quitarlo
            return (
              <button
                key={t ?? "todos"}
                type="button"
                aria-pressed={activo}
                onClick={() => setTipo(t)}
                className={`flex min-h-11 items-center gap-2 rounded-full border-2 px-4 text-[15px] font-semibold ${
                  activo ? "border-azul bg-azul text-white" : "border-borde bg-white text-asfalto hover:border-azul"
                }`}
              >
                {t ?? "Todos"}
                <span className={`text-[13px] font-normal ${activo ? "text-white/85" : "text-texto-2"}`}>{n}</span>
              </button>
            );
          })}
        </div>

        <nav aria-label="Ir a una marca" className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
          {visibles.map((m) => (
            <a key={m.marca} href={`#${anclaMarca(m.marca)}`} className="flex min-h-11 min-w-11 items-center justify-center font-semibold">
              {m.marca}
            </a>
          ))}
        </nav>
      </div>

      <p role="status" className="m-0 text-[15px]">
        <strong>
          {total} {total === 1 ? "modelo" : "modelos"}
        </strong>{" "}
        {tipo ? `de tipo ${tipo} ` : ""}
        {q ? `que coinciden con «${busqueda.trim()}»` : ""}
      </p>

      {visibles.length === 0 ? (
        <Card className="flex flex-col items-start gap-3 p-6">
          <span className="text-lg font-semibold">Ningún modelo coincide con tu búsqueda.</span>
          <button
            type="button"
            onClick={() => {
              setBusqueda("");
              setTipo(null);
            }}
            className="min-h-11 rounded-letrero border-2 border-azul bg-white px-4 font-semibold text-azul-oscuro"
          >
            Ver todos los modelos
          </button>
        </Card>
      ) : null}

      {visibles.map((m) => (
        <section key={m.marca} id={anclaMarca(m.marca)} aria-labelledby={`${id}-${anclaMarca(m.marca)}`} className="flex scroll-mt-4 flex-col gap-3">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b-2 border-asfalto pb-2">
            <h2 id={`${id}-${anclaMarca(m.marca)}`} className="m-0 text-[clamp(22px,2.6vw,28px)] font-black tracking-display">
              {m.marca} <span className="text-base font-semibold text-texto-2">{m.modelos.length}</span>
            </h2>
            <span className="flex flex-wrap items-center gap-x-3 text-[13px] text-texto-2">
              {m.fuente.tipo === "concesionario" ? "Lista de un concesionario multimarca" : "Lista del sitio oficial"}
              {m.sitio ? (
                <a href={m.sitio} target="_blank" rel="noopener noreferrer" className="flex min-h-11 items-center gap-1 font-semibold">
                  Sitio de {m.marca}
                  <IconoExterno />
                  <span className="solo-lector">(se abre en otra pestaña)</span>
                </a>
              ) : null}
            </span>
          </div>
          <ul className="m-0 grid list-none grid-cols-[repeat(auto-fill,minmax(230px,1fr))] gap-3 p-0">
            {m.modelos.map((x) => (
              <li key={x.nombre}>
                <Card className={`flex h-full flex-col gap-2 p-4 ${x.slugEncaja ? "!border-azul" : ""}`}>
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-[17px] font-extrabold leading-tight">{x.nombre}</span>
                    {x.slugEncaja ? (
                      <span className="shrink-0 rounded-full bg-azul px-2.5 py-0.5 text-xs font-semibold text-white">Evaluado</span>
                    ) : null}
                  </div>
                  <span className="self-start rounded-full border-2 border-borde px-2.5 py-0.5 text-xs font-semibold text-texto-2">
                    {x.tipo}
                  </span>
                  <div className="mt-auto pt-1">
                    {x.slugEncaja ? (
                      <Link href={`/auto/${x.slugEncaja}`} className="flex min-h-11 items-center text-sm font-semibold">
                        Ver veredicto y costo
                      </Link>
                    ) : x.url ? (
                      <a href={x.url} target="_blank" rel="noopener noreferrer" className="flex min-h-11 items-center gap-1 text-sm font-semibold">
                        Ver en el sitio oficial
                        <IconoExterno />
                        <span className="solo-lector">de {m.marca}, se abre en otra pestaña</span>
                      </a>
                    ) : (
                      <span className="flex min-h-11 items-center text-sm text-texto-2">Aún sin evaluar</span>
                    )}
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
