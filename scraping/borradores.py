#!/usr/bin/env python3
"""
Hojas de revisión para las fichas mínimas (data/fichas-minimas.json).

Para cada modelo de PRIORIDAD junta, dato por dato, las líneas de su página oficial y de
sus PDF (ya descargados por scraper.py) que mencionan ese dato, con la página exacta.
No decide nada: la persona que revisa lee la línea, confirma el valor y lo copia a la
ficha con su cita y su fuente. Lo que ninguna fuente dice queda en null.

Uso:
  python scraping/borradores.py                 # todas las prioritarias
  python scraping/borradores.py toyota/raize    # una sola
Deja las hojas en scraping/salida/borradores/<marca>-<slug>.md (no se publican).
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parent
SALIDA = RAIZ / "salida"
DESTINO = SALIDA / "borradores"

#: Primera tanda (2026-11-08). Criterio, porque la AAP publica ventas por marca y no por modelo:
#: marcas líderes en ventas de livianos, SUV/sedán de uso personal en segmentos de entrada y medio
#: (sin grandes 4x4, lujo ni eléctricos), y con ficha oficial descargada para poder verificar.
#: Rush, BR-V y Xpander Cross ya están evaluadas completas en data/modelos/.
PRIORIDAD: list[tuple[str, str]] = [
    ("toyota", "raize"), ("toyota", "yaris-cross"), ("toyota", "corolla-cross"), ("toyota", "yaris-sedan"), ("toyota", "corolla"),
    ("hyundai", "new-creta"), ("hyundai", "new-tucson"), ("hyundai", "the-all-new-accent"),
    ("kia", "new-sonet"), ("kia", "new-seltos"), ("kia", "new-sportage"), ("kia", "soluto"),
    ("suzuki", "new-dzire-smarthybrid"), ("suzuki", "fronx"), ("suzuki", "xl7-smart-hybrid"), ("suzuki", "jimny-5-puertas"),
    ("chery", "tiggo2-pro-max"), ("chery", "new-tiggo4"), ("chery", "new-tiggo7"), ("chery", "arrizo5-pro"),
    ("changan", "new-cs35-max"), ("changan", "new-cs55-plus"), ("changan", "new-alsvin-plus"),
    ("jetour", "x50"), ("jetour", "x70-fl"),
    ("mitsubishi", "xpander"),
    ("nissan", "nissan-kicks"), ("nissan", "nuevo-versa"),
    ("renault", "kardian"), ("renault", "duster"),
]

#: Qué buscar para cada dato de la ficha mínima
PATRONES: dict[str, str] = {
    "asientos": r"\b(asientos|plazas|pasajeros|ocupantes)\b",
    "alturaPisoMm": r"altura (m[ií]nima |libre )?(al|del|sobre el) (piso|suelo)|despeje|distancia (m[ií]nima )?al suelo|ground clearance",
    "traccion": r"tracci[oó]n|\b(4x2|4x4|awd|fwd|2wd|4wd)\b",
    "transmision": r"transmisi[oó]n|\bcaja\b|\b(cvt|dct|ivt|e-cvt)\b|autom[aá]tica|mec[aá]nica",
    "turbo": r"turbo",
    "hp": r"potencia|\b\d{2,3}\s?(hp|cv|ps)\b",
    "inyeccion": r"inyecci[oó]n|\b(mpi|gdi|efi|tgdi|t-gdi|dvvt)\b|multipunto",
    "glpCompatible": r"\b(glp|gnv)\b|dual|bi-?combustible",
    "frenadoAutomatico": r"frenado (aut[oó]nomo|autom[aá]tico|de emergencia)|\b(aeb|fca|fcm|pcs)\b|pre-?colisi|colisi[oó]n frontal|frenado de colisi",
}
MAX_LINEAS = 6


def fuentes(marca: str, slug: str) -> list[tuple[str, int | None, list[str]]]:
    """(url, página o None, líneas) de la página web y de cada página de cada PDF."""
    carpeta = SALIDA / marca / slug
    meta = json.loads((carpeta / "meta.json").read_text(encoding="utf-8"))
    salida = []
    web = carpeta / "pagina.txt"
    if web.exists():
        salida.append((meta["url"], None, web.read_text(encoding="utf-8", errors="replace").splitlines()))
    for pdf in meta.get("pdfs", []):
        txt = (SALIDA / pdf["archivo"]).with_suffix(".txt")
        if not txt.exists():
            continue
        paginas = re.split(r"^===== PÁGINA (\d+) =====$", txt.read_text(encoding="utf-8", errors="replace"), flags=re.M)
        for i in range(1, len(paginas) - 1, 2):
            salida.append((pdf["url"], int(paginas[i]), paginas[i + 1].splitlines()))
    return salida


def hoja(marca: str, slug: str) -> str:
    meta = json.loads((SALIDA / marca / slug / "meta.json").read_text(encoding="utf-8"))
    partes = [f"# {marca} / {slug}\n", f"Página: {meta['url']}  ", f"Consultado: {meta.get('consultado', '?')[:10]}\n"]
    todas = fuentes(marca, slug)
    for campo, patron in PATRONES.items():
        vistas, lineas = set(), []
        for url, pagina, texto in todas:
            for n, linea in enumerate(texto):
                if not re.search(patron, linea, re.I):
                    continue
                # en tablas aplanadas el valor suele venir en la línea siguiente
                contexto = " ".join(x.strip() for x in texto[n : n + 2] if x.strip())[:170]
                clave = re.sub(r"\W+", " ", contexto.lower())
                if clave in vistas:
                    continue
                vistas.add(clave)
                donde = f"PDF p.{pagina}" if pagina else "web"
                lineas.append(f"- [{donde}] {contexto}  \n  <{url}>")
                if len(lineas) >= MAX_LINEAS:
                    break
            if len(lineas) >= MAX_LINEAS:
                break
        partes.append(f"\n## {campo}\n" + ("\n".join(lineas) if lineas else "- (ninguna fuente lo menciona)"))
    return "\n".join(partes) + "\n"


def main(argv: list[str]) -> int:
    sys.stdout.reconfigure(encoding="utf-8")
    elegidos = [tuple(a.split("/", 1)) for a in argv] if argv else PRIORIDAD
    DESTINO.mkdir(parents=True, exist_ok=True)
    for marca, slug in elegidos:
        if not (SALIDA / marca / slug / "meta.json").exists():
            print(f"{marca}/{slug}: sin página descargada (corre scraper.py --marcas {marca})")
            continue
        destino = DESTINO / f"{marca}-{slug}.md"
        destino.write_text(hoja(marca, slug), encoding="utf-8")
        print(f"{marca}/{slug}: {destino.relative_to(RAIZ.parent)}")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
