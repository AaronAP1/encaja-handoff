import { z } from "zod";

/**
 * Esquema de los archivos de data/modelos/*.json y data/precios.json.
 *
 * Reglas para cargar datos (docs/05-pendientes-y-legal.md):
 * - Lo técnico va en `versiones` y cada versión lleva su `fuente` (ficha oficial Perú).
 * - Lo que es criterio propio va en `evaluacionEditorial` / `vidaReal`, separado de la ficha.
 * - Si un dato no está en la ficha, va `null`: nunca se estima ni se completa "a ojo".
 * - Lo que cambia seguido (precios) vive aparte, en data/precios.json, con su fecha.
 *
 * Las descripciones (.describe) aparecen en el editor al pasar el mouse sobre cada campo,
 * gracias a data/esquemas/*.json (se regeneran con `npm run esquemas`).
 * Este módulo solo se importa como valor en tests: la web usa los tipos, no zod.
 */

const fecha = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Usa el formato AAAA-MM-DD");

export const Fuente = z
  .strictObject({
    url: z.url().nullable().describe("Enlace a la ficha o página oficial de donde sale el dato"),
    fecha: fecha.nullable().describe("Día en que consultaste la fuente (AAAA-MM-DD)"),
    pagina: z.int().positive().nullable().optional().describe("Página del PDF, si aplica"),
    nota: z.string().min(1).nullable().optional(),
  })
  .refine((f) => f.url === null || f.fecha !== null, { message: "Si hay url, indica la fecha de consulta", path: ["fecha"] });

const Nivel = z.enum(["Bien", "Justo", "Difícil"]);

const Veredicto = z.strictObject({
  nivel: Nivel,
  porque: z.string().min(5, "Todo veredicto lleva su porqué").describe("Por qué, en palabras simples"),
});

export const Version = z.strictObject({
  id: z
    .string()
    .regex(/^[a-z0-9-]+$/, "Solo minúsculas, números y guiones")
    .describe('Identificador estable dentro del modelo: "base", "ex-cvt", "lx-mt"…'),
  nombre: z.string().min(1).nullable().describe('Nombre comercial de la versión ("EX CVT"); null si aún no se confirma'),
  anio: z.int().min(2000).max(2100).nullable().describe("Año modelo según la ficha"),
  asientos: z.int().min(2).max(9),
  terceraFila: z.enum(["adultos", "niños"]).nullable().describe("Para quién sirve la tercera fila; null si no tiene o no se sabe"),
  motor: z.strictObject({
    litros: z.number().positive().max(8).describe("Cilindrada en litros: 1.5"),
    descripcion: z.string().min(1).nullable().describe('Como en la ficha: "1.5 L i-VTEC, 4 cilindros"'),
    hp: z.number().positive().max(1000).nullable().describe("Potencia en HP (solo el número, puede tener decimales: 101.9)"),
    potenciaTexto: z.string().min(1).nullable().describe('Como en la ficha, con rpm: "119 HP @ 6600 rpm"'),
    torqueTexto: z.string().min(1).nullable().describe('Como en la ficha: "107 lb-pie @ 4300 rpm"'),
    turbo: z.boolean().nullable().describe("Decide el veredicto de sierra"),
    inyeccion: z.enum(["indirecta", "directa"]).nullable().describe("Indirecta suele permitir convertir a GLP"),
  }),
  transmision: z.enum(["MT", "AT", "CVT", "DCT"]).nullable(),
  traccion: z.enum(["delantera", "trasera", "4x4", "AWD"]),
  alturaPisoMm: z.int().min(100).max(400).nullable().describe("Altura al piso en MILÍMETROS (no centímetros)"),
  maleteroLitros: z.strictObject({
    conTerceraFila: z.int().min(0).max(3000).nullable().describe("Litros con la tercera fila en uso"),
    sinTerceraFila: z.int().min(0).max(3000).nullable().describe("Litros con la tercera fila plegada (o sin tercera fila)"),
  }),
  glpCompatible: z.boolean().nullable().describe("Si el motor admite conversión a GLP según la marca o la ficha"),
  seguridad: z.strictObject({
    airbags: z.int().min(0).max(12).nullable(),
    frenadoAutomatico: z.enum(["si", "no", "versiones-altas"]).nullable(),
    latinNcap: z.int().min(0).max(5).nullable().describe("Estrellas Latin NCAP (latinncap.com)"),
  }),
  fuente: Fuente.describe("Ficha oficial Perú de esta versión"),
});

const Dimensiones = ["ciudad", "carretera", "trocha", "sierra", "glp", "trafico", "seguridad", "talleres"] as const;

