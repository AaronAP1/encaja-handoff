const PERFIL =
  "M0,232 L60,226 L137,216 L250,192 L330,152 L412,122 L480,92 L540,62 L600,42 L650,50 L687,36 L740,62 L800,112 L880,170 L962,200 L1100,212";

/** Perfil del camino costa → sierra → selva con pisos de color (solo ilustración) */
export function TerrainProfile() {
  return (
    <svg
      viewBox="0 0 1100 260"
      className="block h-auto w-full"
      role="img"
      aria-label="Perfil del camino de la costa a la selva: arena en la costa, tierra en la subida, roca y nieve en la sierra alta, y vegetación al bajar a la selva"
    >
      <defs>
        <clipPath id="terreno-cerro">
          <path d={`${PERFIL} L1100,260 L0,260 Z`} />
        </clipPath>
      </defs>
      <g clipPath="url(#terreno-cerro)">
        <rect x="0" y="0" width="1100" height="260" fill="#A9763F" />
        <polygon points="0,0 250,0 330,260 0,260" fill="#D8AD6E" />
        <rect x="0" y="0" width="1100" height="104" fill="#7A6250" />
        <polygon points="760,104 1100,104 1100,260 740,260" fill="#4E9A5B" />
        <polygon points="850,150 1100,150 1100,260 830,260" fill="#2E7B47" />
        <rect x="0" y="0" width="1100" height="60" fill="#F2F4F7" />
        <path
          d="M520,72 L560,68 M610,58 L660,62 M700,56 L735,64"
          stroke="#FFFFFF"
          strokeWidth={3}
          strokeLinecap="round"
          fill="none"
        />
      </g>
      <path d={PERFIL} fill="none" stroke="#2A2D33" strokeWidth={2} />
      <path d={PERFIL} fill="none" stroke="#FFFFFF" strokeWidth={3} strokeDasharray="14 12" transform="translate(0,6)" />
      <g fill="#FFFFFF" stroke="#2A2D33" strokeWidth={4}>
        <circle cx="137" cy="216" r="10" />
        <circle cx="412" cy="122" r="10" />
        <circle cx="687" cy="36" r="10" />
        <circle cx="962" cy="200" r="10" />
      </g>
    </svg>
  );
}
