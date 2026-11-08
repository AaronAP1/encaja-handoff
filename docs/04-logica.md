# 04 · Lógica

Toda la lógica vive en `lib/` como funciones puras con tests. Los diseños usan reglas simplificadas para prototipo; aquí están tal cual, más el modelo de datos recomendado para hacerlas reales.

## Escala de veredictos

- **Bien**: te sirve para eso.
- **Justo**: funciona, con cuidado.
- **Difícil**: no es para eso.

Cada veredicto siempre lleva un texto corto de **por qué**. Nunca "compra este" ni "no compres este".

## Modelo de datos sugerido

```ts
type Nivel = 'Bien' | 'Justo' | 'Difícil';

interface Modelo {
  slug: string; marca: string; nombre: string; version: string;
  carroceria: 'SUV' | 'Sedán' | 'Hatchback' | 'Pick-up' | 'Van' | 'Crossover';
  precioListaUSD: number | null;          // null = placeholder
  asientos: number; terceraFila?: 'adultos' | 'niños';
  motor: { cc: number; hp: number | null; turbo: boolean; inyeccion: 'indirecta' | 'directa' };
  transmision: 'MT' | 'AT' | 'CVT' | 'DCT';
  traccion: 'delantera' | 'trasera' | '4x4' | 'AWD';
  alturaPisoMm: number | null;
  maleteroLitros: { conTerceraFila?: number; sinTerceraFila?: number };
  glpCompatible: boolean;                  // en la práctica: inyección indirecta
  seguridad: { airbags: number; frenadoAutomatico: boolean; latinNcap?: number };
  redTalleresRegiones: number | null;
  fuente: { url: string; fecha: string };  // ficha oficial Perú
}

interface Respuestas {
  pasajeros: '1-2' | '3-4' | '5' | '6-7';
  usos: { ciudad?: boolean; carretera?: boolean; trocha?: boolean; sierra?: boolean };
  km: 'poco' | 'medio' | 'mucho' | 'nose';
  trafico: 'mucho' | 'algo' | 'poco';
  noche: 'seguido' | 'aveces' | 'nunca';
  carga: { bebe?: boolean; mercado?: boolean; viaje?: boolean; trabajo?: boolean };
  presupuestoMensual: 1 | 2 | 3 | 4;       // rangos por definir
}
```

## Reglas de traducción sugeridas (evaluación de un modelo para un uso)

Escríbelas como reglas declarativas `(modelo, respuestas) => { uso, nivel, porque }` y publícalas en `/como-evaluamos`:

- **Sierra cargado**: sin turbo → Justo ("sobre 3,000 m pierde fuerza"); turbo → Bien.
- **Trocha**: altura < umbral → Difícil; altura ok + CVT → Justo ("la CVT se esfuerza en barro"); altura ok + AT/MT o tracción trasera/4x4 → Bien.
- **6–7 pasajeros**: tercera fila solo niños → Justo; adultos → Bien; 5 asientos → Difícil.
- **GLP**: inyección indirecta → Bien (con aviso de la llanta de repuesto y la garantía); directa → Justo/Difícil.
- **Talleres en provincia**: según red regional (umbrales por definir).
- **Mucho tráfico**: MT → Justo; AT/CVT → Bien.

Los umbrales (mm, HP, talleres) deben validarse con mecánicos y conductores de provincia antes de publicarse.

## Deducciones en vivo del flujo (`/preguntas`, panel "Lo que vamos entendiendo")

Tal cual el prototipo (`r` = respuestas):

