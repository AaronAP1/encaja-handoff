import precios from "@/data/precios.json";
import hondaBrV from "@/data/modelos/honda-br-v.json";
import mitsubishiXpanderCross from "@/data/modelos/mitsubishi-xpander-cross.json";
import toyotaRush from "@/data/modelos/toyota-rush.json";
import type { FichaModelo, Precios } from "./esquema";

/**
 * Fichas registradas, en el orden del catálogo (el orden desempata resultados).
 * Para sumar un modelo: crea data/modelos/<slug>.json desde _plantilla.json e impórtalo aquí.
 * fichas.test.ts valida cada archivo con el esquema y avisa si alguno quedó sin registrar.
 */
export const FICHAS = [toyotaRush, hondaBrV, mitsubishiXpanderCross] as unknown as FichaModelo[];

export const PRECIOS = (precios as unknown as Precios).precios;
