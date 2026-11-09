#!/usr/bin/env python3
"""
Scraper de fichas oficiales en Perú para Encaja.

Recorre los sitios oficiales de cada marca, descubre sus modelos (por sitemap o portada),
se queda con los tipos pedidos (por defecto SUV y Sedán) y guarda, por modelo:
  - la página del modelo (HTML y texto visible),
  - los PDF que la página enlaza (fichas, catálogos) y su texto,
  - "candidatos" de datos (precios, HP, torque, caja, tracción, altura al piso, asientos,
    airbags, turbo, GLP, frenado automático) con el contexto y la fuente de cada uno.

Los candidatos NO son datos verificados: se revisan contra la fuente antes de pasarlos a
data/modelos/ (ver data/modelos/LEEME.md). Nada de esto se publica: la salida queda en
scraping/salida/, que está en .gitignore.

Reglas de cortesía: respeta robots.txt (RFC 9309), hace una petición cada pocos segundos por
servidor, solo usa GET, no llena formularios ni inicia sesión, y solo baja PDF que estén
enlazados en las páginas (nunca adivina URLs).

Uso rápido:
  python scraping/scraper.py                       # una pasada por todas las marcas
  python scraping/scraper.py --marcas toyota,honda # solo esas marcas
  python scraping/scraper.py --solo-descubrir      # lista modelos y tipos, sin bajar nada más
  python scraping/scraper.py --bucle --cada 24     # en segundo plano: una pasada cada 24 h
Para detenerlo con calma: crea el archivo scraping/salida/DETENER (o Ctrl+C).
Más detalles en scraping/LEEME.md.
"""

from __future__ import annotations

import argparse
import gzip
import http.client
import hashlib
import html
import json
import logging
import os
import random
import re
import signal
import ssl
import sys
import time
import zlib
from dataclasses import dataclass, field
from datetime import datetime, timezone
from html.parser import HTMLParser
from pathlib import Path
from typing import Callable
from urllib.error import HTTPError, URLError
from urllib.parse import quote, unquote, urljoin, urlparse, urlunparse
from urllib.request import Request, urlopen

VERSION = "0.1"
RAIZ = Path(__file__).resolve().parent
SALIDA_POR_DEFECTO = RAIZ / "salida"
log = logging.getLogger("encaja.scraper")

# ── Marcas ──────────────────────────────────────────────────────────────────


@dataclass(frozen=True)
class Marca:
    clave: str
    nombre: str
    base: str
    #: rutas de sitemaps a leer (relativas a base)
    sitemaps: tuple[str, ...]
    #: páginas cuyo enlaces también se revisan (portada, listado)
    portadas: tuple[str, ...]
    #: regex sobre la ruta que identifica una página de modelo
    patron_modelo: str
    #: prefijos a quitar del último segmento para obtener el slug del modelo
    prefijos_slug: tuple[str, ...] = ()
    #: tipo según la ruta (categoría que usa la propia marca), si la ruta lo dice
    tipo_por_ruta: Callable[[str], str | None] = lambda ruta: None
    #: regex de rutas que calzan con el patrón pero no son modelos (listados, landings)
    excluir: str = ""
    #: sufijos a quitar del slug ("…-geely-peru")
    sufijos_slug: tuple[str, ...] = ()
    #: qué segmento de la ruta es el modelo (-1: el último; 1 en "/autos/arona/introduccion")
    segmento_slug: int = -1
    #: si la lista no viene del sitio de la marca sino de un concesionario, su nombre
    concesionario: str = ""


def _tipo_chevrolet(ruta: str) -> str | None:
    for segmento, tipo in (("/camionetas/", "SUV"), ("/autos/", "Sedán"), ("/pickups/", "Pick-up"), ("/vans/", "Van")):
        if ruta.startswith(segmento):
            return tipo
    return None


def _tipo_toyota(ruta: str) -> str | None:
    seg = ruta.rstrip("/").rsplit("/", 1)[-1]
    if seg.startswith("van-"):
        return "Van"
    if seg.startswith("camioneta-"):
        return "SUV"  # Toyota llama "camioneta" a SUV y pick-up: las palabras clave corrigen
    if seg.startswith(("auto-", "carro-")):
        return "Sedán"  # idem para hatchbacks
    return None


def _tipo_mitsubishi(ruta: str) -> str | None:
    if "/suv/" in ruta:
        return "SUV"
    if "/pick-ups/" in ruta or "/pickup" in ruta:
        return "Pick-up"
    if "/sedan" in ruta:
        return "Sedán"
    return None


def _ultimo(ruta: str) -> str:
    return ruta.rstrip("/").rsplit("/", 1)[-1].lower()


def _tipo_bmw(ruta: str) -> str | None:
    """BMW usa rutas planas (/x3, /serie-3, /m135i). Coupés y roadsters quedan sin tipo (se publican como "Otro")."""
    seg = _ultimo(ruta).removeprefix("bmw-")
    if re.match(r"(x\d|ix|xm)", seg):
        return "SUV"
    if re.fullmatch(r"serie-[357]|m[35]|\d-hibrido", seg):
        return "Sedán"
    if re.fullmatch(r"serie-1|m1\d\di", seg):
        return "Hatchback"
    return None


def _tipo_lexus(ruta: str) -> str | None:
    seg = _ultimo(ruta)
    if re.match(r"(camioneta|suv)-|(lbx|ux|nx|rx|gx|lx)(\b|\d)", seg):
        return "SUV"
    if re.match(r"(sedan-)?(es|is|ls)(\b|\d)", seg):
        return "Sedán"
    return None


def _tipo_dfsk(ruta: str) -> str | None:
    return "SUV" if re.fullmatch(r"(dfsk-)?e5", _ultimo(ruta)) else None


