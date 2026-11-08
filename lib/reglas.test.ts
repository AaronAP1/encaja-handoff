import { describe, expect, it } from "vitest";
import modelosEjemplo from "@/data/modelos-ejemplo.json";
import { buscarModelo, buscarPorTexto, CATALOGO } from "./catalogo";
import {
  alternativas,
  dimensionesDelPerfil,
  encaja,
  evaluar,
  fraseParaTi,
  ORDEN_DIMENSIONES,
  recomendacion,
  REGLAS,
  resultados,
  veredictoGeneral,
  type Evaluacion,
  type Umbrales,
} from "./reglas";
import { elegir, respuestasVacias } from "./respuestas";
import type { Modelo, Respuestas } from "./tipos";

const brv = buscarModelo("honda-br-v")!;
const rush = buscarModelo("toyota-rush")!;
const xpander = buscarModelo("mitsubishi-xpander-cross")!;

/** Perfil del diseño: 6–7 pasajeros, ciudad, carretera, trocha, GLP */
function perfilDelDiseno(): Respuestas {
  let r = respuestasVacias();
  r = elegir(r, "pas", "6-7");
  r = elegir(r, "usos", "ciudad");
  r = elegir(r, "usos", "carretera");
  r = elegir(r, "usos", "trocha");
  return { ...r, comb: "glp" };
}

function base(parcial: Partial<Modelo>): Modelo {
  return { ...brv, editorial: {}, vidaReal: null, ...parcial };
}

const UMBRALES_DE_PRUEBA: Umbrales = { alturaMinimaTrochaMm: 200, talleresParaBien: 20, talleresParaJusto: 8 };

describe("catálogo", () => {
  it("coincide con data/modelos-ejemplo.json en los 4 veredictos del diseño", () => {
    const usoADimension = { Ciudad: "ciudad", Trocha: "trocha", "Sierra cargado": "sierra", "Usar GLP": "glp" } as const;
    const porId = { rush, brv, xpander };
    for (const ej of modelosEjemplo) {
      const m = porId[ej.id as keyof typeof porId];
      for (const v of ej.veredictos) {
        const dim = usoADimension[v.uso as keyof typeof usoADimension];
        expect(evaluar(m, dim, perfilDelDiseno()).veredicto?.nivel, `${ej.nombre} · ${v.uso}`).toBe(v.nivel);
      }
    }
  });

  it("no inventa precios, alturas ni potencias que no están en el paquete", () => {
    for (const m of CATALOGO) {
      expect(m.precioListaUSD).toBeNull();
      expect(m.alturaPisoMm).toBeNull();
    }
    expect(rush.motor.hp).toBeNull();
    expect(xpander.motor.hp).toBeNull();
    expect(brv.motor.hp).toBe(119);
  });

  it("todo veredicto lleva un porqué", () => {
    for (const m of CATALOGO)
      for (const d of ORDEN_DIMENSIONES) {
        const e = evaluar(m, d, perfilDelDiseno());
        if (e.veredicto) expect(e.veredicto.porque.length, `${m.slug} · ${d}`).toBeGreaterThan(5);
      }
  });

  it("la evaluación editorial nunca contradice a la regla cuando la ficha alcanza", () => {
    // con umbrales hipotéticos para forzar a las reglas a decidir donde puedan
    for (const m of CATALOGO) {
      for (const d of ORDEN_DIMENSIONES) {
        if (d === "pasajeros") continue;
        const ed = m.editorial[d];
        const regla = REGLAS[d].evaluar(m, perfilDelDiseno(), UMBRALES_DE_PRUEBA);
        if (ed && regla) expect(ed.nivel, `${m.slug} · ${d}`).toBe(regla.nivel);
      }
    }
  });

  it("busca modelos por lo que la persona escribe", () => {
    expect(buscarPorTexto("Honda BR-V")?.slug).toBe("honda-br-v");
    expect(buscarPorTexto("brv")?.slug).toBe("honda-br-v");
    expect(buscarPorTexto("  rush ")?.slug).toBe("toyota-rush");
    expect(buscarPorTexto("xpander")?.slug).toBe("mitsubishi-xpander-cross");
    expect(buscarPorTexto("Suzuki XL7")).toBeUndefined();
    expect(buscarPorTexto("a")).toBeUndefined();
  });
});

