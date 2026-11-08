# Encaja — instrucciones para Claude Code

Vas a construir **Encaja**, una web que ayuda a jóvenes en Perú a elegir auto según **cómo lo van a usar**, no según fichas técnicas. Todo el diseño, la copia y la lógica ya están definidos en este paquete: tu trabajo es implementarlos fielmente en Next.js.

## Stack

- Next.js (App Router) + TypeScript estricto
- Tailwind CSS (tokens en `docs/02-sistema-de-diseno.md` y `design-tokens.json`)
- Fuente: Overpass vía `next/font/google` (pesos 300, 400, 600, 800, 900)
- Sin librerías de UI pesadas. Componentes propios, accesibles.
- Estado del flujo: en la URL (search params) para que los resultados sean compartibles; `localStorage` solo como conveniencia.

## Cómo leer este paquete

1. `docs/01-producto.md` — qué es, para quién, principios. Léelo primero: explica el porqué de cada decisión.
2. `docs/02-sistema-de-diseno.md` — colores, tipografía, señales de veredicto, componentes.
3. `docs/03-rutas-y-pantallas.md` — mapa de rutas y qué tiene cada pantalla.
4. `docs/04-logica.md` — reglas de deducción, veredictos, perfil del swipe, costo mensual.
5. `docs/05-pendientes-y-legal.md` — datos que faltan y cuidados legales.
6. `data/*.json` — contenido real extraído de los diseños (preguntas, situaciones, tarjetas, siluetas SVG). Úsalo tal cual como datos semilla.
7. `referencia-diseno/` — los diseños originales en formato `.dc.html`. **Son referencia visual, no código para copiar**: usan un runtime propio (`support.js`, `<x-dc>`, `<sc-for>`, `{{huecos}}`) que no existe fuera del lienzo. Ábrelos como texto para ver estructura, estilos inline exactos y copia.

## Reglas

- La copia está en español peruano y ya fue revisada con el dueño del producto: no la reescribas.
- No inventes precios, potencias, alturas ni estadísticas. Lo que está entre corchetes (`[monto]`, `[HP]`, `[mm según ficha Perú]`) queda como placeholder visible hasta que haya datos reales.
- El azul solo es fondo grande en la portada. El resto de la web es blanca con texto oscuro; el azul queda para botones, enlaces y estados.
- Los veredictos siempre llevan **forma + color + texto** (círculo / rombo / octágono). Nunca solo color.
- Accesibilidad: botones reales, foco visible, objetivos táctiles ≥ 44 px, contraste AA, `prefers-reduced-motion` respetado (la rotación del hero y el swipe).
- Responsive desde 360 px. Los diseños móviles (`referencia-diseno/movil/`) muestran cómo se apilan las pantallas.
- Nombre "encaja" es provisional (ver `docs/05`). Centralízalo en una constante.

## Orden sugerido de construcción

1. Tokens + fuente + componentes base (Button, SignalIcon, VerdictChip, Card, OptionButton, ProgressBar).
2. Landing (`/`) con hero rotativo.
3. Flujo de preguntas (`/preguntas`) con panel de deducciones en vivo.
4. Resultados (`/resultados`), detalle con costo (`/auto/[slug]`), comparar (`/comparar`).
5. Entradas alternativas: `/revisar/[modelo]`, `/situacion/[slug]`, `/descubre` (swipe).
6. Capa de datos: catálogo tipado + motor de reglas en `lib/` con tests.