MARCAS: dict[str, Marca] = {
    "toyota": Marca(
        clave="toyota",
        nombre="Toyota",
        base="https://www.toyotaperu.com.pe",
        sitemaps=("/sitemap.xml",),
        portadas=("/",),
        patron_modelo=r"^/listado-modelos-toyota/[a-z0-9-]+$",
        prefijos_slug=("camioneta-toyota-", "camioneta-", "auto-", "carro-", "van-"),
        tipo_por_ruta=_tipo_toyota,
    ),
    "honda": Marca(
        clave="honda",
        nombre="Honda",
        base="https://autos.honda.com.pe",
        sitemaps=(),  # su sitemap no lista vehículos
        portadas=("/",),
        patron_modelo=r"^/vehiculos/[a-z0-9-]+/?$",
    ),
    "suzuki": Marca(
        clave="suzuki",
        nombre="Suzuki",
        base="https://www.suzuki.com.pe",
        sitemaps=("/sitemap.xml",),
        portadas=("/",),
        patron_modelo=r"^/vehiculo/[a-z0-9-]+/?$",
    ),
    "mitsubishi": Marca(
        clave="mitsubishi",
        nombre="Mitsubishi",
        base="https://www.mitsubishi-motors.com.pe",
        sitemaps=("/sitemap.xml",),
        portadas=("/",),
        patron_modelo=r"^/(suv|pick-ups|sedan|hatchback|autos)/[a-z0-9-]+/?$",
        tipo_por_ruta=_tipo_mitsubishi,
    ),
    "jetour": Marca(
        clave="jetour",
        nombre="Jetour",
        base="https://www.jetour.com.pe",
        sitemaps=("/sitemap.xml",),
        portadas=("/",),
        patron_modelo=r"^/modelos/[a-z0-9-]+/?$",
    ),
    # ── Marcas agregadas: sitios oficiales en Perú revisados el 2026-11-08 ──
    "hyundai": Marca(
        clave="hyundai",
        nombre="Hyundai",
        base="https://hyundai.pe",
        sitemaps=("/sitemap_index.xml",),
        portadas=("/",),
        patron_modelo=r"^/modelos/[a-z0-9-]+/?$",
    ),
    "kia": Marca(
        # kia.com.pe prohíbe todo en robots.txt; el sitio global de Kia para Perú sí lo permite
        clave="kia",
        nombre="Kia",
        base="https://www.kia.com",
        sitemaps=(),
        portadas=("/pe/main.html",),
        patron_modelo=r"^/pe/showroom/[a-z0-9-]+\.html$",
        excluir=r"/(autos-nuevos|camionetas-pick-up|camionetas-suv-mpv|comerciales|vehiculos-electricos|vehiculos-hibridos)\.html$",
    ),
    "nissan": Marca(
        clave="nissan",
        nombre="Nissan",
        base="https://www.nissan.pe",
        sitemaps=("/index.pages-sitemap.xml",),
        portadas=("/",),
        patron_modelo=r"^/vehiculos/nuevos/[a-z0-9-]+\.html$",
    ),
    "chevrolet": Marca(
        clave="chevrolet",
        nombre="Chevrolet",
        base="https://www.chevrolet.com.pe",
        sitemaps=("/sitemap.xml",),
        portadas=("/",),
        patron_modelo=r"^/(camionetas|autos|pickups|vans|vehiculos-electricos|vehiculos-hibridos)/[a-z0-9-]+$",
        tipo_por_ruta=_tipo_chevrolet,
        excluir=r"/(autonomia|preguntas-frecuentes)$",
    ),
    "changan": Marca(
        clave="changan",
        nombre="Changan",
        base="https://www.changan.com.pe",
        sitemaps=("/sitemap.xml",),
        portadas=("/",),
        patron_modelo=r"^/(vehiculo|vehiculos/changan)/[a-z0-9-]+/?$",
    ),
    "chery": Marca(
        clave="chery",
        nombre="Chery",
        base="https://www.chery.com.pe",
        sitemaps=("/sitemap.xml",),
        portadas=("/",),
        patron_modelo=r"^/modelos/[a-z0-9-]+/?$",
    ),
    "mg": Marca(
        clave="mg",
        nombre="MG",
        base="https://www.mgmotor.pe",
        sitemaps=("/sitemap-index.xml",),
        portadas=("/",),
        patron_modelo=r"^/model/[a-z0-9-]+/?$",
    ),
    "byd": Marca(
        clave="byd",
        nombre="BYD",
        base="https://www.byd.com",
        sitemaps=(),
        portadas=("/pe",),
        patron_modelo=r"^/pe/car/[A-Za-z0-9_-]+/?$",
        prefijos_slug=("byd-", "byd"),
    ),
    "renault": Marca(
        clave="renault",
        nombre="Renault",
        base="https://www.renault.pe",
        sitemaps=("/sitemap.xml",),
        portadas=("/",),
        patron_modelo=r"^/(vehiculo|vehiculos/renault|automoviles)/[a-z0-9-]+/?$",
        prefijos_slug=("new-renault-", "renault-"),
    ),
    "mazda": Marca(
        clave="mazda",
        nombre="Mazda",
        base="https://www.mazda.pe",
        sitemaps=("/sitemap.xml",),
        portadas=("/",),
        patron_modelo=r"^/(vehiculo|vehiculos/mazda)/[a-z0-9-]+/?$",
    ),
    "subaru": Marca(
        clave="subaru",
        nombre="Subaru",
        base="https://www.subaru.com.pe",
        sitemaps=(),  # su sitemap declarado no existe
        portadas=("/",),
        patron_modelo=r"^/vehiculos/[a-z0-9-]+/?$",
    ),
    "jac": Marca(
        clave="jac",
        nombre="JAC",
        base="https://www.jac.pe",
        sitemaps=("/sitemap.xml",),
        portadas=("/",),
        patron_modelo=r"^/(vehiculo|vehiculos/jac)/[a-z0-9-]+/?$",
    ),
    "omodajaecoo": Marca(
        clave="omodajaecoo",
        nombre="Omoda | Jaecoo",
        base="https://www.omodajaecoo.pe",
        sitemaps=("/sitemap.xml",),
        portadas=("/",),
        patron_modelo=r"^/[cj]\d+(shs|ev|phev)?$",
    ),
    "jeep": Marca(
        clave="jeep",
        nombre="Jeep",
        base="https://www.jeep.com",
        sitemaps=(),
        portadas=("/pe/",),
        patron_modelo=r"^/pe/(\d{4}/)?(avenger|commander|compass|gladiator|grand-cherokee|renegade|wrangler|cherokee)\.html$",
    ),
    # ── Segunda tanda, revisada el 2026-11-08: robots.txt permite todo lo que se lee ──
    "geely": Marca(
        clave="geely",
        nombre="Geely",
        base="https://geely.pe",
        sitemaps=("/producto-sitemap.xml",),  # la portada repite modelos con rutas viejas (ex5-emi)
        portadas=(),
        patron_modelo=r"^/car/[a-z0-9-]+/?$",
        prefijos_slug=("venta-de-camionetas-",),
        sufijos_slug=("-geely-peru",),
    ),
    "baic": Marca(
        clave="baic",
        nombre="BAIC",
        base="https://baic.pe",
        sitemaps=("/sitemap.xml",),
        portadas=("/",),
        patron_modelo=r"^/modelos/[a-z0-9-]+/?$",
    ),
    "gwm": Marca(
        # Great Wall Motors: Haval, Tank, Poer y Wingle en un solo sitio
        clave="gwm",
        nombre="GWM",
        base="https://www.gwm.com.pe",
        sitemaps=(),  # su robots.txt apunta a otro dominio
        portadas=("/", "/haval/", "/tank/", "/poer/", "/ora/"),
        patron_modelo=r"^/vehiculo/(haval|tank|poer|ora|wey)/[a-z0-9-]+/?$",
    ),
    "soueast": Marca(
        clave="soueast",
        nombre="Soueast",
        base="https://soueast.com.pe",
        sitemaps=(),
        portadas=("/",),
        patron_modelo=r"^/modelo/[a-z0-9-]+/?$",
    ),
    "dfsk": Marca(
        clave="dfsk",
        nombre="DFSK",
        base="https://www.dfsk.com.pe",
        sitemaps=(),  # su sitemap no lista vehículos
        portadas=("/linea-glory", "/comerciales"),
        patron_modelo=r"^/vehiculo/[a-z0-9-]+/?$",
        prefijos_slug=("dfsk-",),
        tipo_por_ruta=_tipo_dfsk,
    ),
    "bmw": Marca(
        clave="bmw",
        nombre="BMW",
        base="https://www.bmw.com.pe",
        sitemaps=(),  # su sitemap apunta a un servidor de pruebas que no responde
        portadas=("/",),
        patron_modelo=r"(?i)^/(bmw-)?(serie-\d(-gc)?|x\d(m|-m|-hibrido(-enchufable)?)?|ix\d?|z4|m\d{1,3}i?|xm|\d-hibrido)$",
        prefijos_slug=("bmw-",),
        tipo_por_ruta=_tipo_bmw,
    ),
    "mini": Marca(
        clave="mini",
        nombre="MINI",
        base="https://www.mini.com.pe",
        sitemaps=(),  # idem BMW (mismo importador)
        portadas=("/",),
        # las versiones John Cooper Works (/jcw-…) y las landings (/mini-electric) no son modelos aparte
        patron_modelo=r"^/(cooper-[35]-puertas|cabrio|countryman|mini-aceman)$",
        prefijos_slug=("mini-",),
    ),
    "seat": Marca(
        clave="seat",
        nombre="SEAT",
        base="https://www.seat.pe",
        sitemaps=(),
        portadas=("/",),
        patron_modelo=r"^/autos/[a-z0-9-]+(/introduccion)?/?$",
        segmento_slug=1,
    ),
    "cupra": Marca(
        clave="cupra",
        nombre="CUPRA",
        base="https://www.cupraofficial.pe",
        sitemaps=(),
        portadas=("/",),
        patron_modelo=r"^/autos/[a-z0-9-]+/?$",
    ),
    "lexus": Marca(
        # lexus.pe tiene el certificado inválido: se usa la lista de su concesionario Mitsui Automotriz
        clave="lexus",
        nombre="Lexus",
        base="https://www.mitsuiautomotriz.com",
        sitemaps=(),  # su sitemap apunta al servidor de pruebas (qa.)
        portadas=("/lexus",),
        patron_modelo=r"^/lexus/[a-z0-9-]+$",
        excluir=r"/(locales|promociones)$",
        prefijos_slug=("camioneta-", "suv-", "sedan-"),
        tipo_por_ruta=_tipo_lexus,
        concesionario="Mitsui Automotriz",
    ),
}

#: Palabras clave por tipo. Se busca primero lo más específico (frases con guion).
#: Ampliar cuando aparezcan modelos nuevos: el resumen avisa los "Desconocido".
TIPOS_POR_PALABRA: list[tuple[str, tuple[str, ...]]] = [
    ("SUV", ("corolla-cross", "yaris-cross", "eclipse-cross", "xpander-cross", "s-cross", "grand-vitara", "spark-euv")),
    ("Hatchback", ("k3-cross",)),
    ("Sedán", ("mg-5", "mazda-3-sedan")),
    ("Camión", ("ex-6", "ex6", "ex8", "ex10", "ex11", "bx8", "bx11", "x200", "x300", "towner", "camion", "bus", "hd35", "pavise")),
    (
        "Pick-up",
        (
            "hilux", "l200", "pickup", "pick-up", "pickups", "tolva", "frontier", "navara", "tasman", "colorado", "silverado",
            "montana", "s10", "bt-50", "oroch", "hunter", "f70", "t6", "t8", "t9", "poer", "wingle", "shark", "gladiator", "himla",
        ),
    ),
    (
        "Van",
        ("hiace", "apv", "furgon", "van", "vans", "h100", "staria", "master", "minibus", "supervan", "refine", "sunray", "urvan", "solaty", "c35"),
    ),
    ("Minivan", ("avanza", "innova", "ertiga", "carens", "carnival", "glory-330", "glory-380")),
    ("Sedán", (
        "sedan", "corolla", "dzire", "city", "civic", "accord", "camry",
        "accent", "elantra", "sonata", "soluto", "k3", "versa", "sentra", "sail", "onix", "arrizo", "arrizo5", "alsvin", "emgrand", "logan",
        "301", "wrx", "seal", "han", "u5",
    )),
    ("Sedán", ("grand-i10-sedan", "emgrand-sedan")),
    ("Hatchback", ("mazda-3-sport", "mazda3-sport", "impreza")),
    (
        "Hatchback",
        (
            "agya", "baleno", "celerio", "s-presso", "alto", "swift", "hatchback", "hatch", "grand-i10", "picanto", "kwid", "march", "mazda2",
            "seagull", "dolphin", "cooper", "ibiza", "leon",
        ),
    ),
    (
        "SUV",
        (
            "rush", "raize", "fortuner", "prado", "land-cruiser", "rav4", "4runner", "bz4x",
            "brv", "br-v", "hrv", "hr-v", "crv", "cr-v", "wrv", "wr-v", "zrv", "zr-v", "pilot",
            "vitara", "evitara", "across", "xl7", "jimny", "fronx",
            "xpander", "outlander", "montero", "asx",
            "x50", "x70", "x90", "dashing", "t1", "t2", "traveller", "g700",
            "seltos", "sonet", "sportage", "sorento", "tucson", "creta", "santa-fe", "venue", "kona", "palisade",
            "kicks", "x-trail", "qashqai", "cx-3", "cx-30", "cx-5", "cx-50", "cx-60", "cx-90",
            "coolray", "azkarra", "okavango", "starray", "monjaro", "tugella", "tiggo", "uni-k", "uni-t",
            "cs15", "cs35", "cs55", "cs75", "deepal", "x7", "captiva", "groove", "tracker", "traverse", "tahoe", "suburban",
            "glory", "duster", "koleos", "2008", "3008", "5008", "crosstrek", "xv", "forester", "outback",
            "jolion", "h6", "dargo", "js2", "js3", "js4", "js6", "js8", "tank", "arkana",
            # marcas agregadas
            "bayon", "exter", "xtrail", "tiggo9", "ev3", "ev5", "ev9", "pathfinder", "sonic", "equinox", "blazer", "uni-v", "x7-plus",
            "tiggo2", "tiggo4", "tiggo7", "tiggo7pro", "tiggo8", "tiggo8pro", "zs", "hs", "rx5", "rx9",
            "yuan", "song", "atto", "sealion", "tang", "boreal", "kardian", "trailseeker", "evoltis", "e-30x",
            "c5", "c5shs", "c7", "c7shs", "j5", "j5ev", "j7", "j8",
            "avenger", "commander", "compass", "grand-cherokee", "renegade", "wrangler", "cherokee",
            # segunda tanda (Geely, BAIC, GWM, Soueast, MINI, SEAT, CUPRA)
            "cityray", "gx3", "ex5", "bj30", "bj40", "bj60", "x35", "x55", "h7", "h9", "s06", "s07", "s07m", "s08", "s09",
            "countryman", "aceman", "arona", "ateca", "tarraco", "formentor", "terramar",
        ),
    ),
]

