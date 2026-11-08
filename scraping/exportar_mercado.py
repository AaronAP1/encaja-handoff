#!/usr/bin/env python3
"""
Exporta data/mercado.json: los modelos que cada marca vende en Perú, para la página /modelos.

Solo publica datos de identificación (marca, modelo, tipo, enlace oficial, fuente y fecha).
Precios y datos técnicos NO se exportan: siguen siendo candidatos sin revisar
(se publican recién cuando pasan a data/modelos/ con su fuente).

Uso:  python scraping/exportar_mercado.py   (después de una pasada del scraper)
"""

from __future__ import annotations

import json
import re
import sys
from datetime import datetime
from pathlib import Path

RAIZ = Path(__file__).resolve().parent
sys.path.insert(0, str(RAIZ))
import scraper as s  # noqa: E402

SALIDA = RAIZ / "salida"
DESTINO = RAIZ.parent / "data" / "mercado.json"

#: Tipos que se publican. Camión queda fuera (no es para uso personal); lo dudoso va como "Otro".
TIPOS_PUBLICOS = {"SUV", "Sedán", "Hatchback", "Minivan", "Pick-up", "Van"}

#: Modelos que ya están evaluados en el catálogo de la web (data/modelos/)
EVALUADOS = {
    ("toyota", "rush"): "toyota-rush",
    ("honda", "brv"): "honda-br-v",
    ("mitsubishi", "xpander-cross"): "mitsubishi-xpander-cross",
}

#: Sitio oficial de las marcas que solo se conocen por el concesionario (None = no enlazar)
SITIOS_SIN_LISTADO = {
    "chevrolet": "https://www.chevrolet.com.pe",
    "greatwall": "https://www.gwm.pe",
    "haval": "https://www.gwm.pe",
    "dfsk": "https://www.dfsk.com.pe",
    "geely": None,  # certificado inválido: no se envía a la gente ahí
    "soueastauto": None,
}
NOMBRE_MARCA = {"haval": "Haval (GWM)", "dfsk": "DFSK", "soueastauto": "Soueast", "jac": "JAC", "mg": "MG", "byd": "BYD"}

#: Nombres que la regla general no escribe bien
NOMBRES = {
    ("mazda", "mazda-3-sedan"): "Mazda3 Sedán",
    ("mazda", "mazda3-sport"): "Mazda3 Sport",
    ("hyundai", "grand-i10-hatch"): "Grand i10 Hatch",
    ("hyundai", "new-i20-hatch"): "i20 Hatch",
    ("jac", "e-30x"): "E30X",
    ("byd", "song-plus-dmi"): "Song Plus DM-i",
    ("changan", "new-van"): "New Van",
}

FRASES = {
    "x-trail": "X-Trail", "xtrail": "X-Trail", "s-presso": "S-Presso", "santa-fe": "Santa Fe", "land-cruiser": "Land Cruiser",
    "grand-cherokee": "Grand Cherokee", "uni-k": "UNI-K", "uni-t": "UNI-T", "uni-v": "UNI-V", "e-js4": "E-JS4", "mx-5": "MX-5",
    "bt-50": "BT-50", "smart-hybrid": "Smart Hybrid", "e-power": "e-Power", "s-cross": "S-Cross", "spark-euv": "Spark EUV",
    "e-t9": "E-T9", "em-i": "EM-i",
}
PALABRAS = {
    "crv": "CR-V", "hrv": "HR-V", "brv": "BR-V", "wrv": "WR-V", "zrv": "ZR-V", "rav4": "RAV4", "bz4x": "bZ4X", "4runner": "4Runner",
    "hev": "HEV", "phev": "PHEV", "ev": "EV", "bev": "BEV", "euv": "EUV", "suv": "SUV", "dmi": "DM-i", "idd": "iDD", "csh": "CSH", "fl": "FL",
    "wrx": "WRX", "xl7": "XL7", "zs": "ZS", "hs": "HS", "mg": "MG", "epower": "e-Power", "hibrido": "Híbrido", "hibrida": "Híbrida",
    "smarthybrid": "Smart Hybrid", "sedan": "Sedán", "4x4": "4x4", "asx": "ASX", "c5shs": "C5 SHS", "c7shs": "C7 SHS", "j5ev": "J5 EV",
    "puertas": "puertas", "mazda3": "Mazda3", "evitara": "e-Vitara", "max": "Max", "apv": "APV", "automatica": "Automática",
}


