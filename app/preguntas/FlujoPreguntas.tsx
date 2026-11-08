"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Button, clasesBoton } from "@/components/Button";
import { LiveDeductionsPanel } from "@/components/LiveDeductionsPanel";
import { OptionButton } from "@/components/OptionButton";
import { ProgressBar } from "@/components/ProgressBar";
import { reemplazarUrl } from "@/lib/cliente";
import { contarEnCatalogoDePrueba, USAR_CATALOGO_DE_PRUEBA } from "@/lib/contador";
import { deducciones } from "@/lib/deducciones";
import { PREGUNTAS, TOTAL_PREGUNTAS } from "@/lib/preguntas";
import { contarQueEncajan } from "@/lib/reglas";
import { consulta, elegir, estaElegida, estaRespondida } from "@/lib/respuestas";
import type { Respuestas } from "@/lib/tipos";

interface Props {
  inicial: Respuestas;
  pasoInicial: number;
}

export function FlujoPreguntas({ inicial, pasoInicial }: Props) {
  const [r, setR] = useState(inicial);
  const [paso, setPaso] = useState(pasoInicial);
  const titulo = useRef<HTMLHeadingElement>(null);
  const primerRender = useRef(true);

  const p = PREGUNTAS[paso] ?? PREGUNTAS[0]!;
  const respondido = estaRespondida(r, p.key);
  const esPrimero = paso === 0;
  const esUltimo = paso === TOTAL_PREGUNTAS - 1;

  // Estado en la URL: el flujo se puede compartir o retomar
  useEffect(() => {
    reemplazarUrl(`/preguntas${consulta(r, { paso: String(paso + 1) })}`);
  }, [r, paso]);

  // Al cambiar de pregunta, el foco va al título para lectores de pantalla
  useEffect(() => {
    if (primerRender.current) {
      primerRender.current = false;
      return;
    }
    titulo.current?.focus();
  }, [paso]);

  const encajan = USAR_CATALOGO_DE_PRUEBA ? contarEnCatalogoDePrueba(r) : contarQueEncajan(r);

  return (
    <div className="mx-auto flex max-w-[1240px] flex-wrap items-start gap-8 px-4 pb-14 pt-10 sm:px-8">
      <main className="flex min-w-0 flex-[999_1_560px] flex-col gap-6">
        <div className="flex flex-col gap-2.5">
          <div className="flex items-center justify-between text-[13px] text-texto-2">
            <span>
              Pregunta {paso + 1} de {TOTAL_PREGUNTAS}
            </span>
            <span>{p.seccion}</span>
          </div>
          <ProgressBar valor={((paso + (respondido ? 1 : 0)) / TOTAL_PREGUNTAS) * 100} etiqueta="Avance de las preguntas" />
        </div>

        <div className="flex flex-col gap-2">
          <h1 ref={titulo} tabIndex={-1} className="m-0 text-[clamp(26px,3.4vw,38px)] font-extrabold leading-[1.15] tracking-display outline-none">
            {p.titulo}
          </h1>
          <p className="m-0 text-base leading-normal text-texto-2">{p.ayuda}</p>
        </div>

        <div role="group" aria-label={p.titulo} className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-3">
          {p.opciones.map((o) => (
            <OptionButton
              key={o.v}
              seleccionado={estaElegida(r, p.key, o.v)}
              titulo={o.label}
              subtitulo={o.sub}
              onClick={() => setR((prev) => elegir(prev, p.key, o.v))}
            />
          ))}
        </div>
        <span className="text-[13px] text-texto-2">{p.multi ? "Puedes marcar varias opciones." : "Elige una opción."}</span>

        <div className="flex flex-wrap gap-3 pt-2">
          <Button
            variante="secundario"
            disabled={esPrimero}
            onClick={() => setPaso((x) => Math.max(0, x - 1))}
            className="flex-[0_0_140px] !rounded-tarjeta !font-semibold disabled:!border-borde disabled:!text-[#6B7280]"
          >
            Atrás
          </Button>
          {esUltimo ? (
            <Link href={`/resultados${consulta(r)}`} className={clasesBoton("primario", "lg", "flex-[1_1_240px] !rounded-tarjeta !font-semibold")}>
              Ver los autos que encajan conmigo
            </Link>
          ) : (
            <Button
              disabled={!respondido}
              onClick={() => respondido && setPaso((x) => Math.min(TOTAL_PREGUNTAS - 1, x + 1))}
              className="flex-[1_1_240px] !rounded-tarjeta !font-semibold"
            >
              Siguiente
            </Button>
          )}
        </div>
      </main>

      <LiveDeductionsPanel
        encajan={encajan}
        notaContador={`Se actualiza con cada respuesta${USAR_CATALOGO_DE_PRUEBA ? " · catálogo de prueba" : ""}`}
        deducciones={deducciones(r)}
      />
    </div>
  );
}
