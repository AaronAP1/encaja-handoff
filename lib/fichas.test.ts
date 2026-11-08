import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import detalleBrv from "@/data/detalle-honda-brv.json";
import modelosEjemplo from "@/data/modelos-ejemplo.json";
import { CATALOGO, fichaTecnica, transmisionTexto } from "./catalogo";
import { aModelo } from "./fichas/cargar";
import { FichaModelo, Precios, type FichaModelo as TFicha, type Precio } from "./fichas/esquema";
import { FICHAS, PRECIOS } from "./fichas/indice";
import { modeloDiseno } from "./fixtures/catalogo-diseno";
import fichasDiseno from "./fixtures/fichas-diseno.json";

const CARPETA = join(process.cwd(), "data", "modelos");
const leerJson = (ruta: string): unknown => JSON.parse(readFileSync(ruta, "utf8"));
const errores = (r: { success: boolean; error?: z.ZodError }) =>
  r.success ? [] : (r.error?.issues ?? []).map((i) => `${i.path.join(".")}: ${i.message}`);

describe("archivos de data/modelos", () => {
  const archivos = readdirSync(CARPETA).filter((a) => a.endsWith(".json") && !a.startsWith("_"));

  it.each(archivos)("%s cumple el esquema", (archivo) => {
    expect(errores(FichaModelo.safeParse(leerJson(join(CARPETA, archivo))))).toEqual([]);
  });

  it("el slug coincide con el nombre del archivo y todos están registrados en lib/fichas/indice.ts", () => {
    const registrados = FICHAS.map((f) => `${f.slug}.json`).sort();
    expect(registrados).toEqual([...archivos].sort());
  });

  it("data/precios.json cumple el esquema y apunta a versiones que existen", () => {
    const precios = leerJson(join(process.cwd(), "data", "precios.json"));
    expect(errores(Precios.safeParse(precios))).toEqual([]);
    const claves = PRECIOS.map((p) => `${p.modelo}/${p.version}`);
    expect(new Set(claves).size, "precio duplicado").toBe(claves.length);
    for (const p of PRECIOS) {
      const ficha = FICHAS.find((f) => f.slug === p.modelo);
      expect(ficha, `modelo ${p.modelo}`).toBeDefined();
      expect(ficha?.versiones.map((v) => v.id), `${p.modelo}`).toContain(p.version);
    }
  });

  it("la plantilla marca como error lo obligatorio hasta que se complete", () => {
    const r = FichaModelo.safeParse(leerJson(join(CARPETA, "_plantilla.json")));
    expect(r.success).toBe(false);
    const campos = errores(r).map((e) => e.split(":")[0]);
    expect(campos).toEqual(expect.arrayContaining(["slug", "versiones.0.asientos", "versiones.0.motor.litros", "textos.resumen"]));
  });
});

describe("datos con fuente", () => {
  const semilla = fichasDiseno as unknown as TFicha[];

  it("todo dato técnico sin fuente es el que vino en el paquete de diseño", () => {
    // Para cambiar o agregar un dato técnico hay que poner la url de la ficha oficial en esa versión.
    for (const f of FICHAS) {
      for (const v of f.versiones) {
        if (v.fuente.url !== null) continue;
        const original = semilla.find((s) => s.slug === f.slug)?.versiones.find((x) => x.id === v.id);
        expect(original, `${f.slug}/${v.id}: versión nueva sin fuente.url`).toBeDefined();
        expect({ ...v, fuente: null }, `${f.slug}/${v.id}: dato cambiado sin fuente.url`).toEqual({ ...original, fuente: null });
      }
    }
  });

  it("un precio o un conteo de talleres cargado lleva su url", () => {
    const precio = { modelo: "x", version: "y", precioListaUSD: 21000, rangoCostoMensual: null, fuente: { url: null, fecha: null } };
    expect(Precios.safeParse({ precios: [precio] }).success).toBe(false);
    const f = structuredClone(FICHAS[0]!);
    f.redTalleresRegiones = { valor: 30, fuente: { url: null, fecha: null } };
    expect(FichaModelo.safeParse(f).success).toBe(false);
  });

  it("el catálogo tiene slugs únicos", () => {
    const slugs = CATALOGO.map((m) => m.slug);
    expect(slugs.length).toBeGreaterThan(0);
    expect(new Set(slugs).size).toBe(slugs.length);
  });
});