describe("reglas declarativas (docs/04)", () => {
  const r = perfilDelDiseno();

  it("sierra: sin turbo Justo, con turbo Bien, sin dato null", () => {
    expect(REGLAS.sierra.evaluar(base({ motor: { ...brv.motor, turbo: false } }), r, UMBRALES_DE_PRUEBA)?.nivel).toBe("Justo");
    expect(REGLAS.sierra.evaluar(base({ motor: { ...brv.motor, turbo: true } }), r, UMBRALES_DE_PRUEBA)?.nivel).toBe("Bien");
    expect(REGLAS.sierra.evaluar(base({ motor: { ...brv.motor, turbo: null } }), r, UMBRALES_DE_PRUEBA)).toBeNull();
  });

  it("trocha: altura baja Difícil; CVT Justo; AT/MT o tracción trasera Bien", () => {
    const t = (p: Partial<Modelo>) => REGLAS.trocha.evaluar(base(p), r, UMBRALES_DE_PRUEBA)?.nivel;
    expect(t({ alturaPisoMm: 170, transmision: "AT" })).toBe("Difícil");
    expect(t({ alturaPisoMm: 210, transmision: "CVT" })).toBe("Justo");
    expect(t({ alturaPisoMm: 210, transmision: "MT" })).toBe("Bien");
    expect(t({ alturaPisoMm: 210, transmision: "CVT", traccion: "trasera" })).toBe("Bien");
    expect(t({ alturaPisoMm: null })).toBeUndefined();
    // sin umbral validado tampoco decide
    expect(REGLAS.trocha.evaluar(base({ alturaPisoMm: 210 }), r, { ...UMBRALES_DE_PRUEBA, alturaMinimaTrochaMm: null })).toBeNull();
  });

  it("6–7 pasajeros: tercera fila niños Justo, adultos Bien, 5 asientos Difícil", () => {
    const p = (m: Partial<Modelo>) => REGLAS.pasajeros.evaluar(base(m), r, UMBRALES_DE_PRUEBA)?.nivel;
    expect(p({ asientos: 7, terceraFila: "niños" })).toBe("Justo");
    expect(p({ asientos: 7, terceraFila: "adultos" })).toBe("Bien");
    expect(p({ asientos: 5, terceraFila: null })).toBe("Difícil");
  });

  it("GLP: compatible Bien, inyección directa Justo", () => {
    const g = (m: Partial<Modelo>) => REGLAS.glp.evaluar(base(m), r, UMBRALES_DE_PRUEBA)?.nivel;
    expect(g({ glpCompatible: true })).toBe("Bien");
    expect(g({ glpCompatible: null, motor: { ...brv.motor, inyeccion: "indirecta" } })).toBe("Bien");
    expect(g({ glpCompatible: null, motor: { ...brv.motor, inyeccion: "directa" } })).toBe("Justo");
  });

  it("mucho tráfico: manual Justo, automática Bien", () => {
    expect(REGLAS.trafico.evaluar(base({ transmision: "MT" }), r, UMBRALES_DE_PRUEBA)?.nivel).toBe("Justo");
    expect(REGLAS.trafico.evaluar(base({ transmision: "CVT" }), r, UMBRALES_DE_PRUEBA)?.nivel).toBe("Bien");
  });

  it("talleres según red regional y umbrales", () => {
    const t = (n: number | null) => REGLAS.talleres.evaluar(base({ redTalleresRegiones: n }), r, UMBRALES_DE_PRUEBA)?.nivel;
    expect(t(25)).toBe("Bien");
    expect(t(10)).toBe("Justo");
    expect(t(3)).toBe("Difícil");
    expect(t(null)).toBeUndefined();
  });

  it("dimensiones que importan según lo que contaste", () => {
    expect(dimensionesDelPerfil(perfilDelDiseno())).toEqual(["ciudad", "carretera", "trocha", "pasajeros", "glp", "talleres"]);
    expect(dimensionesDelPerfil({ ...respuestasVacias(), km: "mucho", comb: "gasolina" })).toEqual([]);
    expect(dimensionesDelPerfil({ ...respuestasVacias(), km: "mucho" })).toEqual(["glp"]);
  });
});

