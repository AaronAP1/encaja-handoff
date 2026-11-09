import { describe, expect, it } from "vitest";
import { CATALOGO_DE_PRUEBA, contarEnCatalogoDePrueba } from "./contador";
import { deducciones } from "./deducciones";
import { PREGUNTAS, primeraSinResponder, TOTAL_PREGUNTAS } from "./preguntas";
import { elegir, respuestasVacias } from "./respuestas";
import { VALORES } from "./tipos";

describe("data/preguntas-flujo.json", () => {
  it("tiene las 6 preguntas en orden (sin la de tráfico, que se quitó)", () => {
    expect(TOTAL_PREGUNTAS).toBe(6);
    expect(PREGUNTAS.map((p) => p.key)).toEqual(["pas", "usos", "km", "noche", "carga", "pres"]);
  });

  it("cada opción usa un valor que el tipo Respuestas entiende", () => {
    for (const p of PREGUNTAS) {
      const permitidos: readonly string[] = VALORES[p.key];
      for (const o of p.opciones) expect(permitidos, `${p.key}=${o.v}`).toContain(o.v);
    }
  });

  it("solo usos y carga son de selección múltiple", () => {
    expect(PREGUNTAS.filter((p) => p.multi).map((p) => p.key)).toEqual(["usos", "carga"]);
  });

  it("primeraSinResponder salta lo pre-llenado", () => {
    let r = elegir(respuestasVacias(), "pas", "6-7");
    expect(primeraSinResponder(r)).toBe(1);
    r = elegir(r, "usos", "ciudad");
    r = elegir(r, "km", "poco");
    expect(primeraSinResponder(r)).toBe(3);
  });
});

describe("deducciones en vivo (tal cual el prototipo)", () => {
  it("sin respuestas no deduce nada", () => {
    expect(deducciones(respuestasVacias())).toEqual([]);
  });

  it("familia grande que viaja a la sierra con equipaje", () => {
    let r = respuestasVacias();
    r = elegir(r, "pas", "6-7");
    r = elegir(r, "usos", "sierra");
    r = elegir(r, "usos", "carretera");
    r = elegir(r, "km", "medio");
    r = elegir(r, "carga", "viaje");
    r = elegir(r, "pres", "3");
    expect(deducciones(r).map((d) => d.que)).toEqual([
      "Necesitas tercera fila.",
      "Fuerza en altura.",
      "El GLP probablemente te conviene.",
      "Maletero con la tercera fila en uso.",
      "Filtramos por costo mensual total.",
    ]);
  });

  it("km medio sin carretera no sugiere GLP", () => {
    const r = elegir(elegir(respuestasVacias(), "km", "medio"), "usos", "ciudad");
    expect(deducciones(r).some((d) => d.que.includes("GLP"))).toBe(false);
  });
});

describe("contador con el catálogo de prueba", () => {
  it("sin respuestas cuenta las 16 entradas", () => {
    expect(CATALOGO_DE_PRUEBA).toHaveLength(16);
    expect(contarEnCatalogoDePrueba(respuestasVacias())).toBe(16);
  });

  it("aplica los filtros del prototipo", () => {
    let r = elegir(respuestasVacias(), "pas", "6-7");
    expect(contarEnCatalogoDePrueba(r)).toBe(7);
    r = elegir(r, "usos", "trocha");
    expect(contarEnCatalogoDePrueba(r)).toBe(5);
    r = elegir(r, "pres", "2");
    expect(contarEnCatalogoDePrueba(r)).toBe(2);
    r = elegir(r, "km", "mucho");
    expect(contarEnCatalogoDePrueba(r)).toBe(2);
  });
});
