"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { clasesBoton } from "@/components/Button";
import { Card } from "@/components/Card";
import { SwipeCard } from "@/components/SwipeCard";
import { useMovimientoReducido } from "@/lib/cliente";
import { consulta, respuestasVacias } from "@/lib/respuestas";
import { calcularPerfil, TARJETAS, type Barra, type Voto } from "@/lib/swipe";

const SALIDA_MS = 260;

function Barras({ barras }: { barras: Barra[] }) {
  return (
    <ul className="m-0 flex list-none flex-col gap-4 p-0">
      {barras.map((b) => (
        <li key={b.k} className="flex flex-col gap-1.5">
          <div className="flex justify-between text-[15px]">
            <span className="font-semibold">{b.nombre}</span>
            <span className="text-texto-2">{b.pct}%</span>
          </div>
          <div aria-hidden="true" className="h-2 overflow-hidden rounded bg-divisor">
            <div className="h-2 rounded bg-azul" style={{ width: `${b.pct}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

export function Descubre() {
  const [i, setI] = useState(0);
  const [votos, setVotos] = useState<Voto[]>([]);
  const [salida, setSalida] = useState<0 | 1 | -1>(0);
  const [enfocarTarjeta, setEnfocarTarjeta] = useState(false);
  const reducido = useMovimientoReducido();
  const t = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tituloPerfil = useRef<HTMLHeadingElement>(null);

  const total = TARJETAS.length;
  const terminado = i >= total;
  const perfil = calcularPerfil(votos);
  const tarjeta = TARJETAS[Math.min(i, total - 1)]!;

  useEffect(() => () => {
    if (t.current) clearTimeout(t.current);
  }, []);

  useEffect(() => {
    if (terminado) tituloPerfil.current?.focus();
  }, [terminado]);

  function decidir(gusta: boolean, desdeTeclado = false) {
    if (salida !== 0 || terminado) return;
    setEnfocarTarjeta(desdeTeclado);
    const indice = i;
    const avanzar = () => {
      setVotos((v) => [...v, { i: indice, gusta }]);
      setI(indice + 1);
      setSalida(0);
    };
    if (reducido) {
      avanzar();
      return;
    }
    setSalida(gusta ? 1 : -1);
    t.current = setTimeout(avanzar, SALIDA_MS);
  }

  function reiniciar() {
    setI(0);
    setVotos([]);
    setSalida(0);
  }

  if (terminado) {
    const hrefPreguntas = `/preguntas${consulta({ ...respuestasVacias(), gusto: perfil.gusto })}`;
    return (
      <div className="mx-auto flex max-w-[1100px] flex-col gap-7 px-4 pb-16 pt-12 sm:px-8">
        <div className="flex flex-wrap items-stretch gap-8">
          {/* Fuera de la portada no hay bloques azules grandes: tarjeta blanca con borde azul */}
          <Card as="section" grande className="flex flex-[1_1_460px] flex-col gap-3.5 !border-azul p-8">
            <span className="text-base text-texto-2">Tu perfil</span>
            <h1 ref={tituloPerfil} tabIndex={-1} className="m-0 text-[clamp(36px,5vw,64px)] font-black leading-[0.95] tracking-display text-azul outline-none">
              {perfil.perfil.nombre}
            </h1>
            <p className="m-0 text-lg leading-normal">{perfil.perfil.texto}</p>
            {perfil.segundo ? <p className="m-0 text-base text-texto-2">{perfil.segundo}</p> : null}
            {perfil.tiposGusta.length ? (
              <ul className="m-0 flex list-none flex-wrap gap-2 p-0 pt-1.5">
                {perfil.tiposGusta.map((tg) => (
                  <li key={tg} className="rounded-letrero bg-azul px-3.5 py-1.5 text-[15px] font-extrabold text-white">
                    Te gustan: {tg}
                  </li>
                ))}
              </ul>
            ) : null}
          </Card>
          <Card as="section" grande aria-labelledby="estilo" className="flex flex-[1_1_340px] flex-col gap-3.5 p-[26px]">
            <h2 id="estilo" className="m-0 text-lg font-extrabold">
              Tu estilo, en números
            </h2>
            <Barras barras={perfil.barras} />
          </Card>
        </div>

        <Card as="section" grande className="flex flex-wrap items-center justify-between gap-5 p-7">
          <div className="flex flex-[1_1_420px] flex-col gap-1.5">
            <span className="text-[22px] font-black tracking-[-0.02em]">Ya sabemos qué te gusta. Ahora veamos que te sirva.</span>
            <span className="text-base text-texto-2">
              Siete preguntas sobre cómo lo vas a usar, y te mostramos los modelos que cumplen las dos cosas.
            </span>
          </div>
          <div className="flex flex-wrap gap-2.5">
            <Link href={hrefPreguntas} className={clasesBoton("primario")}>
              Seguir con mi uso
            </Link>
            <button type="button" onClick={reiniciar} className={clasesBoton("secundario")}>
              Volver a deslizar
            </button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-[1240px] flex-wrap items-start gap-10 px-4 pb-14 pt-9 sm:px-8">
      <main className="flex min-w-0 flex-[999_1_520px] flex-col items-center gap-[22px]">
        <div className="flex w-full max-w-[520px] flex-col gap-1.5">
          <h1 className="m-0 text-[clamp(28px,3.6vw,42px)] font-black leading-none tracking-display">¿Te gusta o no?</h1>
          <p className="m-0 text-[17px] text-texto-2">Desliza a la derecha si te gusta, a la izquierda si no. Sin pensarlo mucho.</p>
        </div>

        <SwipeCard
          key={i}
          tarjeta={tarjeta}
          salida={salida}
          reducido={reducido}
          enfocar={enfocarTarjeta}
          onDecidir={decidir}
        />

        <div className="flex items-center gap-7 pt-1.5">
          <button
            type="button"
            onClick={() => decidir(false)}
            aria-label="No me gusta"
            className="flex size-[72px] items-center justify-center rounded-full border-[3px] border-dificil bg-white text-dificil"
          >
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.8} strokeLinecap="round" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
          <span className="min-w-[70px] text-center text-[15px] text-texto-2" aria-live="polite">
            {Math.min(i + 1, total)} de {total}
          </span>
          <button
            type="button"
            onClick={() => decidir(true)}
            aria-label="Me gusta"
            className="flex size-[72px] items-center justify-center rounded-full border-[3px] border-bien bg-bien text-white"
          >
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21l7.8-7.5 1-1.1a5.5 5.5 0 0 0 0-7.8z" />
            </svg>
          </button>
        </div>
      </main>

      <Card as="aside" aria-live="polite" aria-labelledby="viendo" className="box-border flex max-w-full flex-[1_1_320px] flex-col gap-4 p-[22px]">
        <h2 id="viendo" className="m-0 text-lg font-extrabold">
          Lo que vamos viendo de ti
        </h2>
        {votos.length < 2 ? (
          <p className="m-0 text-[15px] leading-normal text-texto-2">Después de un par de autos empezamos a notar tu estilo.</p>
        ) : null}
        <Barras barras={perfil.barras} />
      </Card>
    </div>
  );
}