describe("resultados", () => {
  it("con el perfil del diseño encajan los 3 modelos, en el orden del diseño", () => {
    const res = resultados(perfilDelDiseno());
    // Rush suma más; BR-V y Xpander empatan y se desempata por orden del catálogo
    expect(res.map((x) => x.modelo.slug)).toEqual(["toyota-rush", "honda-br-v", "mitsubishi-xpander-cross"]);
  });

  it("un Difícil en lo que marcaste lo saca de la lista", () => {
    const cincoAsientos = base({ slug: "cinco", asientos: 5, terceraFila: null });
    expect(encaja(cincoAsientos, perfilDelDiseno())).toBe(false);
    expect(resultados(perfilDelDiseno(), [cincoAsientos, brv]).map((x) => x.modelo.slug)).toEqual(["honda-br-v"]);
  });

  it("el presupuesto filtra solo cuando se conoce el costo", () => {
    const caro = base({ slug: "caro", rangoCostoMensual: "4" });
    const r = elegir(respuestasVacias(), "pres", "2");
    expect(encaja(caro, r)).toBe(false);
    expect(encaja(brv, r)).toBe(true);
  });

  it("el gusto del swipe ordena, pero no mete modelos que no sirven", () => {
    const pickup = base({ slug: "pickup", carroceria: "Pick-up", asientos: 5, terceraFila: null });
    const sedan = base({ slug: "sedan", carroceria: "Sedán", asientos: 5, terceraFila: null });
    const r: Respuestas = { ...respuestasVacias(), gusto: ["sobrio"] };
    expect(resultados(r, [pickup, sedan]).map((x) => x.modelo.slug)).toEqual(["sedan", "pickup"]);
    const familia: Respuestas = { ...elegir(respuestasVacias(), "pas", "6-7"), gusto: ["sobrio"] };
    expect(resultados(familia, [pickup, sedan, brv]).map((x) => x.modelo.slug)).toEqual(["honda-br-v"]);
  });
});

describe("frases", () => {
  const e = (nivel: "Bien" | "Justo" | "Difícil"): Evaluacion => ({ dimension: "ciudad", veredicto: { nivel, porque: "x" }, origen: "regla" });

  it("veredicto general de /revisar (umbrales del prototipo)", () => {
    expect(veredictoGeneral([e("Bien"), e("Bien")]).titulo).toBe("Te sirve bien");
    expect(veredictoGeneral([e("Bien"), e("Justo")]).titulo).toBe("Te sirve, con 1 cosa a tener en cuenta");
    expect(veredictoGeneral([e("Justo"), e("Justo")]).titulo).toBe("Te sirve, con 2 cosas a tener en cuenta");
    expect(veredictoGeneral([e("Justo"), e("Justo"), e("Justo")]).titulo).toBe("Hay opciones que te sirven mejor");
    expect(veredictoGeneral([e("Bien"), e("Difícil")]).titulo).toBe("Hay opciones que te sirven mejor");
  });

  it("BR-V en /revisar con el estado inicial del diseño", () => {
    let r = respuestasVacias();
    r = elegir(r, "usos", "ciudad");
    r = elegir(r, "usos", "carretera");
    r = elegir(r, "usos", "trocha");
    r = { ...elegir(r, "pas", "6-7"), comb: "glp" };
    const filas = (["ciudad", "carretera", "trocha", "sierra", "pasajeros", "glp"] as const)
      .filter((d) => REGLAS[d].aplica(r))
      .map((d) => evaluar(brv, d, r));
    expect(filas.map((f) => f.veredicto?.nivel)).toEqual(["Bien", "Bien", "Justo", "Justo", "Bien"]);
    expect(veredictoGeneral(filas).titulo).toBe("Te sirve, con 2 cosas a tener en cuenta");
  });

  it("frase 'para ti' de la ficha", () => {
    const r = perfilDelDiseno();
    const evals = (["ciudad", "carretera", "trocha", "pasajeros", "glp"] as const).map((d) => evaluar(brv, d, r));
    expect(fraseParaTi(evals, r)).toBe("Encaja bien en ciudad y carretera. Tiene 2 cosas que debes saber antes de comprar.");
    expect(fraseParaTi([], r)).toBeNull();
  });

  it("recomendación de /comparar igual a la del diseño", () => {
    const seg = recomendacion([rush, brv, xpander], perfilDelDiseno());
    expect(seg?.map((s) => s.texto).join("")).toBe(
      "Si vas a trocha seguido, el Toyota Rush. Si casi todo es ciudad y carretera, la Honda BR-V es más cómoda y segura.",
    );
    expect(seg?.filter((s) => s.fuerte).map((s) => s.texto)).toEqual(["Toyota Rush", "Honda BR-V"]);
    expect(recomendacion([brv], perfilDelDiseno())).toBeNull();
  });

  it("alternativas de /revisar para la BR-V con trocha", () => {
    const alt = alternativas(brv, perfilDelDiseno());
    expect(alt?.titulo).toBe("Si la trocha es frecuente, estas encajan mejor");
    expect(alt?.lista.map((a) => [a.modelo.nombre, a.por])).toEqual([
      ["Toyota Rush", "Trocha: Bien · tracción trasera"],
      ["Mitsubishi Xpander Cross", "Trocha: Bien · suspensión cómoda en ripio"],
    ]);
    expect(alternativas(rush, perfilDelDiseno())).toBeNull();
  });
});