TIPOS_VALIDOS = ("SUV", "Sedán", "Hatchback", "Minivan", "Pick-up", "Van", "Camión", "Desconocido")


# ── Fuentes multimarca (concesionarios) ─────────────────────────────────────


@dataclass(frozen=True)
class Multimarca:
    """
    Concesionario con listados por categoría que reúnen varias marcas. Sirve para versiones y
    precios publicados (con bonos), NO como ficha oficial: cada dato queda marcado como tal.
    """

    clave: str
    nombre: str
    base: str
    #: ruta del listado → tipo de la categoría ("Automóvil" se separa luego en Sedán/Hatchback)
    categorias: dict[str, str]
    por_pagina: int = 12


MULTIMARCA: dict[str, Multimarca] = {
    # robots.txt de Wigo permite los listados y ?page=, y prohíbe /*vehicle/* (detalles),
    # ?marca= y ?categoria=: por eso solo se leen los listados por categoría y nunca los detalles.
    "wigo": Multimarca(
        clave="wigo",
        nombre="Wigo Motors (concesionario multimarca)",
        base="https://www.wigomotors.com",
        categorias={
            "/vehiculos/nuevo/camioneta-rural": "SUV",
            "/vehiculos/nuevo/automovil": "Automóvil",
            "/vehiculos/nuevo/multiproposito": "Minivan",
            "/vehiculos/nuevo/pick-up": "Pick-up",
        },
    ),
}

#: Categorías de registro peruanas que muestran los listados de Wigo
CATEGORIAS_LISTADO = {
    "camioneta rural": "SUV",
    "automovil": "Automóvil",
    "automóvil": "Automóvil",
    "multiproposito": "Minivan",
    "multipropósito": "Minivan",
    "pick-up": "Pick-up",
    "pick up": "Pick-up",
    "camioneta pick-up": "Pick-up",
    "panel": "Van",
    "furgon": "Van",
    "furgón": "Van",
}

# ── Utilidades ──────────────────────────────────────────────────────────────


def ahora() -> str:
    return datetime.now(timezone.utc).astimezone().isoformat(timespec="seconds")


def hoy() -> str:
    return datetime.now().strftime("%Y-%m-%d")


def sha256(datos: bytes) -> str:
    return hashlib.sha256(datos).hexdigest()


def normalizar_url(url: str) -> str:
    """Sin fragmento ni query, espacios codificados, host en minúsculas."""
    p = urlparse(url.strip())
    ruta = quote(unquote(p.path), safe="/%:@!$&'()*+,;=-._~")
    return urlunparse((p.scheme.lower(), p.netloc.lower(), ruta, "", "", ""))


def nombre_archivo_seguro(texto: str, maximo: int = 90) -> str:
    base = re.sub(r"[^A-Za-z0-9._-]+", "-", unquote(texto)).strip("-.")
    return (base or "archivo")[:maximo]


class Detener(Exception):
    """Se pidió detener el scraper (archivo DETENER o señal)."""


# ── Extracción de HTML ──────────────────────────────────────────────────────


class ExtractorHTML(HTMLParser):
    """Saca enlaces, título, h1 y texto visible (sin script/style)."""

    OCULTOS = {"script", "style", "noscript", "template", "svg"}
    BLOQUES = {"p", "div", "li", "tr", "td", "th", "h1", "h2", "h3", "h4", "h5", "h6", "br", "section", "article", "dt", "dd", "span"}

    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.enlaces: list[str] = []
        self.titulo = ""
        self.h1: list[str] = []
        self._partes: list[str] = []
        self._oculto = 0
        self._en_titulo = False
        self._en_h1 = False

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if tag in self.OCULTOS:
            self._oculto += 1
        if tag == "title":
            self._en_titulo = True
        if tag == "h1":
            self._en_h1 = True
            self.h1.append("")
        if tag in self.BLOQUES:
            self._partes.append("\n")
        for nombre, valor in attrs:
            if valor and nombre in ("href", "src", "data-src", "data-href", "data-url"):
                self.enlaces.append(valor)

    def handle_endtag(self, tag: str) -> None:
        if tag in self.OCULTOS and self._oculto:
            self._oculto -= 1
        if tag == "title":
            self._en_titulo = False
        if tag == "h1":
            self._en_h1 = False
        if tag in self.BLOQUES:
            self._partes.append("\n")

    def handle_data(self, data: str) -> None:
        if self._en_titulo:
            self.titulo += data
        if self._oculto:
            return
        if self._en_h1 and self.h1:
            self.h1[-1] += data
        self._partes.append(data)

    def texto(self) -> str:
        crudo = "".join(self._partes)
        lineas = (re.sub(r"[ \t ]+", " ", l).strip() for l in crudo.splitlines())
        return "\n".join(l for l in lineas if l)


#: PDF mencionados en el HTML, incluso dentro de JSON o JavaScript (sitios hechos con Next.js)
RE_PDF = re.compile(r"""(?:https?://|/)[^"'<>\\\n]{1,300}?\.pdf(?=[\\"'?#)\s<]|$)""", re.IGNORECASE)
#: PDF que no son fichas
PDF_EXCLUIDOS = re.compile(r"privacidad|pol[ií]tica|t[eé]rminos|condiciones|reclamaciones|legales|cookies|\barco\b", re.IGNORECASE)


def decodificar_html(cuerpo: bytes, tipo_contenido: str) -> str:
    m = re.search(r"charset=([\w-]+)", tipo_contenido or "", re.IGNORECASE)
    if not m:
        m = re.search(rb'<meta[^>]+charset=["\']?([\w-]+)', cuerpo[:4000], re.IGNORECASE)
    charset = (m.group(1).decode() if m and isinstance(m.group(1), bytes) else m.group(1) if m else "utf-8")
    try:
        return cuerpo.decode(charset, errors="replace")
    except LookupError:
        return cuerpo.decode("utf-8", errors="replace")


# ── Candidatos de datos ─────────────────────────────────────────────────────

NUM = r"\d{1,3}(?:[.,]\d{3})+|\d+"
PATRONES: dict[str, list[re.Pattern[str]]] = {
    "precio_usd": [re.compile(rf"(?:US\$|USD|\$)\s?({NUM})(?:\.\d+)?", re.I)],
    # el "Precio desde" del propio modelo (no el "Desde:" de cada ítem del menú)
    "precio_desde_usd": [re.compile(rf"precio desde[^$]{{0,250}}?(?:US\$|USD|\$)\s?({NUM})", re.I | re.S)],
    "precio_soles": [re.compile(rf"S/\.?\s?({NUM})(?:\.\d+)?", re.I)],
    "potencia_hp": [
        re.compile(r"(\d{2,3}(?:[.,]\d{1,2})?)\s*(?:HP|hp|Hp|CV|PS)\b"),
        re.compile(r"potencia[^\n]{0,40}?(\d{2,3}(?:[.,]\d{1,2})?)", re.I),
    ],
    "torque": [re.compile(r"(\d{2,3}(?:[.,]\d{1,2})?)\s*(?:N\s?[·.]?\s?m|Nm|kg-?f?\.?\s?-?m|lb-?pie)", re.I)],
    "cilindrada": [re.compile(r"(\d[.,]?\d{3})\s*(?:cc|cm3|cm³)\b", re.I), re.compile(r"\b(\d\.\d)\s?L\b")],
    "transmision": [
        # solo 4–10 marchas: "0 CVT" o "2 MT" suelen ser notas al pie pegadas al texto
        re.compile(r"(?<![\d.,])((?:[4-9]|10)\s?(?:MT|AT|DCT|DHT))\b"),
        re.compile(r"\b(e-?CVT|CVT|DCT|DHT)\b"),
        re.compile(r"((?:autom[aá]tica|mec[aá]nica|manual) de \d+ (?:velocidades|marchas))", re.I),
    ],
    "traccion": [
        re.compile(r"\b(4x2|4x4|2WD|4WD|AWD)\b", re.I),
        re.compile(r"tracci[oó]n[^\n]{0,15}?(delantera|posterior|trasera|integral|4x4|4x2)", re.I),
    ],
    "altura_piso_mm": [
        re.compile(r"(?:distancia|altura|despeje)\s+(?:libre\s+|m[ií]nima\s+)?(?:al|del)\s+(?:suelo|piso)[^\n\d]{0,40}(\d{3})", re.I),
        re.compile(r"(?:ground clearance)[^\n\d]{0,30}(\d{3})", re.I),
    ],
    "asientos": [re.compile(r"\b(\d)\s*(?:asientos|pasajeros|plazas|ocupantes)\b", re.I)],
    "airbags": [
        re.compile(r"\b(\d{1,2})\s*(?:airbags|bolsas de aire)\b", re.I),
        re.compile(r"(?:airbags|bolsas de aire)\s*\(?\s*(\d{1,2})\s*\)?", re.I),
    ],
    "turbo": [re.compile(r"\b(turbo(?:alimentado)?|boosterjet|tgdi|t-gdi|1\.\d\s?t)\b", re.I)],
    "glp_gnv": [re.compile(r"\b(GLP|GNV|bi-?combustible|dual\s?fuel)\b", re.I)],
    "frenado_automatico": [
        re.compile(
            r"(frenado (?:aut[oó]nomo|autom[aá]tico)(?: de emergencia)?|mitigaci[oó]n de colisi[oó]n|CMBS|AEB|FCM|"
            r"pre-?collision|sistema de precolisi[oó]n)",
            re.I,
        )
    ],
    # El asistente de frenado (BA) solo refuerza la frenada cuando la persona pisa el freno:
    # NO es frenado automático. Va aparte para no confundirlos.
    "asistente_frenado": [re.compile(r"(asistente de frenado(?: de emergencia)?|brake assist|\bBAS?\b)", re.I)],
}


def _numero(valor: str) -> float | None:
    """'1,496' → 1496, '101.9' → 101.9, '96,6' → 96.6. None si empieza con 0 ('08')."""
    v = valor.strip()
    if re.fullmatch(r"0\d+", v):
        return None
    if re.fullmatch(r"\d{1,3}(?:[.,]\d{3})+", v):
        return float(re.sub(r"[.,]", "", v))
    try:
        return float(v.replace(",", "."))
    except ValueError:
        return None


