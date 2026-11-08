import Link from "next/link";
import type { ReactNode } from "react";
import { MARCA } from "@/lib/marca";

export function Logo({ tamano = 26, claro = false }: { tamano?: number; claro?: boolean }) {
  return (
    <Link
      href="/"
      className={`flex min-h-11 items-center font-black tracking-display no-underline ${
        claro ? "text-white hover:text-white" : "text-asfalto hover:text-asfalto"
      }`}
      style={{ fontSize: tamano }}
    >
      {MARCA.logo}
    </Link>
  );
}

/** Header blanco con logo y lema de tranquilidad (preguntas, descubre, situación) */
export function HeaderSimple({ lema }: { lema: string }) {
  return (
    <header className="border-b border-borde bg-white">
      <div className="mx-auto flex min-h-16 max-w-[1240px] flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 sm:px-8">
        <Logo />
        <span className="text-[13px] text-texto-2">{lema}</span>
      </div>
    </header>
  );
}

export type SeccionNav = "encontrar" | "modelos" | "comparar" | "costo" | "evaluamos";

interface NavProps {
  activo?: SeccionNav;
  hrefs: { encontrar: string; comparar: string; costo: string };
  accion?: ReactNode;
}

/** Header con navegación de la parte "web" (resultados, detalle, comparar) */
export function HeaderNav({ activo, hrefs, accion }: NavProps) {
  const items: { id: SeccionNav; label: string; href: string }[] = [
    { id: "encontrar", label: "Encontrar auto", href: hrefs.encontrar },
    { id: "modelos", label: "Modelos", href: "/modelos" },
    { id: "comparar", label: "Comparar", href: hrefs.comparar },
    { id: "costo", label: "Costo real", href: hrefs.costo },
    { id: "evaluamos", label: "Cómo evaluamos", href: "/como-evaluamos" },
  ];
  return (
    <header className="border-b border-borde bg-white">
      <nav
        aria-label="Principal"
        className="mx-auto flex min-h-[68px] max-w-[1240px] flex-wrap items-center gap-x-8 gap-y-1 px-4 py-1 sm:px-8"
      >
        <Logo />
        <ul className="m-0 flex flex-grow list-none flex-wrap gap-x-6 p-0 text-sm">
          {items.map((it) => (
            <li key={it.id}>
              <Link
                href={it.href}
                aria-current={activo === it.id ? "page" : undefined}
                className={`flex min-h-11 items-center no-underline ${
                  activo === it.id ? "font-semibold text-asfalto hover:text-asfalto" : "text-texto-2 hover:text-azul-oscuro"
                }`}
              >
                {it.label}
              </Link>
            </li>
          ))}
        </ul>
        {accion}
      </nav>
    </header>
  );
}
