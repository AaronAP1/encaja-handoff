"use client";

import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { UMBRAL_SWIPE_PX, type TarjetaSwipe } from "@/lib/swipe";
import { CarSilhouette } from "./CarSilhouette";

interface Props {
  tarjeta: TarjetaSwipe;
  /** 1 = sale a la derecha (me gusta), -1 = a la izquierda (no), 0 = en juego */
  salida: 0 | 1 | -1;
  reducido: boolean;
  /** Enfocar al montar (si la tarjeta anterior se decidió con el teclado) */
  enfocar: boolean;
  onDecidir: (gusta: boolean, desdeTeclado: boolean) => void;
}

const SELLO =
  "pointer-events-none absolute top-[18px] rounded-letrero border-[3px] bg-white px-3.5 py-1 text-[22px] font-black";

/**
 * Tarjeta arrastrable (pointer events, touch-action: none). Umbral ±110 px,
 * sellos "Me gusta"/"No" según el arrastre y rotación dx/22 grados.
 * También responde a las flechas ← → del teclado; los botones X y corazón son la alternativa principal.
 */
export function SwipeCard({ tarjeta, salida, reducido, enfocar, onDecidir }: Props) {
  const [dx, setDx] = useState(0);
  const [arrastrando, setArrastrando] = useState(false);
  const x0 = useRef(0);
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    if (enfocar) ref.current?.focus();
  }, [enfocar]);

  const desplazamiento = salida !== 0 ? salida * 640 : dx;
  const like = Math.max(0, Math.min(1, desplazamiento / 120));
  const nope = Math.max(0, Math.min(1, -desplazamiento / 120));

  function abajo(e: PointerEvent<HTMLElement>) {
    if (salida !== 0) return;
    x0.current = e.clientX;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* algunos navegadores no lo permiten */
    }
    setArrastrando(true);
  }

  function mover(e: PointerEvent<HTMLElement>) {
    if (arrastrando) setDx(e.clientX - x0.current);
  }

  function soltar() {
    if (!arrastrando) return;
    setArrastrando(false);
    if (dx > UMBRAL_SWIPE_PX) onDecidir(true, false);
    else if (dx < -UMBRAL_SWIPE_PX) onDecidir(false, false);
    else setDx(0);
  }

  function teclado(e: KeyboardEvent<HTMLElement>) {
    if (e.key === "ArrowRight") {
      e.preventDefault();
      onDecidir(true, true);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      onDecidir(false, true);
    }
  }

  const transicion = arrastrando || reducido ? "none" : "transform 260ms ease";

  return (
    <div className="relative h-[470px] w-full max-w-[520px]">
      <div aria-hidden="true" className="absolute inset-[14px_14px_-10px_14px] rounded-[22px] border-2 border-borde bg-placeholder" />
      <article
        ref={ref}
        tabIndex={0}
        aria-roledescription="tarjeta deslizable"
        aria-label={`${tarjeta.titulo}. Flecha derecha: me gusta. Flecha izquierda: no.`}
        onPointerDown={abajo}
        onPointerMove={mover}
        onPointerUp={soltar}
        onPointerCancel={soltar}
        onKeyDown={teclado}
        className="absolute inset-0 cursor-grab touch-none select-none overflow-hidden rounded-[22px] border-2 border-borde bg-white active:cursor-grabbing"
        style={{
          transform: `translateX(${desplazamiento}px) rotate(${(desplazamiento / 22).toFixed(1)}deg)`,
          transition: transicion,
        }}
      >
        <div className="relative flex h-[290px] items-end justify-center overflow-hidden bg-placeholder">
          <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-[46px] bg-cerro" />
          <CarSilhouette tipo={tarjeta.tipo} color={tarjeta.color} etiqueta={`Silueta de ${tarjeta.tipo}`} className="relative mb-[18px] h-auto w-[92%]" />
          <span aria-hidden="true" className={`${SELLO} left-[18px] -rotate-12 border-bien text-bien`} style={{ opacity: like }}>
            Me gusta
          </span>
          <span aria-hidden="true" className={`${SELLO} right-[18px] rotate-12 border-dificil text-dificil`} style={{ opacity: nope }}>
            No
          </span>
        </div>
        <div className="flex flex-col gap-1.5 px-[22px] py-5">
          <span className="text-sm font-semibold text-texto-2">{tarjeta.tipo}</span>
          <h2 className="m-0 text-[26px] font-black tracking-[-0.02em]">{tarjeta.titulo}</h2>
          <p className="m-0 text-base text-texto-2">{tarjeta.texto}</p>
        </div>
      </article>
    </div>
  );
}
