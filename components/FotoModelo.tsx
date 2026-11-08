"use client";

import { useEffect, useRef, useState } from "react";
import type { Carroceria } from "@/lib/tipos";
import { CarSilhouette } from "./CarSilhouette";

/**
 * Fotos oficiales de public/fotos-locales/<slug>.webp: SOLO en desarrollo y con
 * NEXT_PUBLIC_FOTOS_LOCALES=1 en .env.local. Esa carpeta está fuera de git porque las
 * fotos de las marcas no tienen permiso de publicación (docs/05). En un build de
 * producción esto siempre es false y se ve la silueta.
 */
const FOTOS_LOCALES = process.env.NODE_ENV !== "production" && process.env.NEXT_PUBLIC_FOTOS_LOCALES === "1";

interface Props {
  tipo: Carroceria;
  /** Si se pasa (y hay foto local), se muestra la foto del modelo */
  slug?: string;
  nombre?: string;
  className?: string;
  /** "Foto oficial del modelo" en las vistas grandes */
  leyenda?: string;
}

/** Espacio de foto (placeholder #E4E9F1): foto local si existe, si no la silueta del tipo de auto */
export function FotoModelo({ tipo, slug, nombre, className = "", leyenda }: Props) {
  const [fallo, setFallo] = useState(false);
  const img = useRef<HTMLImageElement>(null);
  const conFoto = FOTOS_LOCALES && !!slug && !fallo;

  // si la imagen falló antes de hidratar, onError no llega: se revisa al montar
  useEffect(() => {
    const el = img.current;
    if (el && el.complete && el.naturalWidth === 0) setFallo(true);
  }, []);

  if (conFoto) {
    return (
      <div className={`relative overflow-hidden bg-placeholder ${className}`}>
        {/* eslint-disable-next-line @next/next/no-img-element -- imagen local de desarrollo, no se publica */}
        <img
          ref={img}
          src={`/fotos-locales/${slug}.webp`}
          alt={nombre ? `Foto de ${nombre}` : ""}
          onError={() => setFallo(true)}
          className="absolute inset-0 h-full w-full object-contain p-[5%]"
          decoding="async"
        />
        {leyenda ? (
          <span className="absolute right-2 top-2 rounded-letrero bg-white/90 px-2 py-0.5 text-[11px] font-semibold text-texto-2">
            Foto oficial · solo en local
          </span>
        ) : null}
      </div>
    );
  }

  return (
    <div className={`flex flex-col items-center justify-center gap-2 bg-placeholder p-3 ${className}`}>
      <CarSilhouette tipo={tipo} className="h-auto w-[78%] max-w-[360px]" />
      {leyenda ? <span className="text-[13px] text-texto-2">{leyenda}</span> : null}
    </div>
  );
}