#: Rangos razonables por campo: lo que cae fuera casi siempre es otro número (teléfonos, notas, kWh…)
RANGOS: dict[str, tuple[float, float]] = {
    "precio_usd": (5_000, 400_000),
    "precio_desde_usd": (5_000, 400_000),
    "precio_soles": (15_000, 1_500_000),
    "potencia_hp": (40, 800),
    "torque": (5, 1_200),
    "altura_piso_mm": (100, 400),
    "asientos": (2, 9),
    "airbags": (1, 12),
}


def valor_valido(campo: str, valor: str) -> bool:
    if campo == "cilindrada":
        n = _numero(valor)
        return n is not None and (0.6 <= n <= 8.0 or 600 <= n <= 8_000)
    if campo not in RANGOS:
        return True
    n = _numero(valor)
    minimo, maximo = RANGOS[campo]
    return n is not None and minimo <= n <= maximo


def candidatos_de(texto: str, fuente: dict, maximo_por_campo: int = 25) -> dict[str, list[dict]]:
    salida: dict[str, list[dict]] = {}
    for campo, patrones in PATRONES.items():
        vistos: set[str] = set()
        lista: list[dict] = []
        for patron in patrones:
            for m in patron.finditer(texto):
                valor = m.group(1).strip()
                clave = valor.lower()
                if clave in vistos or not valor_valido(campo, valor):
                    continue
                vistos.add(clave)
                ini, fin = max(0, m.start() - 70), min(len(texto), m.end() + 70)
                contexto = re.sub(r"\s+", " ", texto[ini:fin]).strip()
                lista.append({"valor": valor, "contexto": contexto, **fuente})
                if len(lista) >= maximo_por_campo:
                    break
        if lista:
            salida[campo] = lista
    return salida


def fusionar_candidatos(destino: dict[str, list[dict]], nuevos: dict[str, list[dict]]) -> None:
    for campo, lista in nuevos.items():
        destino.setdefault(campo, []).extend(lista)


# ── PDF ─────────────────────────────────────────────────────────────────────


def texto_de_pdf(ruta: Path) -> list[str] | None:
    """Texto por página. None si no hay librería; páginas vacías si el PDF es solo imagen."""
    try:
        import pdfplumber  # type: ignore

        with pdfplumber.open(ruta) as pdf:
            return [(p.extract_text() or "") for p in pdf.pages]
    except ImportError:
        pass
    except Exception as e:  # PDF dañado o raro
        log.warning("No se pudo leer %s con pdfplumber: %s", ruta.name, e)
        return []
    try:
        from pypdf import PdfReader  # type: ignore

        return [(p.extract_text() or "") for p in PdfReader(str(ruta)).pages]
    except ImportError:
        return None
    except Exception as e:
        log.warning("No se pudo leer %s con pypdf: %s", ruta.name, e)
        return []


# ── Cliente HTTP con cortesía ───────────────────────────────────────────────


#: Token de producto con el que se buscan reglas propias en robots.txt
PRODUCTO = "EncajaBot"


class Robots:
    """
    robots.txt según RFC 9309. A diferencia de urllib.robotparser, entiende los comodines
    `*` y `$` (Wigo usa `Disallow: /*vehicle/*`) y aplica la regla más larga.
    Usa el grupo de nuestro producto si existe; si no, el de `*`.
    """

    def __init__(self, texto: str, producto: str) -> None:
        self.reglas: list[tuple[bool, re.Pattern[str], int]] = []
        self.crawl_delay: float | None = None
        grupos: list[tuple[list[str], list[tuple[str, str]]]] = []
        agentes: list[str] = []
        reglas: list[tuple[str, str]] = []
        for linea in texto.splitlines():
            linea = linea.split("#", 1)[0].strip()
            if ":" not in linea:
                continue
            campo, valor = (x.strip() for x in linea.split(":", 1))
            campo = campo.lower()
            if campo == "user-agent":
                if reglas:  # un user-agent después de reglas abre un grupo nuevo
                    grupos.append((agentes, reglas))
                    agentes, reglas = [], []
                agentes.append(valor.lower())
            elif campo in ("allow", "disallow", "crawl-delay"):
                reglas.append((campo, valor))
        if agentes:
            grupos.append((agentes, reglas))
        token = producto.lower()
        propios = [r for a, r in grupos if any(x != "*" and x in token for x in a)]
        elegidos = propios or [r for a, r in grupos if "*" in a]
        for reglas_grupo in elegidos:
            for campo, valor in reglas_grupo:
                if campo == "crawl-delay":
                    try:
                        self.crawl_delay = float(valor)
                    except ValueError:
                        pass
                elif valor:  # "Disallow:" vacío no restringe nada
                    patron = re.escape(valor).replace(r"\*", ".*")
                    if patron.endswith(r"\$"):
                        patron = patron[:-2] + "$"
                    self.reglas.append((campo == "allow", re.compile(patron), len(valor)))

    def permitido(self, ruta: str) -> bool:
        mejor: tuple[int, bool] | None = None
        for permite, patron, largo in self.reglas:
            if patron.match(ruta) and (mejor is None or largo > mejor[0] or (largo == mejor[0] and permite)):
                mejor = (largo, permite)
        return True if mejor is None else mejor[1]


@dataclass
class Respuesta:
    url: str
    estado: int
    cabeceras: dict[str, str]
    cuerpo: bytes


@dataclass
class Cliente:
    agente: str
    pausa: float
    max_bytes: int
    detener: Callable[[], bool]
    _ultimo: dict[str, float] = field(default_factory=dict)
    _robots: dict[str, Robots | bool] = field(default_factory=dict)
    motivo_bloqueo: dict[str, str] = field(default_factory=dict)
    ultimo_bloqueo: str = ""
    peticiones: int = 0

    def _esperar_turno(self, host: str, minimo: float) -> None:
        espera = self._ultimo.get(host, 0) + minimo + random.uniform(0, minimo * 0.4) - time.monotonic()
        while espera > 0:
            if self.detener():
                raise Detener()
            time.sleep(min(espera, 1.0))
            espera -= 1.0
        self._ultimo[host] = time.monotonic()

    def _crudo(self, url: str, cabeceras_extra: dict[str, str] | None = None) -> Respuesta:
        host = urlparse(url).netloc
        self._esperar_turno(host, self._pausa_host(host))
        cab = {"User-Agent": self.agente, "Accept-Encoding": "gzip, deflate", "Accept-Language": "es-PE,es;q=0.9"}
        cab.update(cabeceras_extra or {})
        intentos = 3
        for intento in range(1, intentos + 1):
            if self.detener():
                raise Detener()
            try:
                self.peticiones += 1
                with urlopen(Request(url, headers=cab, method="GET"), timeout=40) as r:
                    datos = r.read(self.max_bytes + 1)
                    if len(datos) > self.max_bytes:
                        raise ValueError(f"supera {self.max_bytes // 1_000_000} MB")
                    cabeceras = {k.lower(): v for k, v in r.headers.items()}
                    datos = _descomprimir(datos, cabeceras.get("content-encoding", ""))
                    return Respuesta(r.geturl(), r.status, cabeceras, datos)
            except HTTPError as e:
                if e.code == 304:
                    return Respuesta(url, 304, {k.lower(): v for k, v in e.headers.items()}, b"")
                if e.code in (429, 500, 502, 503, 504) and intento < intentos:
                    pausa = 30 * intento
                    log.warning("HTTP %s en %s; reintento en %ss", e.code, url, pausa)
                    self._esperar_turno(host, pausa)
                    continue
                return Respuesta(url, e.code, {}, b"")
            except (ValueError, http.client.HTTPException) as e:  # archivo más grande que --max-mb, URL inválida
                log.warning("Se omite %s: %s", url, e)
                return Respuesta(url, 0, {}, b"")
            except (URLError, TimeoutError, ConnectionError, OSError) as e:
                motivo = getattr(e, "reason", e)
                if isinstance(motivo, ssl.SSLError):
                    # certificado vencido o inválido: no se reintenta ni se desactiva la verificación
                    log.warning("Certificado inválido en %s (%s): no se descarga", host, motivo)
                    return Respuesta(url, -1, {}, b"")
                if intento < intentos:
                    log.warning("Error de red en %s (%s); reintento", url, e)
                    self._esperar_turno(host, 15 * intento)
                    continue
                log.error("No se pudo descargar %s: %s", url, e)
                return Respuesta(url, 0, {}, b"")
        return Respuesta(url, 0, {}, b"")

    def _pausa_host(self, host: str) -> float:
        rp = self._robots.get(host)
        if isinstance(rp, Robots) and rp.crawl_delay:
            return max(self.pausa, rp.crawl_delay)
        return self.pausa

    def permitido(self, url: str) -> bool:
        """robots.txt según RFC 9309: 2xx se respeta, 4xx = sin restricciones, 5xx/red = no entrar."""
        p = urlparse(url)
        host = p.netloc
        if host not in self._robots:
            r = self._crudo(f"{p.scheme}://{host}/robots.txt")
            if 200 <= r.estado < 300:
                self._robots[host] = Robots(r.cuerpo.decode("utf-8", errors="replace"), PRODUCTO)
            elif 400 <= r.estado < 500:
                self._robots[host] = True
            else:
                self._robots[host] = False
                self.motivo_bloqueo[host] = (
                    "certificado de seguridad inválido o vencido" if r.estado == -1 else f"servidor no disponible (estado {r.estado})"
                )
                log.warning("%s: %s; no se visita ese servidor en esta pasada", host, self.motivo_bloqueo[host])
        regla = self._robots[host]
        if isinstance(regla, bool):
            return regla
        return regla.permitido((p.path or "/") + (f"?{p.query}" if p.query else ""))

    def get(self, url: str, cabeceras_extra: dict[str, str] | None = None) -> Respuesta | None:
        """None si no se debe visitar; el motivo queda en ultimo_bloqueo."""
        if not self.permitido(url):
            host = urlparse(url).netloc
            self.ultimo_bloqueo = self.motivo_bloqueo.get(host, "robots.txt no lo permite")
            log.info("Se omite %s: %s", url, self.ultimo_bloqueo)
            return None
        return self._crudo(url, cabeceras_extra)


def _descomprimir(datos: bytes, codificacion: str) -> bytes:
    codificacion = codificacion.lower()
    try:
        if "gzip" in codificacion:
            return gzip.decompress(datos)
        if "deflate" in codificacion:
            return zlib.decompress(datos)
    except (OSError, zlib.error):
        pass
    return datos


# ── Estado entre corridas ───────────────────────────────────────────────────


