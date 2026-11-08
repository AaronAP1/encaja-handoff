import type { Deduccion } from "@/lib/deducciones";
import { Card } from "./Card";

interface Props {
  encajan: number;
  /** Nota bajo el contador ("catálogo de prueba") */
  notaContador: string;
  deducciones: Deduccion[];
}

/** "Modelos que encajan contigo" + "Lo que vamos entendiendo". Se anuncia con aria-live. */
export function LiveDeductionsPanel({ encajan, notaContador, deducciones }: Props) {
  return (
    <aside aria-live="polite" className="box-border flex max-w-full flex-[1_1_340px] flex-col gap-4">
      <Card className="flex flex-col gap-1 p-[22px]">
        <span className="text-[13px] text-texto-2">Modelos que encajan contigo</span>
        <span className="text-5xl font-extrabold leading-none">{encajan}</span>
        <span className="text-xs text-texto-2">{notaContador}</span>
      </Card>
      <Card className="flex flex-col gap-3.5 p-[22px]">
        <h2 className="m-0 text-base font-semibold">Lo que vamos entendiendo</h2>
        {deducciones.length === 0 ? (
          <p className="m-0 text-sm leading-normal text-texto-2">
            Aquí verás cómo traducimos tus respuestas a lo que tu auto necesita.
          </p>
        ) : (
          <ul className="m-0 flex list-none flex-col gap-3 p-0">
            {deducciones.map((d) => (
              <li key={d.que} className="flex items-start gap-2.5">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#1A56C4"
                  strokeWidth={2.4}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                  className="mt-0.5 shrink-0"
                >
                  <path d="M20 6L9 17l-5-5" />
                </svg>
                <span className="text-sm leading-normal">
                  <strong>{d.que}</strong> {d.porque}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </aside>
  );
}
