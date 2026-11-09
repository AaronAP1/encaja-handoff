import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { CATALOGO } from "./catalogo";
import { Mercado } from "./fichas/esquema";
import { anclaMarca, enumerar, MARCAS_PENDIENTES, MERCADO, normalizarBusqueda, totalModelos } from "./mercado";

describe("data/mercado.json", () => {
  it("cumple el esquema", () => {
    const r = Mercado.safeParse(JSON.parse(readFileSync(join(process.cwd(), "data", "mercado.json"), "utf8")));
    expect(r.success ? [] : r.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`)).toEqual([]);
  });

  it("cada modelo evaluado apunta a un modelo que existe en el catálogo", () => {
    const slugs = new Set(CATALOGO.map((m) => m.slug));
    for (const marca of MERCADO.marcas)
      for (const m of marca.modelos) if (m.slugEncaja) expect(slugs, `${marca.marca} ${m.nombre}`).toContain(m.slugEncaja);
  });

  it("los modelos del catálogo de la web aparecen como evaluados", () => {
    const evaluados = MERCADO.marcas.flatMap((m) => m.modelos.flatMap((x) => (x.slugEncaja ? [x.slugEncaja] : [])));
    for (const m of CATALOGO) expect(evaluados, m.slug).toContain(m.slug);
  });

  it("los enlaces son https y las marcas no se repiten", () => {
    const marcas = MERCADO.marcas.map((m) => anclaMarca(m.marca));
    expect(new Set(marcas).size).toBe(marcas.length);
    for (const marca of MERCADO.marcas) {
      if (marca.sitio) expect(marca.sitio).toMatch(/^https:\/\//);
      for (const m of marca.modelos) if (m.url) expect(m.url).toMatch(/^https:\/\//);
    }
  });

  it("las marcas pendientes de la nota no están ya en el listado", () => {
    const presentes = new Set(MERCADO.marcas.map((m) => anclaMarca(m.marca)));
    for (const m of MARCAS_PENDIENTES) expect(presentes.has(anclaMarca(m)), m).toBe(false);
  });

  it("solo publica datos de identificación (nada de precios ni ficha sin revisar)", () => {
    expect(totalModelos()).toBeGreaterThan(100);
    for (const marca of MERCADO.marcas)
      for (const m of marca.modelos) expect(Object.keys(m).sort()).toEqual(["nombre", "slugEncaja", "tipo", "url"]);
  });
});

describe("búsqueda", () => {
  it("ignora tildes y mayúsculas", () => {
    expect(normalizarBusqueda("  Sedán ")).toBe("sedan");
    expect(anclaMarca("Omoda | Jaecoo")).toBe("omoda-jaecoo");
    expect(anclaMarca("Haval (GWM)")).toBe("haval-gwm");
  });

  it("enumera con coma y conjunción", () => {
    expect(enumerar([])).toBe("");
    expect(enumerar(["Ford"])).toBe("Ford");
    expect(enumerar(["Chevrolet", "Lexus"])).toBe("Chevrolet y Lexus");
    expect(enumerar(["Ford", "MG", "Jeep"], "ni")).toBe("Ford, MG ni Jeep");
  });
});

describe("esquema JSON para el editor", () => {
  it("data/esquemas/mercado.json está al día", async () => {
    await expect(JSON.stringify(z.toJSONSchema(Mercado, { unrepresentable: "any" }), null, 2) + "\n").toMatchFileSnapshot(
      "../data/esquemas/mercado.json",
    );
  });
});
