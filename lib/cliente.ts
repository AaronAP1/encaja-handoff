"use client";

import { useSyncExternalStore } from "react";

const CONSULTA_MOVIMIENTO = "(prefers-reduced-motion: reduce)";

function suscribirMovimiento(cb: () => void) {
  const mq = window.matchMedia(CONSULTA_MOVIMIENTO);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}

/** true si la persona pidió reducir el movimiento (rotación del hero y swipe) */
export function useMovimientoReducido(): boolean {
  return useSyncExternalStore(
    suscribirMovimiento,
    () => window.matchMedia(CONSULTA_MOVIMIENTO).matches,
    () => false,
  );
}

/**
 * Refleja el estado en la URL sin recargar ni pedir datos al servidor.
 * Next sincroniza history.replaceState con useSearchParams.
 */
export function reemplazarUrl(ruta: string) {
  if (typeof window === "undefined") return;
  const actual = window.location.pathname + window.location.search;
  if (actual !== ruta) window.history.replaceState(window.history.state, "", ruta);
}

/** localStorage solo como conveniencia: puede no existir (modo privado, bloqueos) */
export const almacenamiento = {
  leer(clave: string): string | null {
    try {
      return window.localStorage.getItem(clave);
    } catch {
      return null;
    }
  },
  guardar(clave: string, valor: string) {
    try {
      window.localStorage.setItem(clave, valor);
    } catch {
      /* sin almacenamiento: no pasa nada */
    }
  },
};
