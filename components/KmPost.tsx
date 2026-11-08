/** Hito kilométrico: 64×76, borde azul 3 px, esquinas superiores redondeadas */
export function KmPost({ n }: { n: string }) {
  return (
    <span
      className="flex h-[76px] w-16 flex-col items-center justify-center self-start rounded-[32px_32px_6px_6px] border-[3px] border-azul bg-white font-black leading-none text-azul-oscuro"
      aria-label={`Kilómetro ${n}`}
      role="img"
    >
      <span className="text-xs font-extrabold" aria-hidden="true">
        KM
      </span>
      <span className="text-[28px]" aria-hidden="true">
        {n}
      </span>
    </span>
  );
}
