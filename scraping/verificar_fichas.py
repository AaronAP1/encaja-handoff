#!/usr/bin/env python3
"""
Verifica data/fichas-minimas.json contra las copias locales de las fuentes (scraping/salida/).

Cada dato de una ficha mínima lleva una cita literal. Este script comprueba que la cita
aparezca tal cual en la fuente indicada (la página web, o la página exacta del PDF).
Si la fuente no está descargada, lo avisa sin fallar: hay que correr scraper.py antes.

Uso:  python scraping/verificar_fichas.py
"""

from __future__ import annotations

import json
import re
import sys
import unicodedata
from functools import cache
from pathlib import Path

RAIZ = Path(__file__).resolve().parent
SALIDA = RAIZ / "salida"
FICHAS = RAIZ.parent / "data" / "fichas-minimas.json"


def normalizar(texto: str) -> str:
    """Sin saltos de línea ni espacios dobles: las tablas de los PDF salen partidas en varias líneas."""
    texto = unicodedata.normalize("NFC", texto).replace("​", "")
    return re.sub(r"\s+", " ", texto).strip()


@cache
def fuentes() -> dict[str, dict[int | None, str]]:
    """URL → {página del PDF (None para la web): texto normalizado}, de todo lo descargado."""
    indice: dict[str, dict[int | None, str]] = {}
    for meta_p in SALIDA.glob("*/*/meta.json"):
        meta = json.loads(meta_p.read_text(encoding="utf-8"))
        web = meta_p.parent / "pagina.txt"
        if web.exists() and meta.get("url"):
            indice.setdefault(meta["url"], {})[None] = normalizar(web.read_text(encoding="utf-8", errors="replace"))
        for pdf in meta.get("pdfs", []):
            txt = (SALIDA / pdf["archivo"]).with_suffix(".txt")
            if not txt.exists() or pdf["url"] in indice:
                continue
            partes = re.split(r"^===== PÁGINA (\d+) =====$", txt.read_text(encoding="utf-8", errors="replace"), flags=re.M)
            indice[pdf["url"]] = {int(partes[i]): normalizar(partes[i + 1]) for i in range(1, len(partes) - 1, 2)}
    return indice


def ubicar(cita: str, urls: list[str]) -> list[tuple[str, int | None]]:
    """Dónde aparece la cita, entre las URLs dadas."""
    c = normalizar(cita)
    return [(u, p) for u in urls for p, t in fuentes().get(u, {}).items() if c in t]


def main() -> int:
    sys.stdout.reconfigure(encoding="utf-8")
    datos = json.loads(FICHAS.read_text(encoding="utf-8"))["fichas"]
    errores = avisos = revisados = 0
    for f in datos:
        for campo, d in f["datos"].items():
            if d is None:
                continue
            revisados += 1
            url, pagina = d["fuente"]["url"], d["fuente"]["pagina"]
            if url not in fuentes():
                avisos += 1
                print(f"aviso  {f['slug']}.{campo}: no hay copia local de {url}")
                continue
            texto = fuentes()[url].get(pagina)
            if texto is None or normalizar(d["cita"]) not in texto:
                errores += 1
                donde = ubicar(d["cita"], [url])
                pista = f" (sí aparece en la página {donde[0][1]})" if donde else ""
                print(f"ERROR  {f['slug']}.{campo}: la cita no está en {url} p.{pagina}{pista}: «{d['cita']}»")
    print(f"{len(datos)} fichas, {revisados} datos: {errores} errores, {avisos} sin copia local")
    return 1 if errores else 0


if __name__ == "__main__":
    sys.exit(main())