class Estado:
    """Recuerda ETag, Last-Modified y hash por URL para no re-bajar y para detectar cambios."""

    def __init__(self, ruta: Path) -> None:
        self.ruta = ruta
        try:
            self.datos: dict[str, dict] = json.loads(ruta.read_text(encoding="utf-8"))
        except (FileNotFoundError, json.JSONDecodeError):
            self.datos = {}

    def condicional(self, url: str) -> dict[str, str]:
        d = self.datos.get(url, {})
        cab = {}
        if d.get("etag"):
            cab["If-None-Match"] = d["etag"]
        if d.get("last_modified"):
            cab["If-Modified-Since"] = d["last_modified"]
        return cab

    def registrar(self, url: str, r: Respuesta, huella: str) -> str | None:
        """Devuelve la huella anterior si cambió."""
        previo = self.datos.get(url, {})
        self.datos[url] = {
            "etag": r.cabeceras.get("etag"),
            "last_modified": r.cabeceras.get("last-modified"),
            "huella": huella,
            "visto": ahora(),
        }
        anterior = previo.get("huella")
        return anterior if anterior and anterior != huella else None

    def guardar(self) -> None:
        tmp = self.ruta.with_suffix(".tmp")
        tmp.write_text(json.dumps(self.datos, ensure_ascii=False, indent=1), encoding="utf-8")
        tmp.replace(self.ruta)


# ── Descubrimiento y clasificación ──────────────────────────────────────────


@dataclass
class ModeloDescubierto:
    marca: str
    slug: str
    url: str
    tipo: str = "Desconocido"
    motivo_tipo: str = ""
    titulo: str = ""


def slug_de(marca: Marca, ruta: str) -> str:
    segmentos = [x for x in ruta.split("/") if x]
    try:
        seg = segmentos[marca.segmento_slug]
    except IndexError:
        seg = segmentos[-1] if segmentos else ""
    seg = re.sub(r"\.html?$", "", seg.lower())
    for p in marca.prefijos_slug:
        if seg.startswith(p):
            seg = seg[len(p):]
            break
    for sufijo in marca.sufijos_slug:
        if seg.endswith(sufijo):
            seg = seg[: -len(sufijo)]
            break
    return seg


def tipo_por_palabras(texto: str) -> tuple[str, str] | None:
    """Tipo según TIPOS_POR_PALABRA, sobre un slug o un nombre ("Suzuki Xl7 Smart Hybri…")."""
    t = re.sub(r"[\s_]+", "-", texto.lower())
    tokens = set(t.split("-"))
    for tipo, palabras in TIPOS_POR_PALABRA:
        for palabra in palabras:
            if ("-" in palabra and palabra in t) or palabra in tokens:
                return tipo, f"palabra clave '{palabra}'"
    return None


def clasificar(marca: Marca, ruta: str, slug: str, titulo: str = "") -> tuple[str, str]:
    por_palabra = tipo_por_palabras(slug)
    if por_palabra:
        return por_palabra
    por_ruta = marca.tipo_por_ruta(ruta)
    if por_ruta:
        return por_ruta, "categoría en la URL de la marca"
    t = titulo.lower()
    for tipo, patron in (("Pick-up", r"pick-?up"), ("Sedán", r"sed[aá]n"), ("Hatchback", r"hatchback"), ("SUV", r"\bsuv\b|camioneta")):
        if re.search(patron, t):
            return tipo, "título de la página"
    return "Desconocido", "sin pistas: revisar a mano"


MOTIVO_403 = "el sitio rechaza clientes automáticos (HTTP 403); se respeta y no se intenta disfrazar el scraper"


def _avisar_rechazo(r: Respuesta | None, url: str, avisos: list[str]) -> None:
    if r is not None and r.estado == 403:
        log.warning("%s: %s", url, MOTIVO_403)
        if MOTIVO_403 not in avisos:
            avisos.append(MOTIVO_403)


def rutas_de_sitemap(cliente: Cliente, url: str, profundidad: int = 0, avisos: list[str] | None = None) -> list[str]:
    r = cliente.get(url)
    if not r or r.estado != 200:
        _avisar_rechazo(r, url, avisos if avisos is not None else [])
        return []
    texto = r.cuerpo.decode("utf-8", errors="replace")
    locs = [html.unescape(x.strip()) for x in re.findall(r"<loc>\s*([^<]+?)\s*</loc>", texto)]
    if "<sitemapindex" in texto and profundidad < 2:
        todas: list[str] = []
        for sub in locs:
            todas.extend(rutas_de_sitemap(cliente, sub, profundidad + 1, avisos))
        return todas
    return locs


def _sin_www(host: str) -> str:
    return host[4:] if host.startswith("www.") else host


def descubrir(cliente: Cliente, marca: Marca, avisos: list[str] | None = None) -> list[ModeloDescubierto]:
    """Modelos de la marca. Los problemas de acceso (p. ej. 403) quedan en `avisos`."""
    avisos = avisos if avisos is not None else []
    patron = re.compile(marca.patron_modelo)
    host = _sin_www(urlparse(marca.base).netloc)  # www.dominio y dominio son el mismo sitio
    encontrados: dict[str, str] = {}

    def considerar(url_cruda: str, desde: str) -> None:
        url = normalizar_url(urljoin(desde, html.unescape(url_cruda)))
        p = urlparse(url)
        if _sin_www(p.netloc) != host or not patron.search(p.path):
            return
        if marca.excluir and re.search(marca.excluir, p.path):
            return
        clave = p.path.rstrip("/")
        encontrados.setdefault(clave, url)

    for s in marca.sitemaps:
        for loc in rutas_de_sitemap(cliente, marca.base + s, avisos=avisos):
            considerar(loc, marca.base)
    for portada in marca.portadas:
        r = cliente.get(marca.base + portada)
        _avisar_rechazo(r, marca.base + portada, avisos)
        if r and r.estado == 200:
            ex = ExtractorHTML()
            ex.feed(decodificar_html(r.cuerpo, r.cabeceras.get("content-type", "")))
            for enlace in ex.enlaces:
                considerar(enlace, r.url)

    modelos, slugs = [], set()
    for ruta, url in sorted(encontrados.items()):
        slug = slug_de(marca, ruta)
        if not slug or slug in slugs:  # dos rutas al mismo modelo ("/autos/arona" y "/autos/arona/introduccion")
            continue
        slugs.add(slug)
        tipo, motivo = clasificar(marca, ruta, slug)
        modelos.append(ModeloDescubierto(marca.clave, slug, url, tipo, motivo))
    return modelos


# ── Procesar un modelo ──────────────────────────────────────────────────────


@dataclass
class Opciones:
    salida: Path
    con_pdf: bool
    max_pdf: int


def procesar_modelo(cliente: Cliente, estado: Estado, m: ModeloDescubierto, op: Opciones, cambios: list[dict]) -> dict:
    carpeta = op.salida / m.marca / m.slug
    (carpeta / "pdf").mkdir(parents=True, exist_ok=True)
    meta: dict = {"marca": m.marca, "modelo": m.slug, "url": m.url, "tipo": m.tipo, "motivo_tipo": m.motivo_tipo, "consultado": ahora(), "pdfs": []}

    def con_error(motivo: str) -> dict:
        # se guarda igual, para que el resumen diga qué pasó (y no "aún no procesado")
        meta["error"] = motivo
        (carpeta / "meta.json").write_text(json.dumps(meta, ensure_ascii=False, indent=1), encoding="utf-8")
        return meta

    r = cliente.get(m.url, estado.condicional(m.url))
    if r is None:
        return con_error(cliente.ultimo_bloqueo)
    if r.estado == 304 and (carpeta / "pagina.html").exists():
        cuerpo = (carpeta / "pagina.html").read_bytes()
        tipo_contenido = "text/html; charset=utf-8"
        meta["sin_cambios"] = True
    elif r.estado == 200:
        cuerpo = r.cuerpo
        tipo_contenido = r.cabeceras.get("content-type", "")
    else:
        log.warning("%s/%s: HTTP %s", m.marca, m.slug, r.estado)
        return con_error(f"HTTP {r.estado} del servidor; se reintenta en la próxima pasada")

    texto_html = decodificar_html(cuerpo, tipo_contenido)
    ex = ExtractorHTML()
    ex.feed(texto_html)
    visible = ex.texto()
    m.titulo = re.sub(r"\s+", " ", html.unescape(ex.titulo)).strip()
    meta["titulo"] = m.titulo
    meta["h1"] = [re.sub(r"\s+", " ", h).strip() for h in ex.h1 if h.strip()]
    if m.tipo == "Desconocido":
        m.tipo, m.motivo_tipo = clasificar(MARCAS[m.marca], urlparse(m.url).path, m.slug, m.titulo + " " + " ".join(meta["h1"]))
        meta["tipo"], meta["motivo_tipo"] = m.tipo, m.motivo_tipo

    if r.estado == 200:
        (carpeta / "pagina.html").write_bytes(cuerpo)
        (carpeta / "pagina.txt").write_text(visible, encoding="utf-8")
        anterior = estado.registrar(m.url, r, sha256(visible.encode("utf-8")))
        if anterior:
            cambios.append({"fecha": ahora(), "marca": m.marca, "modelo": m.slug, "tipo": "pagina", "url": m.url})
            log.info("CAMBIO en la página de %s/%s", m.marca, m.slug)

    candidatos: dict[str, list[dict]] = {}
    fusionar_candidatos(candidatos, candidatos_de(visible, {"fuente": m.url, "origen": "página"}))

    # PDF enlazados (en atributos o dentro de JSON/JS)
    pdfs: list[str] = []
    for crudo in ex.enlaces + RE_PDF.findall(texto_html.replace("\\/", "/")):
        if ".pdf" not in crudo.lower():
            continue
        url_pdf = normalizar_url(urljoin(m.url, html.unescape(crudo)))
        partes = urlparse(url_pdf)
        if partes.scheme not in ("http", "https") or not re.fullmatch(r"[A-Za-z0-9.-]+(:\d+)?", partes.netloc):
            continue  # texto que el buscador de PDF confundió con un enlace
        if PDF_EXCLUIDOS.search(unquote(url_pdf)):
            continue
        if url_pdf not in pdfs:
            pdfs.append(url_pdf)

    if op.con_pdf:
        for url_pdf in pdfs[: op.max_pdf]:
            meta["pdfs"].append(bajar_pdf(cliente, estado, m, url_pdf, carpeta / "pdf", candidatos, cambios))
    else:
        meta["pdfs"] = [{"url": u, "omitido": "--sin-pdf"} for u in pdfs]

    (carpeta / "candidatos.json").write_text(json.dumps(candidatos, ensure_ascii=False, indent=1), encoding="utf-8")
    meta["candidatos"] = {k: len(v) for k, v in candidatos.items()}
    (carpeta / "meta.json").write_text(json.dumps(meta, ensure_ascii=False, indent=1), encoding="utf-8")
    return meta