def nombre_bonito(slug: str, marca: str) -> str:
    t = slug.lower()
    marca_slug = re.sub(r"[^a-z0-9]+", "-", marca.lower()).strip("-")
    cambio = True
    while cambio:  # quita "new-", "all-new-", "nueva-", la marca… en cualquier orden
        cambio = False
        for prefijo in ("the-all-new-", "all-new-", "new-", "nuevo-", "nueva-", f"{marca_slug}-"):
            if t.startswith(prefijo) and len(t) > len(prefijo):
                t, cambio = t[len(prefijo):], True
    marcadores: dict[str, str] = {}
    for i, (frase, bonita) in enumerate(sorted(FRASES.items(), key=lambda x: -len(x[0]))):
        patron = rf"(?<![a-z0-9]){re.escape(frase)}(?![a-z0-9])"  # "s-cross" no debe tocar "yaris-cross"
        if re.search(patron, t):
            clave = f"ph{i}x"
            t = re.sub(patron, clave, t)
            marcadores[clave] = bonita
    t = re.sub(r"-2[0-9]$", "", t)  # "t8-pro-25": página del año 2025 del mismo modelo
    t = re.sub(r"cx-(\d+)", lambda m: f"cx{m.group(1)}", t)
    salida = []
    for tok in t.split("-"):
        if not tok:
            continue
        if tok in marcadores:
            salida.append(marcadores[tok])
        elif tok in PALABRAS:
            salida.append(PALABRAS[tok])
        elif m := re.fullmatch(r"cx(\d+)", tok):
            salida.append(f"CX-{m.group(1)}")
        elif m := re.fullmatch(r"(tiggo|arrizo)(\d+)(pro)?", tok):
            salida.append(" ".join(x for x in (m.group(1).title(), m.group(2), (m.group(3) or "").title()) if x))
        elif re.fullmatch(r"i\d+", tok):
            salida.append(tok)
        elif re.fullmatch(r"[a-z]{1,3}\d+[a-z]?", tok):
            salida.append(tok.upper())
        else:
            salida.append(tok.capitalize())
    return " ".join(salida)


def clave_marca(texto: str) -> str:
    return re.sub(r"[^a-z0-9]", "", texto.lower())


def fecha_de(ruta: Path) -> str:
    return datetime.fromtimestamp(ruta.stat().st_mtime).strftime("%Y-%m-%d")


def tipo_publico(tipo: str) -> str | None:
    if tipo == "Camión":
        return None
    return tipo if tipo in TIPOS_PUBLICOS else "Otro"


def main() -> int:
    marcas: list[dict] = []
    con_listado: set[str] = set()

    for clave, marca in s.MARCAS.items():
        archivo = SALIDA / clave / "modelos.json"
        if not archivo.exists():
            continue
        descubiertos = json.loads(archivo.read_text(encoding="utf-8"))
        modelos, vistos = [], set()
        for d in descubiertos:
            try:  # al procesar la página el tipo puede haberse corregido
                d["tipo"] = json.loads((SALIDA / clave / d["slug"] / "meta.json").read_text(encoding="utf-8")).get("tipo", d["tipo"])
            except (FileNotFoundError, json.JSONDecodeError):
                pass
            tipo = tipo_publico(d["tipo"])
            if not tipo:
                continue
            nombre = NOMBRES.get((clave, d["slug"])) or nombre_bonito(d["slug"], marca.nombre)
            if nombre.lower() in vistos:  # el mismo modelo con dos páginas (vieja y nueva)
                continue
            vistos.add(nombre.lower())
            modelos.append({"nombre": nombre, "tipo": tipo, "url": d["url"], "slugEncaja": EVALUADOS.get((clave, d["slug"]))})
        if not modelos:
            continue
        con_listado.add(clave_marca(marca.nombre))
        marcas.append(
            {
                "marca": marca.nombre,
                "sitio": marca.base + (marca.portadas[0] if marca.portadas and marca.portadas[0] != "/" else ""),
                "fuente": {"tipo": "oficial", "fecha": fecha_de(archivo)},
                "modelos": sorted(modelos, key=lambda m: m["nombre"].lower()),
            }
        )

    # Marcas que no se pudieron leer en su sitio: sus modelos según el concesionario
    wigo = SALIDA / "wigo" / "versiones.json"
    if wigo.exists():
        por_marca: dict[str, list[dict]] = {}
        for v in json.loads(wigo.read_text(encoding="utf-8")):
            k = clave_marca(v["marca"])
            k = "haval" if k == "greatwall" else k  # Wigo lista modelos Haval también bajo "Great Wall" (grupo GWM)
            if k in con_listado or k.startswith("omoda"):
                continue
            por_marca.setdefault(k, []).append(v)
        for k, versiones in por_marca.items():
            nombre_marca = NOMBRE_MARCA.get(k, versiones[0]["marca"].title())
            modelos, vistos = [], set()
            for v in versiones:
                tipo = tipo_publico(v["tipo"])
                slug = re.sub(r"[^a-z0-9]+", "-", v["modelo"].lower()).strip("-")
                slug = re.sub(r"^haval-", "", slug) if k == "haval" else slug
                nombre = NOMBRES.get((k, slug)) or nombre_bonito(slug, nombre_marca)
                if not tipo or nombre.lower() in vistos:
                    continue
                vistos.add(nombre.lower())
                modelos.append({"nombre": nombre, "tipo": tipo, "url": None, "slugEncaja": None})
            marcas.append(
                {
                    "marca": nombre_marca,
                    "sitio": SITIOS_SIN_LISTADO.get(k),
                    "fuente": {"tipo": "concesionario", "fecha": fecha_de(wigo)},
                    "modelos": sorted(modelos, key=lambda m: m["nombre"].lower()),
                }
            )

    marcas.sort(key=lambda m: m["marca"].lower())
    datos = {"$schema": "./esquemas/mercado.json", "actualizado": max(m["fuente"]["fecha"] for m in marcas), "marcas": marcas}
    DESTINO.write_text(json.dumps(datos, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    total = sum(len(m["modelos"]) for m in marcas)
    print(f"{DESTINO.relative_to(RAIZ.parent)}: {total} modelos de {len(marcas)} marcas")
    return 0


if __name__ == "__main__":
    sys.exit(main())
