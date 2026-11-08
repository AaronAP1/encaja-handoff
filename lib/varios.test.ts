import { describe, expect, it } from "vitest";
import { calcularCostoMensual, cuotaMensual, PARAMETROS_VACIOS, soles } from "./costo";
import { autoHero, SILUETAS } from "./hero";
import { leerEtiquetaVeredicto, senal } from "./senal";
import { respuestasDeSituacion, SITUACIONES } from "./situaciones";
import { calcularPerfil, rasgosDeCarroceria, TARJETAS } from "./swipe";
import { PREGUNTAS } from "./preguntas";
import { estaRespondida } from "./respuestas";

describe("señales", () => {
  it("Bien es un círculo, Justo un rombo y Difícil un octágono", () => {
    expect(senal("Bien", 13, 13, 9)).toEqual({ d: "M4,13 a9,9 0 1,0 18,0 a9,9 0 1,0 -18,0", fill: "#0E6B4E" });
    expect(senal("Justo", 13, 13, 9)).toEqual({ d: "M13,3 L23,13 L13,23 L3,13 Z", fill: "#B54E08" });
    const oct = senal("Difícil", 13, 13, 9);
    expect(oct.fill).toBe("#B3261E");
    expect(oct.d.match(/L/g)).toHaveLength(7);
  });

  it("lee etiquetas 'Uso: Nivel'", () => {
    expect(leerEtiquetaVeredicto("Sierra cargado: Justo")).toEqual({ uso: "Sierra cargado", nivel: "Justo" });
    expect(() => leerEtiquetaVeredicto("Trocha: Regular")).toThrow();
  });
});

describe("hero rotativo", () => {
  it("hay 5 tipos y cada uno con 4 llamadas válidas", () => {
    expect(SILUETAS.map((s) => s.tipo)).toEqual(["SUV", "Sedán", "Pick-up", "Van", "Hatchback"]);
    for (const s of SILUETAS) {
      const a = autoHero(s);
      expect(a.llamadas).toHaveLength(4);
      expect(a.aria).toContain(s.veredictosEjemplo.join(", "));
    }
  });

  it("reproduce la geometría del diseño para la SUV", () => {
    const a = autoHero(SILUETAS[0]!);
    expect(a.llamadas[0].guia).toBe("M470,88 L520,40 L740,40");
    expect(a.llamadas[1].guia).toBe("M470,118 L740,118");
    expect(a.llamadas[1].textoY).toBe(111);
  });
});

describe("perfil del swipe", () => {
  it("sin votos o sin 'me gusta' es 'Difícil de convencer'", () => {
    expect(calcularPerfil([]).perfil.nombre).toBe("Difícil de convencer");
    const todosNo = TARJETAS.map((_, i) => ({ i, gusta: false }));
    const p = calcularPerfil(todosNo);
    expect(p.perfil.nombre).toBe("Difícil de convencer");
    expect(p.segundo).toBe("");
    expect(p.gusto).toEqual([]);
  });

  it("le gustan los altos y robustos: Explorador", () => {
    // SUV robusta (0), Pick-up doble cabina (3), Hatchback aventurero (7), Pick-up todoterreno (8)
    const votos = TARJETAS.map((_, i) => ({ i, gusta: [0, 3, 7, 8].includes(i) }));
    const p = calcularPerfil(votos);
    expect(p.perfil.nombre).toBe("Explorador");
    expect(p.barras[0]).toMatchObject({ k: "aventura", pct: 100 });
    expect(p.tiposGusta).toEqual(["SUV", "Pick-up", "Hatchback"]);
    expect(p.gusto[0]).toBe("aventura");
    expect(p.segundo).toMatch(/^Con un toque de: /);
  });

  it("rasgos por carrocería salen de las tarjetas", () => {
    expect(rasgosDeCarroceria("Sedán")).toEqual(["urbano", "deportivo", "sobrio"]);
    expect(rasgosDeCarroceria("Crossover")).toEqual(rasgosDeCarroceria("SUV"));
  });
});

describe("situaciones", () => {
  it("las 4 situaciones dejan exactamente 'faltan' preguntas por responder", () => {
    expect(SITUACIONES.map((s) => s.slug)).toEqual(["mi-primer-auto", "familia-grande", "viajo-a-provincia", "lo-uso-para-trabajar"]);
    for (const s of SITUACIONES) {
      const r = respuestasDeSituacion(s.slug);
      const faltan = PREGUNTAS.filter((p) => !estaRespondida(r, p.key)).length;
      expect(faltan, s.slug).toBe(s.faltan);
    }
  });
});

describe("costo mensual", () => {
  it("sin datos todo queda como placeholder", () => {
    const c = calcularCostoMensual(PARAMETROS_VACIOS, "GLP");
    expect(c.total).toBeNull();
    expect(c.lineas.map((l) => l.concepto)).toEqual([
      "Cuota del crédito",
      "Combustible (GLP)",
      "Seguro vehicular",
      "Mantenimiento",
      "SOAT (prorrateado)",
      "Cochera y peajes",
    ]);
    expect(soles(c.total, "S/ [total]")).toBe("S/ [total]");
  });

  it("cuota de crédito francés", () => {
    expect(cuotaMensual(12000, 0, 12)).toBe(1000);
    // 10,000 a TCEA 12% (efectiva anual → 0.9489% mensual) en 12 meses ≈ 885.62
    expect(cuotaMensual(10000, 0.12, 12)).toBeCloseTo(885.62, 1);
  });

  it("suma todo cuando hay datos (valores ficticios solo para el test)", () => {
    const p = {
      ...PARAMETROS_VACIOS,
      precioUSD: 10000,
      tipoCambio: 1,
      inicial: 0,
      tcea: 0,
      plazoMeses: 48 as const,
      kmMes: 1000,
      rendimientoGlpKmLitro: 10,
      precioGlpLitro: 2,
      costoConversionGlp: 1200,
      mesesProrrateoConversion: 12,
      rendimientoGasolinaKmGalon: 40,
      precioGasolinaGalon: 16,
      seguroAnual: 1200,
      costoServicio: 500,
      soatAnual: 120,
    };
    const glp = calcularCostoMensual(p, "GLP");
    // 208.33 + (100*2 + 100) + 100 + 100 + 10 = 718.33
    expect(glp.total).toBeCloseTo(718.33, 1);
    const gas = calcularCostoMensual({ ...p, cocheraPeajesMes: 50 }, "Gasolina");
    // 208.33 + 400 + 100 + 100 + 10 + 50
    expect(gas.total).toBeCloseTo(868.33, 1);
  });
});