def bajar_pdf(cliente: Cliente, estado: Estado, m: ModeloDescubierto, url: str, carpeta: Path, candidatos: dict, cambios: list[dict]) -> dict:
    nombre = nombre_archivo_seguro(urlparse(url).path.rsplit("/", 1)[-1])
    if not nombre.lower().endswith(".pdf"):
        nombre += ".pdf"
    destino = carpeta / nombre
    info: dict = {"url": url, "archivo": str(destino.relative_to(carpeta.parent.parent.parent))}
    r = cliente.get(url, estado.condicional(url) if destino.exists() else None)
    if r is None:
        info["error"] = cliente.ultimo_bloqueo
        return info
    if r.estado == 304 and destino.exists():
        info["sin_cambios"] = True
    elif r.estado == 200:
        if not r.cuerpo.startswith(b"%PDF"):
            info["error"] = "no es un PDF (posible formulario o página de error)"
            return info
        destino.write_bytes(r.cuerpo)
        anterior = estado.registrar(url, r, sha256(r.cuerpo))
        if anterior:
            cambios.append({"fecha": ahora(), "marca": m.marca, "modelo": m.slug, "tipo": "pdf", "url": url})
            log.info("CAMBIO en el PDF %s de %s/%s", nombre, m.marca, m.slug)
        log.info("PDF %s/%s: %s (%s KB)", m.marca, m.slug, nombre, len(r.cuerpo) // 1024)
    else:
        info["error"] = f"HTTP {r.estado}"
        return info

    paginas = texto_de_pdf(destino)
    if paginas is None:
        info["texto"] = "instala pdfplumber para extraer el texto"
        return info
    txt = destino.with_suffix(".txt")
    txt.write_text("\n".join(f"===== PÁGINA {i} =====\n{t}" for i, t in enumerate(paginas, 1)), encoding="utf-8")
    info["paginas"] = len(paginas)
    info["solo_imagen"] = sum(len(t.strip()) for t in paginas) < 50
    for i, t in enumerate(paginas, 1):
        if t.strip():
            fusionar_candidatos(candidatos, candidatos_de(t, {"fuente": url, "origen": "pdf", "pagina": i}))
    return info


# ── Resumen ─────────────────────────────────────────────────────────────────


def _entero(texto: str | None) -> int | None:
    if not texto:
        return None
    digitos = re.sub(r"[^\d]", "", texto)
    return int(digitos) if digitos else None


def leer_tarjetas(visible: str) -> list[dict]:
    """
    Tarjetas de un listado de Wigo. Cada una tiene, antes de "Desde": nombre completo,
    categoría, marca y modelo; después: "USD <precio> | S/ <precio>" y a veces "Incluye bono de …".
    """
    lineas = visible.splitlines()
    tarjetas = []
    for i, linea in enumerate(lineas):
        if linea.strip().lower() != "desde" or i < 4:
            continue
        nombre, categoria, marca, modelo = (x.strip() for x in lineas[i - 4 : i])
        tipo_categoria = CATEGORIAS_LISTADO.get(categoria.lower())
        if not tipo_categoria:
            continue  # no es una tarjeta (p. ej. el filtro de precios)
        siguiente = next((k for k in range(i + 1, min(len(lineas), i + 25)) if lineas[k].strip().lower() == "desde"), len(lineas))
        bloque = " ".join(lineas[i + 1 : min(siguiente - 4, i + 16)])
        usd = re.search(r"USD\s*\$?\s*([\d,]+)", bloque)
        pen = re.search(r"S/\.?\s*([\d,]+(?:\.\d+)?)", bloque)
        bono = re.search(r"bono de\s*USD\s*\$?\s*([\d,]+)\s*\|?\s*S/\.?\s*([\d,]+)", bloque, re.IGNORECASE)
        precio_usd = _entero(usd.group(1) if usd else None)
        bono_usd = _entero(bono.group(1) if bono else None)
        tarjetas.append(
            {
                "nombre": re.sub(r"\s+", " ", nombre),
                "categoria": categoria,
                "marca": marca.title(),
                "modelo": modelo,
                "precio_publicado_usd": precio_usd,
                "precio_publicado_soles": _entero(pen.group(1).split(".")[0] if pen else None),
                "bono_usd": bono_usd,
                "bono_soles": _entero(bono.group(2) if bono else None),
                # el precio publicado ya descuenta el bono (coincide con la lista oficial de Suzuki)
                "precio_lista_estimado_usd": (precio_usd + bono_usd) if precio_usd and bono_usd else precio_usd,
                "_tipo_categoria": tipo_categoria,
            }
        )
    return tarjetas


def leer_total(visible: str) -> int | None:
    m = re.search(r"(\d+)\s+al\s+(\d+)\s+de\s+(\d+)\s+autos", " ".join(visible.split()), re.IGNORECASE)
    return int(m.group(3)) if m else None


def tipo_de_tarjeta(t: dict) -> tuple[str, str]:
    """La categoría del listado manda; "Automóvil" se separa en Sedán o Hatchback."""
    base = t.pop("_tipo_categoria")
    if base != "Automóvil":
        return base, f"categoría del listado: {t['categoria']}"
    texto = f"{t['nombre']} {t['modelo']}"
    if re.search(r"\b(hb|hatch|hatchback|5p|5\s?puertas)\b", texto, re.IGNORECASE):
        return "Hatchback", "Automóvil con 'HB/Hatchback' en el nombre"
    if re.search(r"\b(sed[aá]n|sd|4p)\b", texto, re.IGNORECASE):
        return "Sedán", "Automóvil con 'Sedán' en el nombre"
    por_palabra = tipo_por_palabras(texto)
    if por_palabra:
        return por_palabra[0], f"Automóvil, {por_palabra[1]}"
    return "Desconocido", "Automóvil sin pistas de sedán o hatchback: revisar a mano"


def procesar_multimarca(
    cliente: Cliente, fuente: Multimarca, tipos: set[str], op: Opciones, cambios: list[dict], max_paginas: int, solo_descubrir: bool
) -> list[dict]:
    carpeta = op.salida / fuente.clave
    (carpeta / "listados").mkdir(parents=True, exist_ok=True)
    pedir = {
        ruta: tipo
        for ruta, tipo in fuente.categorias.items()
        if tipo in tipos or (tipo == "Automóvil" and tipos & {"Sedán", "Hatchback"})
    }
    versiones: list[dict] = []
    for ruta, tipo_categoria in pedir.items():
        pagina, paginas = 1, 1
        while pagina <= paginas:
            url = fuente.base + ruta + (f"?page={pagina}" if pagina > 1 else "")
            r = cliente.get(url)
            if r is None or r.estado != 200:
                log.warning("%s: no se pudo leer %s (%s)", fuente.nombre, url, cliente.ultimo_bloqueo if r is None else r.estado)
                break
            ex = ExtractorHTML()
            ex.feed(decodificar_html(r.cuerpo, r.cabeceras.get("content-type", "")))
            visible = ex.texto()
            (carpeta / "listados" / f"{ruta.rsplit('/', 1)[-1]}-p{pagina}.txt").write_text(visible, encoding="utf-8")
            tarjetas = leer_tarjetas(visible)
            for t in tarjetas:
                t["tipo"], t["motivo_tipo"] = tipo_de_tarjeta(t)
                t["fuente"] = url
                t["consultado"] = hoy()
            versiones.extend(tarjetas)
            if pagina == 1:
                total = leer_total(visible) or len(tarjetas)
                paginas = min(max_paginas, 1 if solo_descubrir else -(-total // fuente.por_pagina))
                log.info("%s · %s: %s modelos en %s páginas", fuente.nombre, tipo_categoria, total, paginas)
            if not tarjetas:
                break
            pagina += 1

    # una versión puede repetirse entre páginas: se queda la primera
    unicas: dict[str, dict] = {}
    for v in versiones:
        unicas.setdefault(v["nombre"].lower(), v)
    elegidas = sorted(
        (v for v in unicas.values() if v["tipo"] in tipos or v["tipo"] == "Desconocido"),
        key=lambda v: (v["marca"], v["modelo"], v["nombre"]),
    )
    if solo_descubrir:
        return elegidas

    # cambios de precio respecto a la corrida anterior
    archivo = carpeta / "versiones.json"
    try:
        anteriores = {v["nombre"].lower(): v for v in json.loads(archivo.read_text(encoding="utf-8"))}
    except (FileNotFoundError, json.JSONDecodeError):
        anteriores = {}
    for v in elegidas:
        previo = anteriores.get(v["nombre"].lower())
        if previo and previo.get("precio_publicado_usd") != v["precio_publicado_usd"]:
            cambios.append(
                {"fecha": ahora(), "fuente": fuente.clave, "tipo": "precio", "nombre": v["nombre"],
                 "antes_usd": previo.get("precio_publicado_usd"), "despues_usd": v["precio_publicado_usd"], "url": v["fuente"]}
            )
            log.info("CAMBIO de precio: %s %s → %s", v["nombre"], previo.get("precio_publicado_usd"), v["precio_publicado_usd"])
    archivo.write_text(json.dumps(elegidas, ensure_ascii=False, indent=1), encoding="utf-8")
    return elegidas


def resumen_multimarca(salida: Path) -> list[str]:
    md: list[str] = []
    for clave, fuente in MULTIMARCA.items():
        try:
            versiones = json.loads((salida / clave / "versiones.json").read_text(encoding="utf-8"))
        except (FileNotFoundError, json.JSONDecodeError):
            continue
        grupos: dict[tuple[str, str], list[dict]] = {}
        for v in versiones:
            grupos.setdefault((v["marca"], v["modelo"]), []).append(v)
        md += [
            f"## {fuente.nombre}",
            "",
            "Cada fila es un modelo con su **versión de entrada** (la más barata que publica el listado). "
            "Precios **publicados por el concesionario**, ya con el bono descontado; el de lista es publicado + bono "
            "(coincidió con la web oficial de Suzuki en 5 de 5 modelos). No es una ficha oficial: confirmar con la marca.",
            "",
            "| Marca | Modelo | Tipo | Versión de entrada | Desde US$ (publicado) | Bono US$ | Lista estimada US$ |",
            "|---|---|---|---|---|---|---|",
        ]
        for (marca, modelo), vs in sorted(grupos.items()):
            precios = [v["precio_publicado_usd"] for v in vs if v.get("precio_publicado_usd")]
            listas = [v["precio_lista_estimado_usd"] for v in vs if v.get("precio_lista_estimado_usd")]
            bonos = [v["bono_usd"] for v in vs if v.get("bono_usd")]
            tipos_g = sorted({v["tipo"] for v in vs})
            entrada = min(vs, key=lambda v: v.get("precio_publicado_usd") or 10**9)["nombre"]
            md.append(
                f"| {marca} | {modelo} | {', '.join(tipos_g)} | {entrada} | "
                f"{min(precios):,} | {f'{max(bonos):,}' if bonos else ''} | {min(listas):,} |"
                if precios and listas
                else f"| {marca} | {modelo} | {', '.join(tipos_g)} | {entrada} | sin precio publicado |  |  |"
            )
        md.append("")
    return md


def leer_candidatos(carpeta_modelo: Path) -> dict[str, list[dict]]:
    try:
        return json.loads((carpeta_modelo / "candidatos.json").read_text(encoding="utf-8"))
    except (FileNotFoundError, json.JSONDecodeError):
        return {}


#: Campos donde un valor repetido en casi todas las páginas de una marca es ruido de menú
CAMPOS_CON_MENU = ("precio_usd", "precio_soles")


def valores_comunes(candidatos: list[dict[str, list[dict]]], campo: str) -> set[str]:
    """Valores que aparecen en ≥60 % de los modelos de una marca: menús, calculadoras, banners."""
    con_datos = [c for c in candidatos if c]
    if len(con_datos) < 3:
        return set()
    conteo: dict[str, int] = {}
    for c in con_datos:
        for v in {x["valor"] for x in c.get(campo, [])}:
            conteo[v] = conteo.get(v, 0) + 1
    umbral = max(3, 0.6 * len(con_datos))
    return {v for v, n in conteo.items() if n >= umbral}


def primeros(candidatos: dict[str, list[dict]], campo: str, n: int = 3, excluir: set[str] | None = None) -> str:
    vals: list[str] = []
    for x in candidatos.get(campo, []):
        if x["valor"] not in vals and x["valor"] not in (excluir or set()):
            vals.append(x["valor"])
    return ", ".join(vals[:n])


GENERICOS = {"new", "all", "smart", "hybrid", "hybri", "hyb", "smarthybrid", "the", "nuevo", "nueva", "fl", "pro", "max", "plus"}


def _tokens_modelo(texto: str) -> set[str]:
    return {t for t in re.split(r"[^a-z0-9]+", texto.lower()) if t and t not in GENERICOS}


def precio_wigo(salida: Path, marca: str, slug: str, slugs_marca: list[str]) -> str:
    """
    Precio de lista estimado en Wigo para el mismo modelo. Empareja por palabras del nombre:
    igualdad primero; si no, inclusión, pero nunca con un modelo de Wigo que corresponde a otro
    modelo oficial de la marca (p. ej. "Outlander Sport" no es la "New Outlander").
    """
    try:
        versiones = json.loads((salida / "wigo" / "versiones.json").read_text(encoding="utf-8"))
    except (FileNotFoundError, json.JSONDecodeError):
        return ""
    buscados = _tokens_modelo(slug)
    if not buscados:
        return ""
    de_otros = [_tokens_modelo(s) for s in slugs_marca if s != slug]
    propios = [
        v for v in versiones
        if v["marca"].lower().startswith(marca.lower()) and v.get("precio_lista_estimado_usd") and _tokens_modelo(v["modelo"])
    ]
    iguales = [v for v in propios if _tokens_modelo(v["modelo"]) == buscados]
    elegidos = iguales or [
        v for v in propios
        if (buscados <= _tokens_modelo(v["modelo"]) or _tokens_modelo(v["modelo"]) <= buscados)
        and _tokens_modelo(v["modelo"]) not in de_otros
    ]
    precios = [v["precio_lista_estimado_usd"] for v in elegidos]
    return f"{min(precios):,}" if precios else ""


def cargar_descubiertos(salida: Path) -> dict[str, list[ModeloDescubierto]]:
    """Todas las marcas que ya tienen modelos.json en la salida (de esta pasada o de antes)."""
    todos: dict[str, list[ModeloDescubierto]] = {}
    for clave in MARCAS:
        try:
            filas = json.loads((salida / clave / "modelos.json").read_text(encoding="utf-8"))
        except (FileNotFoundError, json.JSONDecodeError):
            continue
        todos[clave] = [ModeloDescubierto(**f) for f in filas]
    return todos


def escribir_resumen(salida: Path, tipos: set[str]) -> None:
    filas_json = []
    md = [
        f"# Resumen del scraper ({ahora()})",
        "",
        "Los valores son **candidatos**: revisarlos contra la fuente antes de usarlos.",
        "En las tablas de marca se ocultan los precios que aparecen en casi todas las páginas de la marca (menús y calculadoras); "
        "siguen en `candidatos.json`. «Lista Wigo» es el precio de lista estimado del concesionario para el mismo modelo.",
        "",
    ]
    for clave, modelos in cargar_descubiertos(salida).items():
        md += [
            f"## {MARCAS[clave].nombre}",
            "",
            "| Modelo | Tipo | PDF | Precio US$ (página) | Lista Wigo US$ | HP | Altura (mm) | Caja | Nota |",
            "|---|---|---|---|---|---|---|---|---|",
        ]
        aviso = salida / clave / "aviso.txt"
        if not modelos and aviso.exists():
            md += [f"Sin modelos: {aviso.read_text(encoding='utf-8')}.", ""]
        cands = {m.slug: leer_candidatos(salida / clave / m.slug) for m in modelos}
        menu = {campo: valores_comunes(list(cands.values()), campo) for campo in CAMPOS_CON_MENU}
        excluidos = []
        for m in modelos:
            meta_path = salida / clave / m.slug / "meta.json"
            try:
                meta = json.loads(meta_path.read_text(encoding="utf-8"))
            except (FileNotFoundError, json.JSONDecodeError):
                meta = {}
            tipo = meta.get("tipo", m.tipo)  # al procesar la página se puede reclasificar
            if tipo not in tipos:
                excluidos.append(f"{m.slug} ({tipo})")
                continue
            pdfs = meta.get("pdfs", [])
            n_pdf = sum(1 for p in pdfs if "error" not in p and "omitido" not in p)
            nota = meta.get("error") or next((p["error"] for p in pdfs if "error" in p), "")
            if not meta:
                nota = "aún no procesado"
            elif any(p.get("solo_imagen") for p in pdfs):
                nota = nota or "PDF solo imagen: revisar a mano"
            c = cands.get(m.slug, {})
            md.append(
                f"| [{m.slug}]({m.url}) | {tipo} | {n_pdf} | {primeros(c, 'precio_desde_usd', 1) or primeros(c, 'precio_usd', excluir=menu['precio_usd'])} | "
                f"{precio_wigo(salida, MARCAS[clave].nombre, m.slug, [x.slug for x in modelos])} | {primeros(c, 'potencia_hp')} | "
                f"{primeros(c, 'altura_piso_mm')} | {primeros(c, 'transmision')} | {nota} |"
            )
            filas_json.append({"marca": clave, "modelo": m.slug, "tipo": tipo, "url": m.url, "pdfs": n_pdf, "nota": nota})
        if excluidos:
            md += ["", f"Omitidos por tipo: {', '.join(excluidos)}"]
        if menu["precio_usd"]:
            md += ["", f"Precios ocultos por repetirse en casi todas las páginas: {', '.join(sorted(menu['precio_usd']))}"]
        md.append("")
    md += resumen_multimarca(salida)
    (salida / "resumen.md").write_text("\n".join(md), encoding="utf-8")
    (salida / "resumen.json").write_text(json.dumps(filas_json, ensure_ascii=False, indent=1), encoding="utf-8")


def reprocesar(salida: Path, tipos: set[str]) -> int:
    """Recalcula candidatos y resumen con lo ya descargado, sin conectarse a internet."""
    n = 0
    for clave in MARCAS:
        for meta_path in sorted((salida / clave).glob("*/meta.json")):
            carpeta = meta_path.parent
            try:
                meta = json.loads(meta_path.read_text(encoding="utf-8"))
            except json.JSONDecodeError:
                continue
            candidatos: dict[str, list[dict]] = {}
            pagina = carpeta / "pagina.txt"
            if pagina.exists():
                fusionar_candidatos(candidatos, candidatos_de(pagina.read_text(encoding="utf-8"), {"fuente": meta.get("url"), "origen": "página"}))
            for info in meta.get("pdfs", []):
                if "archivo" not in info or info.get("error"):
                    continue
                txt = (salida / info["archivo"]).with_suffix(".txt")
                if not txt.exists():
                    continue
                partes = re.split(r"^===== PÁGINA (\d+) =====$", txt.read_text(encoding="utf-8"), flags=re.MULTILINE)
                for k in range(1, len(partes) - 1, 2):
                    if partes[k + 1].strip():
                        fusionar_candidatos(
                            candidatos, candidatos_de(partes[k + 1], {"fuente": info["url"], "origen": "pdf", "pagina": int(partes[k])})
                        )
            (carpeta / "candidatos.json").write_text(json.dumps(candidatos, ensure_ascii=False, indent=1), encoding="utf-8")
            meta["candidatos"] = {k: len(v) for k, v in candidatos.items()}
            meta_path.write_text(json.dumps(meta, ensure_ascii=False, indent=1), encoding="utf-8")
            n += 1
    escribir_resumen(salida, tipos | {"Desconocido"})
    return n


# ── Ciclo principal ─────────────────────────────────────────────────────────


class Candado:
    """Evita dos scrapers a la vez sobre la misma salida. Se libera solo si quedó viejo (12 h)."""

    def __init__(self, ruta: Path) -> None:
        self.ruta = ruta
        self.tomado = False

    def tomar(self) -> bool:
        try:
            if self.ruta.exists() and time.time() - self.ruta.stat().st_mtime > 12 * 3600:
                self.ruta.unlink()
            fd = os.open(self.ruta, os.O_CREAT | os.O_EXCL | os.O_WRONLY)
            os.write(fd, f"pid={os.getpid()} desde={ahora()}".encode())
            os.close(fd)
            self.tomado = True
            return True
        except FileExistsError:
            return False

    def refrescar(self) -> None:
        if self.tomado:
            os.utime(self.ruta, None)

    def soltar(self) -> None:
        if self.tomado:
            self.ruta.unlink(missing_ok=True)
            self.tomado = False


def una_pasada(
    cliente: Cliente, estado: Estado, marcas: list[str], tipos: set[str], op: Opciones,
    solo_descubrir: bool, max_modelos: int | None, max_paginas: int, candado: Candado,
) -> None:
    inicio = time.monotonic()
    cambios: list[dict] = []
    descubiertos: dict[str, list[ModeloDescubierto]] = {}
    hubo_multimarca = False
    try:
        for clave in marcas:
            if clave in MULTIMARCA:
                fuente = MULTIMARCA[clave]
                log.info("== %s: leyendo listados por categoría", fuente.nombre)
                candado.refrescar()
                try:
                    versiones = procesar_multimarca(cliente, fuente, tipos, op, cambios, max_paginas, solo_descubrir)
                except Detener:
                    raise
                except Exception:  # un sitio raro no debe cortar la pasada
                    log.exception("%s: error inesperado; se sigue con la siguiente fuente", fuente.nombre)
                    continue
                hubo_multimarca = True
                por_marca: dict[str, int] = {}
                for v in versiones:
                    por_marca[v["marca"]] = por_marca.get(v["marca"], 0) + 1
                log.info(
                    "%s: %d modelos de tipo %s (o por revisar) en %d marcas: %s",
                    fuente.nombre, len(versiones), "/".join(sorted(tipos)), len(por_marca),
                    ", ".join(f"{k} {n}" for k, n in sorted(por_marca.items())),
                )
                continue
            marca = MARCAS[clave]
            log.info("== %s: descubriendo modelos", marca.nombre)
            avisos: list[str] = []
            try:
                modelos = descubrir(cliente, marca, avisos)
            except Detener:
                raise
            except Exception:
                log.exception("%s: error inesperado al descubrir modelos; se sigue con la siguiente marca", marca.nombre)
                continue
            descubiertos[clave] = modelos
            (op.salida / clave).mkdir(parents=True, exist_ok=True)
            (op.salida / clave / "modelos.json").write_text(
                json.dumps([m.__dict__ for m in modelos], ensure_ascii=False, indent=1), encoding="utf-8"
            )
            aviso = op.salida / clave / "aviso.txt"
            if avisos and not modelos:
                aviso.write_text("; ".join(avisos), encoding="utf-8")
            else:
                aviso.unlink(missing_ok=True)
            elegidos = [m for m in modelos if m.tipo in tipos or m.tipo == "Desconocido"]
            log.info(
                "%s: %d modelos (%d de tipo %s o por clasificar)",
                marca.nombre, len(modelos), len(elegidos), "/".join(sorted(tipos)),
            )
            for m in modelos:
                log.info("   %-28s %-11s %s", m.slug, m.tipo, m.motivo_tipo)
            if solo_descubrir:
                continue
            for m in elegidos[:max_modelos]:
                candado.refrescar()
                try:
                    meta = procesar_modelo(cliente, estado, m, op, cambios)
                except Detener:
                    raise
                except Exception:  # un modelo con datos raros no debe cortar la pasada
                    log.exception("%s/%s: error inesperado; se sigue con el siguiente modelo", clave, m.slug)
                    continue
                log.info("%s/%s listo: %s PDF, candidatos %s", clave, m.slug, len(meta.get("pdfs", [])), meta.get("candidatos", {}))
                estado.guardar()
    finally:
        estado.guardar()
        if cambios:
            with (op.salida / "cambios.jsonl").open("a", encoding="utf-8") as f:
                for c in cambios:
                    f.write(json.dumps(c, ensure_ascii=False) + "\n")
        if (descubiertos or hubo_multimarca) and not solo_descubrir:
            escribir_resumen(op.salida, tipos | {"Desconocido"})
        log.info("Pasada terminada en %.0f s, %d peticiones, %d cambios", time.monotonic() - inicio, cliente.peticiones, len(cambios))


def configurar_log(salida: Path, verboso: bool) -> None:
    log.setLevel(logging.DEBUG if verboso else logging.INFO)
    formato = logging.Formatter("%(asctime)s %(levelname)-7s %(message)s", "%Y-%m-%d %H:%M:%S")
    archivo = logging.FileHandler(salida / "scraper.log", encoding="utf-8")
    archivo.setFormatter(formato)
    log.addHandler(archivo)
    if sys.stderr is not None:  # con pythonw no hay consola
        if hasattr(sys.stderr, "reconfigure"):
            sys.stderr.reconfigure(encoding="utf-8", errors="replace")
        consola = logging.StreamHandler()
        consola.setFormatter(formato)
        log.addHandler(consola)


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description="Baja páginas y fichas oficiales de modelos vendidos en Perú (uso interno, revisar antes de publicar).")
    fuentes = [*MARCAS, *MULTIMARCA]
    ap.add_argument(
        "--marcas",
        default=",".join(fuentes),
        help=f"Lista separada por comas. Sitios oficiales: {', '.join(MARCAS)}. Concesionarios multimarca: {', '.join(MULTIMARCA)}",
    )
    ap.add_argument("--tipos", default="SUV,Sedán", help=f"Tipos a procesar. Disponibles: {', '.join(TIPOS_VALIDOS[:-1])}")
    ap.add_argument("--salida", type=Path, default=SALIDA_POR_DEFECTO, help="Carpeta de salida (por defecto scraping/salida)")
    ap.add_argument("--pausa", type=float, default=4.0, help="Segundos mínimos entre peticiones al mismo servidor (por defecto 4)")
    ap.add_argument("--max-pdf", type=int, default=6, help="Máximo de PDF por modelo")
    ap.add_argument("--max-mb", type=int, default=40, help="Tamaño máximo por archivo en MB")
    ap.add_argument("--max-modelos", type=int, default=None, help="Máximo de modelos por marca (para pruebas)")
    ap.add_argument("--max-paginas", type=int, default=25, help="Máximo de páginas por listado en concesionarios (por defecto 25)")
    ap.add_argument("--sin-pdf", action="store_true", help="No bajar PDF, solo las páginas")
    ap.add_argument("--solo-descubrir", action="store_true", help="Solo listar modelos y su tipo")
    ap.add_argument("--reprocesar", action="store_true", help="Recalcular candidatos y resumen con lo ya bajado, sin internet")
    ap.add_argument("--bucle", action="store_true", help="Repetir para siempre (para dejarlo en segundo plano)")
    ap.add_argument("--cada", type=float, default=24.0, help="Horas entre pasadas con --bucle (por defecto 24)")
    ap.add_argument("--contacto", default="", help="Correo o URL de contacto para el User-Agent (recomendado)")
    ap.add_argument("-v", "--verboso", action="store_true")
    a = ap.parse_args(argv)

    marcas = [m.strip().lower() for m in a.marcas.split(",") if m.strip()]
    desconocidas = [m for m in marcas if m not in MARCAS and m not in MULTIMARCA]
    if desconocidas:
        ap.error(f"Marcas desconocidas: {', '.join(desconocidas)}")
    sin_tilde = lambda s: s.lower().translate(str.maketrans("áéíóú", "aeiou")).replace("pickup", "pick-up")
    canon = {sin_tilde(t): t for t in TIPOS_VALIDOS}
    pedidos = [t.strip() for t in a.tipos.split(",") if t.strip()]
    invalidos = [t for t in pedidos if sin_tilde(t) not in canon]
    if invalidos:
        ap.error(f"Tipos desconocidos: {', '.join(invalidos)}")
    tipos = {canon[sin_tilde(t)] for t in pedidos}  # "Sedan" o "sedán" valen como "Sedán"

    a.salida.mkdir(parents=True, exist_ok=True)
    configurar_log(a.salida, a.verboso)

    candado = Candado(a.salida / ".scraper.lock")
    if not candado.tomar():
        log.error("Ya hay un scraper corriendo sobre %s (borra .scraper.lock si no es así)", a.salida)
        return 2

    archivo_detener = a.salida / "DETENER"
    archivo_detener.unlink(missing_ok=True)
    senal = {"detener": False}

    def pedir_detener(*_: object) -> None:
        senal["detener"] = True
        log.info("Deteniendo al terminar la petición en curso…")

    signal.signal(signal.SIGINT, pedir_detener)
    if hasattr(signal, "SIGTERM"):
        signal.signal(signal.SIGTERM, pedir_detener)

    def hay_que_detener() -> bool:
        return senal["detener"] or archivo_detener.exists()

    agente = f"{PRODUCTO}/{VERSION} (comparador independiente de autos en Peru; investigacion de fichas tecnicas{'; ' + a.contacto if a.contacto else ''})"
    cliente = Cliente(agente=agente, pausa=max(1.0, a.pausa), max_bytes=a.max_mb * 1_000_000, detener=hay_que_detener)
    estado = Estado(a.salida / "estado.json")
    op = Opciones(salida=a.salida, con_pdf=not a.sin_pdf, max_pdf=a.max_pdf)

    log.info("Encaja scraper %s · marcas: %s · tipos: %s · salida: %s", VERSION, ", ".join(marcas), ", ".join(sorted(tipos)), a.salida)
    if a.reprocesar:
        try:
            n = reprocesar(a.salida, tipos)
            log.info("Reprocesados %d modelos sin conectarse a internet; resumen actualizado", n)
        finally:
            candado.soltar()
        return 0
    try:
        while True:
            una_pasada(cliente, estado, marcas, tipos, op, a.solo_descubrir, a.max_modelos, max(1, a.max_paginas), candado)
            if not a.bucle:
                break
            proxima = time.time() + a.cada * 3600
            log.info("Próxima pasada: %s", datetime.fromtimestamp(proxima).strftime("%Y-%m-%d %H:%M"))
            while time.time() < proxima:
                if hay_que_detener():
                    raise Detener()
                candado.refrescar()
                time.sleep(30)
    except Detener:
        log.info("Detenido a pedido.")
    finally:
        archivo_detener.unlink(missing_ok=True)
        candado.soltar()
    return 0


if __name__ == "__main__":
    sys.exit(main())
