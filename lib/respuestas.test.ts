import { describe, expect, it } from "vitest";
import { consulta, elegir, escribirRespuestas, estaRespondida, hayPerfil, leerRespuestas, respuestasVacias } from "./respuestas";

describe("respuestas en la URL", () => {
  it("ida y vuelta sin perder nada", () => {
    let r = respuestasVacias();
    r = elegir(r, "pas", "6-7");
    r = elegir(r, "usos", "trocha");
    r = elegir(r, "usos", "ciudad");
    r = elegir(r, "km", "mucho");
    r = elegir(r, "carga", "viaje");
    r = elegir(r, "pres", "2");
    r = { ...r, comb: "glp", gusto: ["aventura", "urbano"] };
    const vuelta = leerRespuestas(escribirRespuestas(r));
    expect(vuelta).toEqual({ ...r, usos: { ciudad: true, trocha: true } });
  });

  it("escribe en orden estable y con comas legibles", () => {
    let r = respuestasVacias();
    r = elegir(r, "usos", "trocha");
    r = elegir(r, "usos", "ciudad");
    r = elegir(r, "pas", "6-7");
    expect(consulta(r)).toBe("?pas=6-7&usos=ciudad,trocha");
    expect(consulta(respuestasVacias())).toBe("");
  });

  it("ignora valores desconocidos o manipulados", () => {
    const r = leerRespuestas(new URLSearchParams("pas=9&usos=ciudad,luna,ciudad&km=&pres=7&gusto=urbano,x"));
    expect(r.pas).toBeNull();
    expect(r.usos).toEqual({ ciudad: true });
    expect(r.km).toBeNull();
    expect(r.pres).toBeNull();
    expect(r.gusto).toEqual(["urbano"]);
  });

  it("acepta el objeto searchParams de Next", () => {
    const r = leerRespuestas({ pas: ["5", "6-7"], usos: "sierra" });
    expect(r.pas).toBe("5");
    expect(r.usos).toEqual({ sierra: true });
  });

  it("multi-selección alterna y la simple reemplaza", () => {
    let r = elegir(respuestasVacias(), "usos", "sierra");
    expect(estaRespondida(r, "usos")).toBe(true);
    r = elegir(r, "usos", "sierra");
    expect(estaRespondida(r, "usos")).toBe(false);
    r = elegir(r, "trafico", "mucho");
    r = elegir(r, "trafico", "poco");
    expect(r.trafico).toBe("poco");
    expect(elegir(r, "trafico", "inventado")).toBe(r);
  });

  it("hayPerfil detecta cualquier respuesta, pero no el gusto solo", () => {
    expect(hayPerfil(respuestasVacias())).toBe(false);
    expect(hayPerfil({ ...respuestasVacias(), gusto: ["sobrio"] })).toBe(false);
    expect(hayPerfil(elegir(respuestasVacias(), "noche", "nunca"))).toBe(true);
  });
});