export const FichaModelo = z
  .strictObject({
    $schema: z.string().optional(),
    slug: z.string().regex(/^[a-z0-9-]+$/).describe("Igual al nombre del archivo, sin .json"),
    marca: z.string().min(1),
    nombre: z.string().min(1).describe('Nombre completo con marca: "Honda BR-V"'),
    articulo: z.enum(["el", "la"]).describe('"el" Toyota Rush, "la" Honda BR-V'),
    carroceria: z.enum(["SUV", "Sedán", "Hatchback", "Pick-up", "Van", "Crossover"]),
    versionReferencia: z.string().describe("id de la versión con la que se calculan los veredictos"),
    versiones: z.array(Version).min(1).describe("Una entrada por versión vendida en Perú"),
    redTalleresRegiones: z
      .strictObject({ valor: z.int().min(0).nullable(), fuente: Fuente })
      .refine((r) => r.valor === null || r.fuente.url !== null, {
        message: "Un conteo de talleres lleva la url de dónde salió",
        path: ["fuente", "url"],
      })
      .describe("Talleres oficiales fuera de Lima (es de la marca, no de la versión)"),
    textos: z.strictObject({
      motorResumen: z.string().min(1).describe('Línea bajo el nombre en resultados: "1.5 L · 119 HP · CVT"'),
      resumen: z.string().min(1),
      destaca: z.string().min(1).describe('Para /comparar: "… la Honda BR-V es más cómoda y segura"'),
      rasgoCorto: z.string().min(1).describe('Para alternativas en /revisar: "Trocha: Bien · tracción trasera"'),
    }),
    evaluacionEditorial: z
      .partialRecord(z.enum(Dimensiones), Veredicto)
      .describe("Criterio propio. Nunca contradice a las reglas cuando la ficha alcanza (lo verifica un test)"),
    vidaReal: z
      .array(z.strictObject({ titulo: z.string().min(1), nivel: Nivel, texto: z.string().min(5) }))
      .nullable()
      .describe('Puntos "En tu vida real" escritos a mano; null = se generan desde las reglas'),
  })
  .superRefine((f, ctx) => {
    const ids = f.versiones.map((v) => v.id);
    if (new Set(ids).size !== ids.length) ctx.addIssue({ code: "custom", message: "Hay versiones con el mismo id", path: ["versiones"] });
    if (!ids.includes(f.versionReferencia))
      ctx.addIssue({ code: "custom", message: `versionReferencia "${f.versionReferencia}" no está en versiones`, path: ["versionReferencia"] });
  });

export const Precio = z
  .strictObject({
    modelo: z.string().describe('slug del modelo: "honda-br-v"'),
    version: z.string().describe("id de la versión dentro del modelo"),
    precioListaUSD: z.int().positive().nullable().describe("Precio de lista en dólares, sin decimales"),
    rangoCostoMensual: z
      .enum(["1", "2", "3", "4"])
      .nullable()
      .describe("Rango de costo mensual total (1–4) para filtrar por presupuesto; null = por calcular"),
    fuente: Fuente,
  })
  .refine((p) => p.precioListaUSD === null || p.fuente.url !== null, {
    message: "Un precio cargado lleva la url de dónde salió",
    path: ["fuente", "url"],
  });

export const Precios = z.strictObject({
  $schema: z.string().optional(),
  precios: z.array(Precio),
});

/**
 * data/mercado.json: los modelos que cada marca vende en Perú (página /modelos).
 * Solo identificación: nombre, tipo y enlace. Lo generan los scripts de scraping/
 * (scraper.py y exportar_mercado.py); precios y fichas se publican aparte, ya revisados.
 */
export const TIPOS_MERCADO = ["SUV", "Sedán", "Hatchback", "Minivan", "Pick-up", "Van", "Otro"] as const;

export const ModeloMercado = z.strictObject({
  nombre: z.string().min(1),
  tipo: z.enum(TIPOS_MERCADO),
  /** Página del modelo en el sitio oficial; null si solo se conoce por un concesionario */
  url: z.url().nullable(),
  /** slug en data/modelos/ si ya está evaluado en la web */
  slugEncaja: z.string().regex(/^[a-z0-9-]+$/).nullable(),
});

export const Mercado = z
  .strictObject({
    $schema: z.string().optional(),
    actualizado: fecha,
    marcas: z
      .array(
        z.strictObject({
          marca: z.string().min(1),
          sitio: z.url().nullable().describe("Sitio oficial de la marca en Perú (null si no conviene enlazarlo)"),
          fuente: z.strictObject({
            tipo: z.enum(["oficial", "concesionario"]).describe("De dónde sale la lista de modelos"),
            fecha,
          }),
          modelos: z.array(ModeloMercado).min(1),
        }),
      )
      .min(1),
  })
  .superRefine((m, ctx) => {
    for (const [i, marca] of m.marcas.entries()) {
      const nombres = marca.modelos.map((x) => x.nombre.toLowerCase());
      if (new Set(nombres).size !== nombres.length)
        ctx.addIssue({ code: "custom", message: `${marca.marca}: modelos repetidos`, path: ["marcas", i, "modelos"] });
    }
  });

export type FichaModelo = z.infer<typeof FichaModelo>;
export type Version = z.infer<typeof Version>;
export type Precio = z.infer<typeof Precio>;
export type Precios = z.infer<typeof Precios>;
export type Mercado = z.infer<typeof Mercado>;
export type ModeloMercado = z.infer<typeof ModeloMercado>;
