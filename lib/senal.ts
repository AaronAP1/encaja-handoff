import type { Nivel } from "./tipos";

/** Colores de veredicto (siempre sólidos, texto blanco) */
export const COLOR_NIVEL: Record<Nivel, string> = {
  Bien: "#0E6B4E",
  Justo: "#B54E08",
  Difícil: "#B3261E",
};

/** Forma de cada señal: nunca solo color */
export const FORMA_NIVEL: Record<Nivel, "círculo" | "rombo" | "octágono"> = {
  Bien: "círculo",
  Justo: "rombo",
  Difícil: "octágono",
};

/**
 * Path SVG de la señal de veredicto (docs/04-logica.md → Señales).
 * Bien = círculo, Justo = rombo, Difícil = octágono (como "Pare").
 */
export function senal(nivel: Nivel, cx: number, cy: number, r: number): { d: string; fill: string } {
  if (nivel === "Bien") {
    return {
      d: `M${cx - r},${cy} a${r},${r} 0 1,0 ${2 * r},0 a${r},${r} 0 1,0 ${-2 * r},0`,
      fill: COLOR_NIVEL.Bien,
    };
  }
  if (nivel === "Justo") {
    return {
      d: `M${cx},${cy - r - 1} L${cx + r + 1},${cy} L${cx},${cy + r + 1} L${cx - r - 1},${cy} Z`,
      fill: COLOR_NIVEL.Justo,
    };
  }
  const pts = Array.from({ length: 8 }, (_, k) => {
    const a = Math.PI / 8 + (k * Math.PI) / 4;
    return `${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`;
  });
  return { d: `M${pts.join(" L")} Z`, fill: COLOR_NIVEL["Difícil"] };
}

/** Convierte "Trocha: Bien" en { uso, nivel } (formato de data/siluetas-autos.json) */
export function leerEtiquetaVeredicto(texto: string): { uso: string; nivel: Nivel } {
  const [uso = texto, nivel = ""] = texto.split(": ");
  if (nivel !== "Bien" && nivel !== "Justo" && nivel !== "Difícil") {
    throw new Error(`Veredicto inválido en "${texto}"`);
  }
  return { uso, nivel };
}