describe("la copia fija del catálogo es fiel al paquete de diseño", () => {
  it("resumen y línea de motor salen tal cual de data/modelos-ejemplo.json", () => {
    const porId = { rush: "toyota-rush", brv: "honda-br-v", xpander: "mitsubishi-xpander-cross" } as const;
    for (const ej of modelosEjemplo) {
      const m = modeloDiseno(porId[ej.id as keyof typeof porId]);
      expect(m.nombre).toBe(ej.nombre);
      expect(m.motorResumen).toBe(ej.motor);
      expect(m.resumen).toBe(ej.resumen);
    }
  });

  it("la ficha y 'En tu vida real' de la BR-V salen tal cual de data/detalle-honda-brv.json", () => {
    const brv = modeloDiseno("honda-br-v");
    expect(brv.vidaReal).toEqual(detalleBrv.puntosVidaReal);
    const ficha = Object.fromEntries(fichaTecnica(brv).map((f) => [f.etiqueta, f.valor]));
    expect(ficha).toMatchObject({
      Motor: detalleBrv.fichaTecnica.motor,
      Potencia: detalleBrv.fichaTecnica.potencia,
      Torque: detalleBrv.fichaTecnica.torque,
      Transmisión: detalleBrv.fichaTecnica.transmision,
      Tracción: detalleBrv.fichaTecnica.traccion,
      "Altura al piso": detalleBrv.fichaTecnica.alturaAlPiso,
    });
  });

  it("la copia fija cumple el esquema", () => {
    for (const f of fichasDiseno) expect(errores(FichaModelo.safeParse(f))).toEqual([]);
  });
});

describe("versiones y precios", () => {
  const base = FICHAS.find((f) => f.slug === "honda-br-v")!;
  const versionMT = { ...base.versiones[0]!, id: "lx-mt", nombre: "LX MT", transmision: "MT" as const };
  const versionCVT = { ...base.versiones[0]!, id: "ex-cvt", nombre: "EX CVT", transmision: "CVT" as const };
  const ficha: TFicha = { ...base, versionReferencia: "ex-cvt", versiones: [versionMT, versionCVT] };
  const precio = (version: string, usd: number | null): Precio => ({
    modelo: "honda-br-v",
    version,
    precioListaUSD: usd,
    rangoCostoMensual: version === "ex-cvt" ? "3" : "2",
    fuente: { url: "https://ejemplo.pe/ficha", fecha: "2026-11-01" },
  });

  it("los veredictos usan la versión de referencia; el precio 'Desde' es el menor conocido", () => {
    const m = aModelo(ficha, [precio("lx-mt", 21000), precio("ex-cvt", 25000)]);
    expect(m.transmision).toBe("CVT");
    expect(m.version).toBe("EX CVT");
    expect(m.precioListaUSD).toBe(21000);
    expect(m.rangoCostoMensual).toBe("3");
    expect(transmisionTexto(m)).toBe("MT o CVT");
    expect(fichaTecnica(m)[0]).toEqual({ etiqueta: "Versión evaluada", valor: "EX CVT" });
  });

  it("sin precios conocidos el precio queda en null (placeholder)", () => {
    const m = aModelo(ficha, [precio("lx-mt", null)]);
    expect(m.precioListaUSD).toBeNull();
    expect(m.rangoCostoMensual).toBeNull();
  });
});

describe("el esquema atrapa errores típicos de carga", () => {
  const valida = () => structuredClone(FICHAS.find((f) => f.slug === "honda-br-v")!);

  it("altura al piso en centímetros en vez de milímetros", () => {
    const f = valida();
    f.versiones[0]!.alturaPisoMm = 21;
    expect(errores(FichaModelo.safeParse(f))).toEqual([expect.stringContaining("versiones.0.alturaPisoMm")]);
  });

  it("fuente con enlace pero sin fecha de consulta", () => {
    const f = valida();
    f.versiones[0]!.fuente = { url: "https://ejemplo.pe/ficha.pdf", fecha: null };
    expect(errores(FichaModelo.safeParse(f))).toEqual(["versiones.0.fuente.fecha: Si hay url, indica la fecha de consulta"]);
  });

  it("versión de referencia que no existe y ids repetidos", () => {
    const f = valida();
    f.versionReferencia = "no-existe";
    f.versiones.push({ ...f.versiones[0]! });
    const e = errores(FichaModelo.safeParse(f));
    expect(e).toContain("versiones: Hay versiones con el mismo id");
    expect(e).toContain('versionReferencia: versionReferencia "no-existe" no está en versiones');
  });

  it("campos con errores de tipeo no pasan", () => {
    const f = { ...valida(), traccon: "trasera" };
    expect(FichaModelo.safeParse(f).success).toBe(false);
  });

  it("un veredicto editorial sin porqué no pasa", () => {
    const f = valida();
    f.evaluacionEditorial.ciudad = { nivel: "Bien", porque: "" };
    expect(FichaModelo.safeParse(f).success).toBe(false);
  });
});

describe("esquemas JSON para autocompletar en el editor", () => {
  // Si cambias lib/fichas/esquema.ts, regenera con: npm run esquemas
  it("data/esquemas/modelo.json está al día", async () => {
    await expect(JSON.stringify(z.toJSONSchema(FichaModelo, { unrepresentable: "any" }), null, 2) + "\n").toMatchFileSnapshot(
      "../data/esquemas/modelo.json",
    );
  });

  it("data/esquemas/precios.json está al día", async () => {
    await expect(JSON.stringify(z.toJSONSchema(Precios, { unrepresentable: "any" }), null, 2) + "\n").toMatchFileSnapshot(
      "../data/esquemas/precios.json",
    );
  });
});
