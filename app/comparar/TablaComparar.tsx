"use client";

import Link from "next/link";
import { useState } from "react";
import { Card } from "@/components/Card";
import { FotoModelo } from "@/components/FotoModelo";
import { VerdictChip } from "@/components/VerdictChip";
import type { Segmento } from "@/lib/reglas";
import type { Carroceria, Nivel } from "@/lib/tipos";

export type FilaComparar =
  | { tipo: "grupo"; label: string }
  | { tipo: "fila"; label: string; celdas: { veredicto: boolean; nivel: Nivel | null; texto: string }[] };

interface Props {
  modelos: { slug: string; nombre: string; carroceria: Carroceria; href: string }[];
  filas: FilaComparar[];
  perfil: string;
  recomendacion: Segmento[] | null;
}

function iguales(f: Extract<FilaComparar, { tipo: "fila" }>) {
  const clave = (c: (typeof f.celdas)[number]) => (c.veredicto ? `v:${c.nivel}` : `t:${c.texto}`);
  return f.celdas.every((c) => clave(c) === clave(f.celdas[0]!));
}

export function TablaComparar({ modelos, filas, perfil, recomendacion }: Props) {
  const [soloDif, setSoloDif] = useState(false);
  const columnas = modelos.length + 1;

  // con "solo diferencias", un grupo sin filas visibles también se oculta
  const visibles: FilaComparar[] = [];
  let grupo: FilaComparar | null = null;
  for (const f of filas) {
    if (f.tipo === "grupo") {
      grupo = f;
      continue;
    }
    if (soloDif && iguales(f)) continue;
    if (grupo) {
      visibles.push(grupo);
      grupo = null;
    }
    visibles.push(f);
  }

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <h1 className="m-0 text-[clamp(28px,3.4vw,36px)] font-extrabold tracking-display">Comparar para tu uso</h1>
          {perfil ? <span className="text-[15px] text-texto-2">{perfil}</span> : null}
        </div>
        <label className="flex min-h-11 cursor-pointer items-center gap-2.5 text-sm">
          <input type="checkbox" checked={soloDif} onChange={() => setSoloDif((x) => !x)} className="size-[18px] accent-azul" />
          Mostrar solo diferencias
        </label>
      </div>

      {recomendacion ? (
        <Card className="flex flex-wrap items-center gap-3 rounded-2xl px-5 py-[18px]">
          <span className="rounded-full bg-azul px-2.5 py-1 text-xs font-semibold text-white">Según tu perfil</span>
          <span className="text-[15px] leading-[1.45]">
            {recomendacion.map((s, i) => (s.fuerte ? <strong key={i}>{s.texto}</strong> : <span key={i}>{s.texto}</span>))}
          </span>
        </Card>
      ) : null}

      <div
        role="region"
        aria-label="Tabla comparativa (se desplaza a los lados)"
        tabIndex={0}
        className="overflow-x-auto rounded-tarjeta border-2 border-borde bg-white"
      >
        <table className="w-full min-w-[760px] table-fixed border-collapse text-sm">
          <thead>
            <tr>
              <th scope="col" className="w-[22%] px-5 py-[18px] text-left text-[13px] font-medium text-texto-2">
                Modelo
              </th>
              {modelos.map((m) => (
                <th key={m.slug} scope="col" className="px-5 py-[18px] text-left align-top">
                  <div className="flex flex-col gap-2.5">
                    <FotoModelo tipo={m.carroceria} slug={m.slug} nombre={m.nombre} className="h-24 rounded-boton !p-2" />
                    <Link href={m.href} className="flex min-h-11 items-center text-[17px] font-semibold text-asfalto">
                      {m.nombre}
                    </Link>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visibles.map((f) =>
              f.tipo === "grupo" ? (
                <tr key={`g-${f.label}`}>
                  <th scope="colgroup" colSpan={columnas} className="border-t border-divisor px-5 pb-2 pt-[18px] text-left text-[13px] font-semibold text-texto-2">
                    {f.label}
                  </th>
                </tr>
              ) : (
                <tr key={f.label} className="border-t border-divisor">
                  <th scope="row" className="px-5 py-3 text-left font-medium">
                    {f.label}
                  </th>
                  {f.celdas.map((c, i) => (
                    <td key={modelos[i]?.slug ?? i} className="px-5 py-3">
                      {c.veredicto ? <VerdictChip nivel={c.nivel} className="!text-[13px]" /> : <span>{c.texto}</span>}
                    </td>
                  ))}
                </tr>
              ),
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