```js
const d = [];
    if (r.pas === '6-7') d.push({ que: 'Necesitas tercera fila.', porque: 'Buscamos 7 asientos reales, no solo de emergencia.' });
    if (r.pas === '5') d.push({ que: 'Cinco cómodos.', porque: 'Revisamos que atrás quepan tres sin apretarse.' });
    if (r.usos.trocha) d.push({ que: 'Altura al piso alta.', porque: 'Y evitamos cajas que sufren en barro profundo.' });
    if (r.usos.sierra) d.push({ que: 'Fuerza en altura.', porque: 'Un motor sin turbo pierde potencia sobre 3,000 m.' });
    if (r.km === 'mucho' || (r.km === 'medio' && r.usos.carretera)) d.push({ que: 'El GLP probablemente te conviene.', porque: 'Calculamos en cuánto tiempo recuperas la conversión.' });
    if (r.trafico === 'mucho') d.push({ que: 'Automática.', porque: 'Con tanto tráfico, te cambia el día a día.' });
    if (r.noche === 'seguido') d.push({ que: 'Seguridad activa.', porque: 'Priorizamos frenado automático y buenos faros.' });
    if (r.carga.viaje && r.pas === '6-7') d.push({ que: 'Maletero con la tercera fila en uso.', porque: 'Con 7 a bordo, muchos autos casi no tienen maletero.' });
    if (r.carga.bebe) d.push({ que: 'Maletero ancho y puertas amplias.', porque: 'Para el coche de bebé sin pelearte.' });
    if (r.pres) d.push({ que: 'Filtramos por costo mensual total.', porque: 'No por el precio de lista del concesionario.' });

    const catalogo = [
      [7, 1, 1, 1, 2], [7, 1, 1, 0, 2], [7, 0, 1, 1, 2], [7, 1, 0, 1, 3], [7, 1, 0, 1, 4], [5, 1, 1, 1, 2], [5, 0, 1, 1, 1], [5, 1, 1, 0, 1],
      [5, 0, 0, 1, 3], [5, 1, 0, 1, 3], [5, 0, 1, 0, 1], [7, 1, 1, 1, 3], [5, 1, 1, 1, 2], [5, 0, 1, 1, 2], [7, 0, 0, 1, 4], [5, 1, 0, 0, 2]
    ];
    const encajan = catalogo.filter(([asientos, alto, glp, auto, tier]) => {
      if (r.pas === '6-7' && asientos < 7) return false;
      if (r.usos.trocha && !alto) return false;
      if ((r.km === 'mucho') && !glp) return false;
      if (r.trafico === 'mucho' && !auto) return false;
      if (r.pres && tier > Number(r.pres)) return false;
      return true;
    }).length;

    ```

Filtro del contador en el prototipo (catálogo de prueba; en producción usar las reglas de arriba: un modelo "encaja" si no tiene ningún Difícil en los usos marcados y cae en el presupuesto):

```js
// [asientos, alto, glp, automatica, rangoPrecio]
if (r.pas === '6-7' && asientos < 7) return false;
if (r.usos.trocha && !alto) return false;
if (r.km === 'mucho' && !glp) return false;
if (r.trafico === 'mucho' && !auto) return false;
if (r.pres && tier > Number(r.pres)) return false;
```

## Veredicto de `/revisar/[modelo]`

```js
const filas = [];
    if (s.usos.ciudad) filas.push({ uso: 'Ciudad', nivel: 'Bien', texto: 'Suave y fácil de manejar en tráfico. Su tamaño se maneja bien en cocheras normales.' });
    if (s.usos.carretera) filas.push({ uso: 'Carretera', nivel: 'Bien', texto: 'Silenciosa y estable. Con 119 HP adelanta sin sufrir en la Panamericana.' });
    if (s.usos.trocha) filas.push({ uso: 'Trocha', nivel: 'Justo', texto: 'Buena altura al piso, pero la caja CVT se esfuerza en barro profundo y subidas lentas.' });
    if (s.usos.sierra) filas.push({ uso: 'Sierra', nivel: 'Justo', texto: 'Motor sin turbo: sobre 3,000 m pierde fuerza, más aún con el carro lleno.' });
    if (s.pas === '6–7') filas.push({ uso: '6 o 7 pasajeros', nivel: 'Justo', texto: 'La tercera fila sirve para niños o trayectos cortos, y con ella en uso el maletero queda chico.' });
    if (s.pas === '5') filas.push({ uso: '5 pasajeros', nivel: 'Bien', texto: 'Cinco van cómodos, y con la tercera fila plegada tienes buen maletero.' });
    if (s.pas === '1–4') filas.push({ uso: 'Pocos pasajeros', nivel: 'Bien', texto: 'Te sobra espacio. Revisa si realmente necesitas un auto de 7 asientos.' });
    if (s.glp === 'Sí') filas.push({ uso: 'Convertir a GLP', nivel: 'Bien', texto: 'Motor compatible. Pregunta dónde reubican la llanta de repuesto y si se mantiene la garantía.' });
    const filasT = filas.map((f) => ({ ...f, style: tone[f.nivel] }));

    const justos = filas.filter((f) => f.nivel === 'Justo').length;
    const dificiles = filas.filter((f) => f.nivel === 'Difícil').length;
    let veredicto, resumen, fondo;
    if (dificiles > 0 || justos >= 3) { veredicto = 'Hay opciones que te sirven mejor'; resumen = 'Para tu uso, varias cosas quedan justas. Mira las alternativas antes de decidir.'; fondo = '#B3261E'; }
    else if (justos > 0) { veredicto = 'Te sirve, con ' + justos + (justos === 1 ? ' cosa' : ' cosas') + ' a tener en cuenta'; resumen = 'Encaja con lo principal de tu uso. Revisa los puntos marcados como Justo.'; fondo = '#1A56C4'; }
    else { veredicto = 'Te sirve bien'; resumen = 'Para lo que nos contaste, no vemos puntos débiles importantes.'; fondo = '#0E6B4E'; }

    const alternativas = [];
    if (s.usos.trocha) alternativas.push({ nombre: 'Toyota Rush', por: 'Trocha: Bien · tracción trasera' });
    if (s.usos.trocha || s.usos.sierra) alternativas.push({ nombre: 'Mitsubishi Xpander Cross', por: 'Trocha: Bien · suspensión cómoda en ripio' });
    const altTitulo = s.usos.trocha ? 'Si la trocha es frecuente, estas encajan mejor' : 'Para sierra, también mira estas';

    ```

