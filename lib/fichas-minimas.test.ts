import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { CATALOGO } from "./catalogo";
import { FichasMinimas } from "./fichas/esquema";
import { datosVisibles, FICHAS_MINIMAS, paraQueVa, resumenesPorModelo } from "./fichas-minimas";
import { claveModelo, MERCADO } from "./mercado";

const ficha = (slug: string) => {
  const f = FICHAS_MINIMAS.find((x) => x.slug === slug);
  if (!f) throw new Error(`no existe la ficha ${slug}`);
  return f;
};
const nivel = (slug: string, dimension: string) => paraQueVa(ficha(slug)).find((u) => u.dimension === dimension)?.nivel ?? null;

describe("data/fichas-minimas.json", () => {
  it("cumple el esquema", () => {
    const r = FichasMinimas.safeParse(JSON.parse(readFileSync(join(process.cwd(), "data", "fichas-minimas.json"), "utf8")));
    expect(r.success ? [] : r.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`)).toEqual([]);
  });

  it("cada ficha es un modelo del listado, con el mismo tipo, y no repite uno ya evaluado completo", () => {
    const listado = new Map(MERCADO.marcas.flatMap((m) => m.modelos.map((x) => [claveModelo(m.marca, x.nombre), x] as const)));
    for (const f of FICHAS_MINIMAS) {
      const enListado = listado.get(claveModelo(f.marca, f.nombre));
      expect(enListado, `${f.marca} ${f.nombre}`).toBeDefined();
      expect(enListado?.tipo, f.slug).toBe(f.carroceria);
      expect(enListado?.slugEncaja, `${f.slug} ya está evaluado completo`).toBeNull();
    }
    expect(FICHAS_MINIMAS.map((f) => f.slug)).not.toContain(CATALOGO[0]?.slug);
  });

  it("cada dato tiene fuente https y cita; cada ficha da al menos un veredicto", () => {
    for (const f of FICHAS_MINIMAS) {
      for (const d of Object.values(f.datos)) {
        if (!d) continue;
        expect(d.fuente.url, f.slug).toMatch(/^https:\/\//);
        expect(d.cita.trim().length, f.slug).toBeGreaterThan(1);
      }
      expect(paraQueVa(f).some((u) => u.nivel !== null), `${f.slug} no da ningún veredicto`).toBe(true);
    }
  });
});

describe("para qué va cada modelo (reglas públicas sobre datos oficiales)", () => {
  it("trocha: altura bajo 200 mm es Difícil; con 4x4 y buena altura, Bien; con CVT, Justo", () => {
    expect(nivel("toyota-corolla", "trocha")).toBe("Difícil"); // 148 mm
    expect(nivel("suzuki-jimny-5-puertas", "trocha")).toBe("Bien"); // 210 mm y 4x4
    expect(nivel("toyota-raize", "trocha")).toBe("Justo"); // 200 mm y CVT
    expect(nivel("hyundai-creta", "trocha")).toBeNull(); // la ficha no da la altura
  });

  it("sierra según turbo; pasajeros según asientos; GLP según inyección o versión de fábrica", () => {
    expect(nivel("chery-tiggo-7", "sierra")).toBe("Bien");
    expect(nivel("toyota-raize", "sierra")).toBe("Justo");
    expect(nivel("suzuki-jimny-5-puertas", "pasajeros")).toBe("Difícil"); // 4 asientos
    expect(nivel("toyota-raize", "pasajeros")).toBeNull(); // la ficha no dice los asientos
    expect(nivel("toyota-yaris-sedan", "glp")).toBe("Bien");
    expect(nivel("renault-duster", "glp")).toBe("Justo"); // inyección directa
  });

  it("seguridad: frenado automático en alguna versión es Bien; sin él, Justo", () => {
    expect(nivel("renault-kardian", "seguridad")).toBe("Bien");
    expect(nivel("hyundai-creta", "seguridad")).toBe("Justo");
    expect(nivel("jetour-x70-fl", "seguridad")).toBeNull();
  });

  it("los datos visibles salen con su fuente y en orden", () => {
    const d = datosVisibles(ficha("suzuki-jimny-5-puertas"));
    expect(d.map((x) => x.etiqueta)).toEqual([
      "Asientos", "Altura al piso", "Tracción", "Transmisión", "Turbo", "Potencia", "Inyección", "Frenado automático",
    ]);
    expect(d[1]).toMatchObject({ valor: "210 mm", pagina: 2 });
    expect(Object.keys(resumenesPorModelo())).toContain("suzuki/jimny 5 puertas");
  });
});

describe("esquema JSON para el editor", () => {
  it("data/esquemas/fichas-minimas.json está al día", async () => {
    await expect(JSON.stringify(z.toJSONSchema(FichasMinimas, { unrepresentable: "any" }), null, 2) + "\n").toMatchFileSnapshot(
      "../data/esquemas/fichas-minimas.json",
    );
  });
});
