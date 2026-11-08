"use client";

import { useRouter } from "next/navigation";
import { useId, useRef, useState, type FormEvent } from "react";
import { aSlug, buscarPorTexto, CATALOGO } from "@/lib/catalogo";

interface Props {
  /** "portada": franja de entradas de la landing. "header": buscador de /revisar */
  variante: "portada" | "header";
  valorInicial?: string;
  /** Query a conservar (perfil de uso) */
  consulta?: string;
}

/** Input con autocompletado (datalist) que lleva a /revisar/[modelo] */
export function BuscadorModelo({ variante, valorInicial = "", consulta = "" }: Props) {
  const router = useRouter();
  const [texto, setTexto] = useState(valorInicial);
  const input = useRef<HTMLInputElement>(null);
  const id = useId();
  const listaId = `${id}-modelos`;

  function enviar(e: FormEvent) {
    e.preventDefault();
    const q = texto.trim();
    if (!q) {
      input.current?.focus();
      return;
    }
    const slug = buscarPorTexto(q)?.slug ?? aSlug(q);
    if (slug) router.push(`/revisar/${slug}${consulta}`);
  }

  const datalist = (
    <datalist id={listaId}>
      {CATALOGO.map((m) => (
        <option key={m.slug} value={m.nombre} />
      ))}
    </datalist>
  );

  if (variante === "header") {
    return (
      <form role="search" onSubmit={enviar} className="flex max-w-[560px] flex-[1_1_320px] gap-2">
        <label htmlFor={`${id}-q`} className="solo-lector">
          Modelo a revisar
        </label>
        <input
          ref={input}
          id={`${id}-q`}
          list={listaId}
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          autoComplete="off"
          className="min-h-11 min-w-0 flex-auto rounded-xl border-2 border-borde bg-white px-3.5 text-[15px] text-asfalto"
        />
        {datalist}
        <button type="submit" className="min-h-11 rounded-xl bg-azul px-4 text-sm font-semibold text-white hover:bg-azul-oscuro">
          Revisar
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={enviar} className="flex flex-[1_1_420px] flex-col gap-2.5">
      <label htmlFor={`${id}-q`} className="text-[19px] font-extrabold">
        ¿Ya tienes uno en mente? <span className="font-normal text-texto-2">Mira si te sirve de verdad.</span>
      </label>
      <div className="flex flex-wrap gap-2">
        <input
          ref={input}
          id={`${id}-q`}
          list={listaId}
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Escribe un modelo, por ejemplo Honda BR-V"
          autoComplete="off"
          className="min-h-[54px] min-w-0 flex-[1_1_240px] rounded-letrero border-2 border-azul bg-white px-4 text-base text-asfalto"
        />
        {datalist}
        <button
          type="submit"
          className="min-h-[54px] rounded-letrero bg-azul px-[22px] text-base font-extrabold text-white hover:bg-azul-oscuro"
        >
          Mira si te sirve
        </button>
      </div>
    </form>
  );
}