(En el prototipo las filas están escritas para la Honda BR-V; en producción salen de las reglas del modelo.)

## Perfil del swipe (`/descubre`)

Cada tarjeta tiene rasgos (`aventura`, `urbano`, `familiar`, `deportivo`, `sobrio`). Por rasgo: % = me gusta / vistos. El rasgo con mayor % define el perfil; el segundo se muestra como "Con un toque de…". Si todo es 0: "Difícil de convencer".

```js
const nombres = { aventura: 'Aventura', urbano: 'Ciudad y agilidad', familiar: 'Espacio y familia', deportivo: 'Deportivo', sobrio: 'Sobrio y elegante' };
    const perfiles = {
      aventura: { nombre: 'Explorador', texto: 'Te atraen los autos altos y robustos, listos para salir de la ciudad cuando se pueda.' },
      urbano: { nombre: 'Urbano ágil', texto: 'Te gustan los autos compactos y fáciles de mover, hechos para el día a día en la ciudad.' },
      familiar: { nombre: 'Práctico de casa grande', texto: 'Te fijas en el espacio: que entren todos y todo, sin apretarse.' },
      deportivo: { nombre: 'Con chispa', texto: 'Te atrae el diseño con carácter: bajo, marcado y con presencia.' },
      sobrio: { nombre: 'Elegante sin vueltas', texto: 'Prefieres líneas limpias y autos que no necesitan llamar la atención.' }
    };
    const vistos = {}, gustados = {};
    Object.keys(nombres).forEach((k) => { vistos[k] = 0; gustados[k] = 0; });
    const tiposGustaSet = {};
    this.state.votos.forEach((v) => {
      const c = this.cards[v.i];
      c.rasgos.forEach((r) => { vistos[r] += 1; if (v.gusta) gustados[r] += 1; });
      if (v.gusta) tiposGustaSet[c.tipo] = true;
    });
    const barras = Object.keys(nombres).map((k) => {
      const pct = vistos[k] ? Math.round((gustados[k] / vistos[k]) * 100) : 0;
      return { k, nombre: nombres[k], pct, fill: 'height: 8px; border-radius: 4px; background: #1A56C4; width: ' + pct + '%;' };
    }).sort((a, b) => b.pct - a.pct);
    const terminado = this.state.i >= this.cards.length;
    const top = barras[0], seg = barras[1];
    const perfil = top && top.pct > 0 ? perfiles[top.k] : { nombre: 'Difícil de convencer', texto: 'Ningún estilo te terminó de enamorar. Empecemos por cómo lo vas a usar y te mostramos opciones.' };
    const segundo = seg && seg.pct > 0 ? 'Con un toque de: ' + seg.nombre.toLowerCase() + '.' : '';
    ```

El perfil se pasa a `/preguntas` (por ejemplo `?gusto=aventura,urbano`) y en resultados se usa para **ordenar** entre los modelos que ya encajan por uso, nunca para recomendar algo que no sirve.

## Señales (paths SVG)

```js
function senal(nivel, cx, cy, r) {
  if (nivel === 'Bien')   // círculo
    return { d: `M${cx-r},${cy} a${r},${r} 0 1,0 ${2*r},0 a${r},${r} 0 1,0 ${-2*r},0`, fill: '#0E6B4E' };
  if (nivel === 'Justo')  // rombo
    return { d: `M${cx},${cy-r-1} L${cx+r+1},${cy} L${cx},${cy+r+1} L${cx-r-1},${cy} Z`, fill: '#B54E08' };
  const pts = Array.from({ length: 8 }, (_, k) => {   // octágono
    const a = Math.PI / 8 + k * Math.PI / 4;
    return `${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`;
  });
  return { d: `M${pts.join(' L')} Z`, fill: '#B3261E' };
}
```

## Costo mensual total

Suma de: cuota del crédito (inicial, plazo 36/48/60, TCEA) + combustible (km/mes × consumo × precio GLP o gasohol de la zona; si GLP, prorratear la conversión) + seguro vehicular (obligatorio con crédito) + mantenimiento (servicios oficiales según km) + SOAT/12 + cochera y peajes (opcional). Mostrar siempre como **estimación** y destacar que la TCEA cambia mucho el total.
