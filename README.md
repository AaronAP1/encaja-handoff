# Paquete de traspaso — Encaja (comparador de autos por uso real)

Contenido:

- `CLAUDE.md` — instrucciones para la sesión de Claude Code (empieza aquí)
- `docs/` — producto, sistema de diseño, rutas, lógica, pendientes y legal
- `data/` — contenido y datos semilla en JSON
- `design-tokens.json` y `docs/tailwind-tema.css` — tokens listos para usar
- `referencia-diseno/` — diseños originales del lienzo (referencia visual)

Para empezar en Claude Code: copia esta carpeta dentro de tu repo (por ejemplo en `/handoff`) y pide: "Lee handoff/CLAUDE.md y construye el proyecto en Next.js siguiendo el orden sugerido".

---

## Proyecto Next.js (implementación)

La web está construida en esta misma carpeta: Next.js 16 (App Router) + TypeScript estricto + Tailwind 4 + Overpass.

```bash
npm install
npm run dev        # http://localhost:3000
npm test           # tests de lib/ (vitest)
npm run lint
npm run typecheck
npm run build
```

### Estructura

- `app/` — rutas: `/`, `/preguntas`, `/resultados`, `/auto/[slug]`, `/comparar`, `/revisar/[modelo]`, `/situacion/[slug]`, `/descubre`, `/como-evaluamos`, `/terminos`, `/privacidad`.
- `components/` — base: `Button`, `SignalIcon`, `VerdictChip`, `Card`, `OptionButton`, `ProgressBar`, `KmPost`, `SplitCarHero`, `LiveDeductionsPanel`, `SwipeCard`, `TerrainProfile`, `CarSilhouette`.
- `lib/` — lógica pura con tests: `reglas.ts` (motor de reglas), `catalogo.ts`, `deducciones.ts`, `contador.ts`, `respuestas.ts` (estado en la URL), `swipe.ts`, `costo.ts`, `situaciones.ts`, `hero.ts`, `senal.ts`. El nombre provisional está en `lib/marca.ts`.
- `data/modelos/` — **catálogo real**: un JSON por modelo, con una entrada por versión y la fuente de cada dato. Guía de carga en [data/modelos/LEEME.md](data/modelos/LEEME.md). Esquema y validación en `lib/fichas/`.
- `data/precios.json` — precio de lista por versión, con fecha y fuente (separado porque cambia más seguido).
- `data/mercado.json` — listado de los modelos que cada marca vende en Perú (solo nombre, tipo y enlace oficial) para la página `/modelos`. Se genera con `scraping/exportar_mercado.py` después de una pasada del scraper (`scraping/LEEME.md`).
- `data/esquemas/` — esquemas JSON generados para autocompletar en el editor (`npm run esquemas`).
- El resto de `data/*.json` son los datos semilla del paquete de diseño; un test verifica que el catálogo siga fiel a ellos.

`npm run build` corre primero los tests (`prebuild`), así que una ficha mal cargada frena el build.

### Cómo decide el motor (`lib/reglas.ts`)

Cada aspecto (ciudad, trocha, sierra, pasajeros, GLP, tráfico, seguridad, talleres) tiene una regla declarativa sobre la ficha técnica (docs/04). Si falta un dato de la ficha o un umbral aún no validado, la regla no decide y se usa la evaluación editorial del catálogo; si tampoco hay, se muestra `[por evaluar]` (nunca un veredicto inventado). Un test verifica que lo editorial nunca contradiga a la regla.

### Pendiente de revisar con el dueño del producto

- **Respuestas pre-llenadas por situación** (`lib/situaciones.ts`): el paquete no dice cuáles; se eligieron 2 por situación para que "Te faltan 5 preguntas" sea cierto.
- **Copia nueva mínima** (no estaba en el paquete): estados vacíos ("Ningún modelo del catálogo encaja…", "Marca tu uso y aquí aparece el veredicto.", "Aún no evaluamos ese modelo"), aviso de "Guardar mi búsqueda", textos de criterio en `/como-evaluamos`, porqués de reglas que hoy no se muestran (turbo, inyección directa, caja manual) y `destaca`/`rasgoCorto` de cada modelo (tomados de su resumen).
- **Porqués faltantes**: Toyota Rush (ciudad) y Mitsubishi Xpander Cross (ciudad, talleres) muestran `[Porqué por redactar con la ficha oficial]`.
- **Contador del flujo**: sigue usando el catálogo de prueba de 16 entradas (`USAR_CATALOGO_DE_PRUEBA` en `lib/contador.ts`).
- **Enlace "Comparar créditos vehiculares"**: quitado hasta definir el destino. Términos y Privacidad son placeholders.
- **Desvíos del diseño por las reglas de CLAUDE.md/docs 02**: la tarjeta de perfil del swipe es blanca con borde azul (no bloque azul), sin etiquetas en mayúsculas con tracking, y los chips de veredicto llevan forma además de color y texto. "Suzuki XL7" no está en el autocompletado porque no hay ningún dato suyo.
