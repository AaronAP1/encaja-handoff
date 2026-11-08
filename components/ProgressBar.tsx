interface Props {
  /** 0–100 */
  valor: number;
  etiqueta: string;
}

export function ProgressBar({ valor, etiqueta }: Props) {
  const v = Math.max(0, Math.min(100, Math.round(valor)));
  return (
    <div
      role="progressbar"
      aria-label={etiqueta}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={v}
      className="h-1.5 overflow-hidden rounded-[3px] bg-borde"
    >
      <div className="h-1.5 bg-azul transition-[width] duration-200" style={{ width: `${v}%` }} />
    </div>
  );
}
