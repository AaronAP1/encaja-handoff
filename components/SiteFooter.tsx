import Link from "next/link";
import { MARCA } from "@/lib/marca";

/** Footer con descargo legal (docs/05: evaluaciones editoriales y costos como estimación) */
export function SiteFooter() {
  return (
    <footer className="border-t border-borde">
      <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-x-8 gap-y-3 px-4 py-7 text-sm text-texto-2 sm:px-8">
        <span className="text-[22px] font-black tracking-display text-asfalto">{MARCA.logo}</span>
        <span className="flex-[1_1_480px] leading-normal">
          Evaluaciones editoriales independientes. Precios y costos son estimaciones referenciales; confirma condiciones con el
          concesionario y la entidad financiera.
        </span>
        <div className="flex gap-5">
          <Link href="/modelos" className="flex min-h-11 items-center text-texto-2">
            Todos los modelos
          </Link>
          <Link href="/terminos" className="flex min-h-11 items-center text-texto-2">
            Términos
          </Link>
          <Link href="/privacidad" className="flex min-h-11 items-center text-texto-2">
            Privacidad
          </Link>
        </div>
      </div>
    </footer>
  );
}
