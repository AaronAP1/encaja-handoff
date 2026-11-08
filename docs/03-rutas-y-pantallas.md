# 03 · Rutas y pantallas

Referencia visual de cada ruta en `referencia-diseno/web/` (y `movil/` para las versiones apiladas).

| Ruta | Pantalla | Referencia |
|---|---|---|
| `/` | Landing | `web/01-landing.dc.html` |
| `/preguntas` | Flujo de 7 preguntas | `web/02-preguntas.dc.html` |
| `/descubre` | "No sé qué comprar" (swipe) | `web/03-descubre-swipe.dc.html` |
| `/situacion/[slug]` | Empezar por tu situación | `web/04-situacion.dc.html` |
| `/revisar/[modelo]` | ¿Te sirve este auto? | `web/05-revisar-modelo.dc.html` |
| `/resultados` | Perfil + opciones en vivo | `web/06-resultados.dc.html`, `movil/2-resultados` |
| `/auto/[slug]` | Detalle + costo mensual | `web/07-detalle-y-costo.dc.html`, `movil/3-detalle`, `movil/4-costo` |
| `/comparar?ids=a,b,c` | Comparar lado a lado | `web/08-comparar.dc.html` |
| `/como-evaluamos` | Metodología pública (por crear) | — |

Slugs de situación: `mi-primer-auto`, `familia-grande`, `viajo-a-provincia`, `lo-uso-para-trabajar`.

## `/` Landing (de arriba abajo)

1. **Hero partido.** Mitad izquierda asfalto, mitad derecha azul. Nav: logo blanco, "Cómo funciona", "Cómo evaluamos", botón "Empezar". Titular a dos columnas: "Que te / guste." (300, blanco) | "Y que te / sirva." (900, blanco). Encima de cada uno: "Pantalla grande, aros 18'' y buen diseño" | "Para tu uso: {perfil del auto actual}".
   Debajo, **SVG del auto partido en la línea central**: mitad izquierda sólida (como catálogo), mitad derecha en planos con líneas discontinuas blancas y 4 llamadas con veredicto + SignalIcon. Rota cada 5 s entre SUV, Sedán, Pick-up, Van, Hatchback (`data/siluetas-autos.json`, cada uno con su perfil y veredictos). Selector de tipo con 5 botones.
   CTA: **"Encuentra el que cumple las dos"** → `/preguntas`. Debajo: "1 minuto, sin registrarte y nadie te va a llamar" y enlace "¿No sabes qué comprar? Desliza autos y te armamos tu perfil" → `/descubre`.
2. **Franja de entradas** (blanca): "¿No sabes ni qué te gusta?" + botón "No sé qué comprar" → `/descubre`; "¿Ya tienes uno en mente?" + input con autocompletado + "Mira si te sirve" → `/revisar/[modelo]`; "O empieza por tu situación" + 4 chips → `/situacion/[slug]`.
3. **Dos carriles**: "Otros te preguntan por el auto. Nosotros, por tu vida." Tarjeta izquierda (preguntas típicas, gris) | separador discontinuo | tarjeta derecha (nuestras preguntas, título azul).
4. **"El camino, en tres kilómetros"**: franja gris carretera con línea blanca discontinua; 3 hitos KM sobre la pista con título y texto (`data/landing-contenido.json → pasos`).
5. **Ejemplo de resultado**: texto + leyenda de señales (Bien/Justo/Difícil) | tarjeta Honda BR-V con 3 veredictos y costo mensual placeholder.
6. **"De la costa a la sierra, evaluado para Perú"**: TerrainProfile + 4 columnas con muestra de color de terreno (`peru`).
7. **Independencia** (blanca, titular azul): "Ninguna marca paga por aparecer. Ni por subir en el ranking." + "Ver cómo evaluamos".
8. **Cierre**: tarjeta blanca "¿Cuál te sirve a ti?" + botón azul "Empezar ahora".
9. **Footer** con descargo legal.

## `/preguntas`

Dos columnas (se apilan en móvil). Izquierda: "Pregunta N de 7", sección, barra de progreso, título, ayuda, grilla de OptionButton (algunas preguntas multi-selección), Atrás / Siguiente (deshabilitado sin respuesta); en la última, "Ver los autos que encajan conmigo" → `/resultados?…`. Derecha (`aria-live`): contador "Modelos que encajan contigo" y "Lo que vamos entendiendo" con las deducciones. Preguntas en `data/preguntas-flujo.json`; reglas en `docs/04`.

## `/descubre`

Tarjeta arrastrable (pointer events, `touch-action: none`), umbral ±110 px, sellos "Me gusta"/"No" con opacidad según el arrastre, rotación `dx/22` grados. Botones X (rojo) y corazón (verde) como alternativa accesible. Contador "N de 10". Panel "Lo que vamos viendo de ti" con 5 barras. Al terminar: tarjeta azul de perfil (nombre, descripción, segundo rasgo, tipos que gustaron) + barras + bloque "Ya sabemos qué te gusta. Ahora veamos que te sirva" → `/preguntas` (pasar el perfil por URL) y "Volver a deslizar".

## `/situacion/[slug]`

Pestañas de las 4 situaciones (cambian la URL). Titular, introducción, "Tipos de auto que suelen encajar", 4 tarjetas "Lo que más importa en tu caso", recuadro "Errores comunes", y bloque "Ya sabemos {…}. Te faltan N preguntas" → `/preguntas` con respuestas pre-llenadas, o "Ver ejemplos ya" → `/resultados`. Datos en `data/situaciones.json`.

## `/revisar/[modelo]`

Buscador en el header. Foto + "¿Te sirve la {modelo}?". Izquierda: uso (multi), pasajeros, GLP sí/no. Derecha: tarjeta de veredicto con franja superior de color, filas de veredicto con porqué, alternativas que encajan mejor (si aplica), botones "Ver costo mensual" y "Comparar con otras opciones".

## `/resultados`

Panel lateral de perfil editable (uso, pasajeros, combustible, presupuesto) que actualiza en vivo; lista de tarjetas: foto, nombre, motor, resumen, 4 veredictos, costo mensual, "Ver detalle", casilla "Comparar". Barra inferior "N modelos seleccionados · Comparar lado a lado".

## `/auto/[slug]`

Hero con foto, nombre, precio placeholder, veredicto para tu perfil. Izquierda: "En tu vida real" (6 puntos con nivel y porqué) + ficha técnica. Derecha: calculadora de costo mensual (GLP/gasolina, plazo 36/48/60, km al mes, desglose de 6 conceptos, aviso de TCEA).

## `/comparar`

Recomendación en una frase según el perfil; tabla agrupada (Para tu uso / Costo / Técnico) con scroll horizontal en móvil; interruptor "Mostrar solo diferencias".
