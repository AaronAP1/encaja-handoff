# 02 · Sistema de diseño

Identidad inspirada en la **señalización vial peruana**: letreros, hitos kilométricos, pista, perfil de los Andes.

## Color

| Token | Hex | Uso |
|---|---|---|
| `asfalto` | `#2A2D33` | Texto principal; mitad izquierda del hero |
| `azul` | `#1A56C4` | Acento: mitad derecha del hero (único fondo azul grande), botones, enlaces, selección, progreso |
| `azul-oscuro` | `#123E94` | Hover, texto azul sobre blanco |
| `blanco` | `#FFFFFF` | Fondo de todas las páginas y tarjetas |
| `borde` | `#D5D8DD` | Bordes de tarjetas (2 px) y divisores |
| `divisor` | `#E3E5E8` | Líneas internas finas, pistas de barras |
| `texto-2` | `#4E535C` | Texto secundario |
| `placeholder` | `#E4E9F1` | Espacios de foto |
| `pista` | `#6B7079` | Franja de "El camino" (gris carretera) |
| `cerro` | `#8A9099` | Suelo en ilustraciones |

Veredictos (siempre sólidos, texto blanco):

| Nivel | Hex | Forma |
|---|---|---|
| Bien | `#0E6B4E` | Círculo |
| Justo | `#B54E08` | Rombo |
| Difícil | `#B3261E` | Octágono (como "Pare") |

Terreno (solo en la ilustración costa → selva): arena `#D8AD6E`, tierra `#A9763F`, roca/puna `#7A6250`, nieve `#F2F4F7`, ceja de selva `#4E9A5B`, selva `#2E7B47`.

Reglas: sin cremas, sin pasteles, sin amarillo. El negro (asfalto) solo como texto y en la mitad izquierda del hero. Fuera del hero no hay bloques grandes azules ni negros: tarjetas blancas con borde.

## Tipografía

**Overpass** (derivada de la tipografía de carreteras). Una sola familia.

- Display (portada): 900 y 300, `clamp(34px, 6vw, 86px)`, `line-height: 0.95`, `letter-spacing: -0.03em`.
- Títulos de sección: 900, `clamp(30px, 4vw, 48px)`, `letter-spacing: -0.03em`.
- Títulos de tarjeta: 800, 20–26 px.
- Cuerpo: 400, 16–18 px, `line-height: 1.55`, máx. ~60ch.
- Secundario: 14–15 px en `texto-2`.
- Logotipo "encaja": 900, minúsculas, `letter-spacing: -0.03em`.

Evitar: etiquetas en mayúsculas con tracking, cadenas "A · B · C" con puntos medios, flechas → en botones.

## Forma y espacio

- Radios: 8 px (botones de letrero, chips), 10–14 px (tarjetas, botones), 18–22 px (tarjetas grandes), 999 px (pills de opción).
- Bordes 2 px `borde`; sin sombras grises genéricas.
- Contenedor máx. 1200–1240 px, padding lateral 32 px.
- Objetivos táctiles ≥ 44 px; botones principales 52–60 px de alto.

## Componentes clave

- **SignalIcon** `nivel: 'Bien' | 'Justo' | 'Difícil'` → SVG con forma correspondiente. Generador de paths en `docs/04-logica.md`.
- **VerdictChip** — forma + texto (ej. "Trocha: Bien").
- **OptionButton** — botón grande con título + subtítulo; seleccionado: borde azul 2 px + halo `rgba(26,86,196,0.25)`; `aria-pressed`.
- **HighwaySignButton** — CTA principal del hero: fondo asfalto, texto blanco, borde blanco 3 px y anillo exterior asfalto 3 px (aspecto de letrero).
- **KmPost** — hito kilométrico (64×76, borde azul 3 px, esquinas superiores redondeadas) para pasos secuenciales.
- **SplitCarHero** — ver `docs/03`.
- **LiveDeductionsPanel** — "Lo que vamos entendiendo": contador + lista de deducciones con check.
- **SwipeCard** — tarjeta arrastrable con sellos "Me gusta" / "No".
- **TerrainProfile** — SVG del perfil costa → sierra → selva con pisos de color.

## Movimiento

Solo dos momentos: la rotación del auto del hero (fundido 300 ms cada 5 s; se detiene al elegir un tipo; desactivada con `prefers-reduced-motion`) y el gesto de swipe. Nada de animaciones de entrada por sección.
