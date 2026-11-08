# Cómo cargar una ficha

Cada modelo es un archivo `<slug>.json` en esta carpeta, con **una entrada por versión** vendida en Perú. Los precios van aparte, en `../precios.json`, porque cambian más seguido.

Si abres los archivos en VS Code, el editor autocompleta los campos, marca en rojo los errores y muestra qué significa cada campo al pasar el mouse (por el `"$schema"` del inicio).

## Pasos

1. Copia `_plantilla.json` como `<slug>.json`, por ejemplo `suzuki-xl7.json`. El `slug` del archivo y el de adentro deben ser iguales.
2. Llena los datos **desde la ficha oficial vendida en Perú**. Lo que esté en rojo es obligatorio. Si un dato no aparece en la ficha, déjalo en `null`: nunca lo estimes.
3. Agrega una entrada en `versiones` por cada versión (por ejemplo `lx-mt` y `ex-cvt`) y elige cuál es la `versionReferencia`: con esa se calculan los veredictos.
4. En cada versión completa `fuente`: `url` de la ficha, `fecha` en que la consultaste (AAAA-MM-DD) y `pagina` del PDF.
5. Agrega el precio de cada versión en `../precios.json`, con su propia `fuente` y `fecha`.
6. Registra el archivo en `lib/fichas/indice.ts`: impórtalo y súmalo a `FICHAS`. El orden de esa lista desempata los resultados.
7. Corre `npm test`. Si algo está mal, el test dice el archivo y el campo.

## Qué decide cada dato

| Campo | Regla que alimenta |
|---|---|
| `motor.turbo` | Sierra: sin turbo es Justo, con turbo es Bien |
| `transmision` | Mucho tráfico (manual es Justo) y trocha (CVT es Justo) |
| `alturaPisoMm` y `traccion` | Trocha (el umbral de altura aún está por validar) |
| `asientos` y `terceraFila` | 6 o 7 pasajeros |
| `glpCompatible` y `motor.inyeccion` | Convertir a GLP |
| `seguridad.frenadoAutomatico` | Seguridad si manejas seguido de noche o con lluvia |
| `redTalleresRegiones` | Talleres en provincia (umbrales por definir) |

Las reglas están en `lib/reglas.ts` y se publican en `/como-evaluamos`.

## Ficha técnica y criterio propio, separados

- `versiones` es **dato técnico**: siempre con fuente.
- `evaluacionEditorial` y `vidaReal` son **criterio propio**: úsalos solo para lo que la ficha no decide (ciudad, carretera, talleres…) y siempre con un porqué en palabras simples. Un test verifica que nunca contradigan a las reglas cuando la ficha alcanza.
- `textos` son las frases que se muestran en resultados, comparar y revisar.

## Errores que el esquema atrapa

- Altura al piso en centímetros (21) en vez de milímetros (210).
- Una `url` de fuente sin `fecha` de consulta.
- Una `versionReferencia` que no existe, o dos versiones con el mismo `id`.
- Campos con nombre mal escrito.
- Un veredicto editorial sin porqué.

## Extraer datos de un PDF con Claude

Pásale a Claude el PDF de la ficha y pídele que llene este esquema indicando la página de cada dato. Revisa cada valor contra el PDF antes de guardarlo: las comparaciones están sujetas al D. Leg. 1044 y los datos deben ser veraces y comprobables.

Si cambias `lib/fichas/esquema.ts`, regenera el autocompletado con `npm run esquemas`.
