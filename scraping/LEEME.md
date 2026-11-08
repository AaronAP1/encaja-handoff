# Scraper de fichas oficiales

`scraper.py` recorre los sitios oficiales en Perú de **Toyota, Honda, Suzuki, Mitsubishi, Jetour, Hyundai, Kia, Nissan, Changan, Chery, BYD, Renault, Mazda, Subaru, JAC y Omoda | Jaecoo**, descubre todos sus modelos y, para los **SUV y sedanes**, baja la página del modelo y los PDF que enlaza (fichas técnicas, catálogos). De cada uno saca **candidatos** de datos: precio, HP, torque, cilindrada, caja, tracción, altura al piso, asientos, airbags, turbo, GLP y frenado automático, siempre con el texto de alrededor y la fuente (URL y página del PDF).

Los candidatos **no son datos verificados**. Se revisan contra la fuente antes de pasarlos a `data/modelos/` (ver `data/modelos/LEEME.md`).

Además lee **Wigo Motors** (`wigo`), un concesionario multimarca: unos 140 modelos de unas 20 marcas (Hyundai, Kia, Nissan, Chevrolet, Mazda, Geely, Chery, Changan, Haval, GWM, JAC, Subaru, Renault, DFSK, Soueast, Omoda/Jaecoo, Suzuki, Mitsubishi, Jetour). Ver la sección [Wigo Motors](#wigo-motors-concesionario-multimarca).

Solo usa la librería estándar de Python 3.10+. Para leer el texto de los PDF necesita `pdfplumber` (`pip install pdfplumber`); sin él igual baja todo.

## Uso

```bash
python scraping/scraper.py                         # una pasada por las 5 marcas y Wigo
python scraping/scraper.py --marcas wigo           # solo el listado multimarca de Wigo
python scraping/scraper.py --marcas toyota,suzuki  # solo algunas marcas
python scraping/scraper.py --solo-descubrir        # solo lista modelos y su tipo (rápido)
python scraping/scraper.py --tipos SUV,Sedan,Minivan
python scraping/scraper.py --max-modelos 2         # para probar
```

Opciones útiles: `--pausa 4` (segundos entre peticiones al mismo servidor), `--max-pdf 6`, `--max-mb 40`, `--sin-pdf`, `--salida RUTA`, `--contacto tu-correo` (se agrega al User-Agent; es buena práctica), `-v`.

`--reprocesar` recalcula los candidatos y el resumen con lo ya descargado, **sin conectarse a internet**. Sirve después de ajustar las expresiones o las palabras clave del script.

### Cómo se limpia el resumen

- **Rangos válidos:** cada campo tiene un rango razonable (40–800 HP, 100–400 mm, 2–9 asientos…). Lo que cae fuera, como teléfonos, notas al pie o kWh, se descarta.
- **Menús:** los precios que aparecen en ≥60 % de las páginas de una marca se ocultan en la tabla, porque vienen de menús y calculadoras. Siguen en `candidatos.json`.
- **Precio del modelo:** se prefiere el "Precio desde" de su propia página (Toyota lo publica así).
- **Lista Wigo:** la columna agrega el precio de lista estimado del concesionario para el mismo modelo, emparejado por nombre.
- **Frenado:** el **asistente de frenado (BA)** va en su propio campo, `asistente_frenado`, y no cuenta como frenado automático, porque solo refuerza la frenada cuando uno pisa el freno.

Una pasada completa son unas 160 peticiones a 4 s cada una, entre 10 y 20 minutos según los PDF. Wigo agrega cerca de un minuto. Con `--max-paginas N` se limitan las páginas por listado del concesionario.

## Publicar el listado de modelos (`/modelos`)

Después de una pasada, este comando actualiza `data/mercado.json`, que es lo que muestra la página **Todos los modelos**:

```bash
python scraping/exportar_mercado.py
npm test
```

Solo exporta datos de identificación: marca, nombre del modelo, tipo, enlace oficial, fuente y fecha. **No publica precios ni datos técnicos**, porque siguen siendo candidatos. Deja fuera los camiones y une los modelos repetidos (por ejemplo, la página vieja y la nueva de un mismo modelo). Para las marcas cuyo sitio no se pudo leer usa el listado de Wigo. Los nombres que la regla general no escribe bien se corrigen en `NOMBRES` dentro del script.

## Dejarlo en segundo plano (Windows)

**Opción 1: proceso oculto que repite cada 24 h.** En PowerShell, desde la carpeta del proyecto:

```powershell
Start-Process -WindowStyle Hidden -FilePath pythonw -ArgumentList 'scraping\scraper.py','--bucle','--cada','24' -WorkingDirectory (Get-Location)
```

Para ver qué está haciendo:

```powershell
Get-Content scraping\salida\scraper.log -Tail 30 -Wait
```

Para detenerlo con calma (termina la petición en curso y sale):

```powershell
New-Item scraping\salida\DETENER
```

**Opción 2: tarea programada una vez al día** (sobrevive a reinicios). Reemplaza la ruta por la de tu proyecto:

```powershell
$ruta = "C:\ruta\al\proyecto"
$accion = New-ScheduledTaskAction -Execute "pythonw.exe" -Argument "`"$ruta\scraping\scraper.py`"" -WorkingDirectory $ruta
$cuando = New-ScheduledTaskTrigger -Daily -At 3am
Register-ScheduledTask -TaskName "Encaja scraper" -Action $accion -Trigger $cuando
```

Para quitarla: `Unregister-ScheduledTask -TaskName "Encaja scraper"`.

Solo corre un scraper a la vez sobre la misma carpeta de salida (`.scraper.lock`). Si se cortó a la fuerza, el candado se libera solo a las 12 horas, o puedes borrarlo.

## Qué deja en `scraping/salida/`

```
resumen.md / resumen.json     tabla por marca: tipo, PDF bajados, primeros candidatos y notas
cambios.jsonl                 cada vez que una página o un PDF cambió (precios nuevos, fichas nuevas)
scraper.log                   registro de cada pasada
estado.json                   ETag, fecha y huella por URL (no re-baja lo que no cambió)
<marca>/modelos.json          todos los modelos descubiertos con su tipo y por qué
<marca>/<modelo>/
  pagina.html, pagina.txt     la página del modelo y su texto visible
  pdf/*.pdf, pdf/*.txt        fichas y catálogos con su texto por página
  candidatos.json             datos candidatos con contexto y fuente
  meta.json                   URL, título, tipo, PDF y errores
```

Esta carpeta está en `.gitignore`. Son páginas y documentos de las marcas, con derechos, **solo para uso interno**. Lo que se publica son los datos ya revisados, con su fuente, en `data/modelos/`. Si el proyecto está en OneDrive, conviene usar `--salida` con una carpeta fuera de OneDrive, porque son muchos archivos.

## Marcas que no se pueden leer (revisado el 2026-11-08)

| Marca | Motivo | Cómo se cubre |
|---|---|---|
| Kia (`kia.com.pe`) | Su `robots.txt` prohíbe todo | Se usa el sitio global `kia.com/pe`, que sí lo permite |
| Chevrolet, MG, Jeep | Responden 403 a clientes automáticos. Están configuradas: si un día abren el acceso, entran solas | Chevrolet por precios de Wigo; MG y Jeep a mano |
| Ford | Responde 403 | A mano |
| Geely, Volkswagen | Certificado de seguridad inválido en su sitio | Geely por precios de Wigo; Volkswagen a mano |
| DFSK, GWM/Haval | Sus portadas se arman con JavaScript y no exponen enlaces a modelos | Precios de Wigo |
| Peugeot | No se encontró el sitio oficial peruano | — |

El script **nunca** se disfraza de navegador para saltarse un bloqueo: si un sitio rechaza clientes automáticos, se respeta y queda anotado en el resumen.

## Wigo Motors (concesionario multimarca)

Wigo no es un sitio oficial de marca: es un concesionario. Sirve para **ubicar modelos y precios de muchas marcas a la vez**, no como ficha técnica.

- **Qué lee:** solo sus listados por categoría, `/vehiculos/nuevo/camioneta-rural` (SUV) y `/vehiculos/nuevo/automovil` (sedán y hatchback), página por página. Son unas 14 peticiones por pasada.
- **Qué no lee:** su `robots.txt` prohíbe las páginas de detalle (`/*vehicle/*`) y los filtros `?marca=` y `?categoria=`, así que nunca se visitan. Wigo tampoco publica fichas en PDF.
- **Qué deja:** `salida/wigo/versiones.json`, con un registro por modelo y su **versión de entrada**: nombre completo, categoría, precio publicado en US$ y S/, bono y precio de lista estimado.
- **Cómo leer el precio:** el precio publicado ya descuenta el bono. El de lista es publicado + bono, y coincidió con la web oficial de Suzuki en los 5 modelos comparados. Algunos modelos no tienen precio publicado (DFSK, Haval, Nissan Versa): Wigo pide cotizar.
- **Tipo:** la categoría del registro peruano decide. "Camioneta Rural" es SUV. "Automóvil" se separa en sedán o hatchback por el nombre; algunos SUV figuran como automóvil (Jetour X50, Kia Seltos) y se corrigen por palabra clave. Lo que no se puede decidir queda "Desconocido".
- **Cambios de precio:** se anotan en `cambios.jsonl` cuando un modelo cambia de precio entre pasadas.

## Reglas que sigue

- Respeta `robots.txt` (RFC 9309) y su `Crawl-delay`, incluidos los comodines `*` y `$`. El lector estándar de Python (`urllib.robotparser`) no los entiende, por eso el script trae el suyo. Si un servidor no responde o tiene el certificado vencido, no lo visita y lo anota.
- Hace una petición cada pocos segundos por servidor, solo con GET.
- Nunca llena formularios, no inicia sesión ni adivina URLs: solo sigue enlaces que están en las páginas. El catálogo de Honda que pide un formulario no se baja.
- No desactiva la verificación de certificados. Hoy los PDF de Jetour están en `jetour-api.arya.pe`, que tiene el certificado vencido, así que se omiten y quedan anotados en el resumen.

## Cómo se clasifican los modelos

1. Por palabras clave del nombre (`TIPOS_POR_PALABRA` en el script). Lo específico va primero: `corolla-cross` es SUV aunque `corolla` sea sedán.
2. Por la categoría que la marca pone en la URL (Mitsubishi `/suv/` y `/pick-ups/`, Toyota `camioneta-`, `auto-`, `van-`).
3. Por el título de la página.

Los tipos posibles son SUV, Sedán, Hatchback, Minivan, Pick-up, Van y Camión. Por defecto solo se procesan SUV y Sedán (se cambia con `--tipos`).

Lo que no calza queda como **Desconocido** y se procesa igual: al leer la página se reclasifica por su título (hoy, por ejemplo, Chery M7, Changan Honor S y Mazda MX-5). Cuando una marca lance un modelo nuevo, agrega su nombre a `TIPOS_POR_PALABRA`.

## Agregar una marca

Agrega una entrada en `MARCAS` con su dominio, sitemaps o portadas y la expresión regular de sus páginas de modelo. Antes, revisa su `robots.txt`. Prueba con `--marcas nueva --solo-descubrir`.
