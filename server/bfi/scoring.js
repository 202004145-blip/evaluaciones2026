'use strict';

/**
 * Motor de calificación puro del BFI-2-XS (Big Five Inventory-2 Extra-Short
 * Form, 15 ítems de escala Likert 1–5). No toca la red, la base de datos ni el
 * DOM: recibe las respuestas del postulante y devuelve, por cada uno de los 5
 * dominios, el promedio recodificado y su nivel cualitativo. Todo lo
 * interpretativo (enunciados, mapeo ítem→dimensión, ítems inversos, umbrales de
 * nivel y descripciones) sale de los archivos en `datos/bfi/`, nunca del
 * código, para poder contrastarlo y corregirlo sin tocar la lógica.
 */

const path = require('node:path');
const fs = require('node:fs');

const DATOS_DIR = path.join(__dirname, '..', '..', 'datos', 'bfi');

function loadJson(name) {
  return JSON.parse(fs.readFileSync(path.join(DATOS_DIR, name), 'utf8'));
}

const PREGUNTAS_DATA = loadJson('preguntas_bfi.json');
const BAREMOS = loadJson('baremos_bfi.json');

const PREGUNTAS = PREGUNTAS_DATA.preguntas;
const TOTAL_PREGUNTAS = PREGUNTAS.length;
const ESCALA = BAREMOS.escala; // { min: 1, max: 5 }
const DIMENSIONES = BAREMOS.dimensiones;
const ORDEN = BAREMOS.orden;
const NIVELES = BAREMOS.niveles;
const INTERPRETACIONES = BAREMOS.interpretaciones;

const PREGUNTA_POR_ID = new Map(PREGUNTAS.map((p) => [p.id, p]));

/** Valores válidos de respuesta (1..5) para cualquier ítem. */
function valoresValidos() {
  const out = [];
  for (let v = ESCALA.min; v <= ESCALA.max; v++) out.push(v);
  return out;
}

/**
 * Recodifica un ítem inverso: valor usado = (min + max) − respuesta. Con la
 * escala 1–5 esto es la fórmula clásica 6 − respuesta.
 */
function valorUsado(pregunta, respuesta) {
  return pregunta.inv ? ESCALA.min + ESCALA.max - respuesta : respuesta;
}

/** Nivel cualitativo a partir del promedio de una dimensión (1.0–5.0). */
function nivelDesdePromedio(promedio) {
  for (const nivel of NIVELES) {
    if (nivel.hasta == null || promedio <= nivel.hasta) {
      return { cat: nivel.cat, label: nivel.label };
    }
  }
  const ultimo = NIVELES[NIVELES.length - 1];
  return { cat: ultimo.cat, label: ultimo.label };
}

/**
 * respuestas: { [id]: 1|2|3|4|5 } — una entrada por cada uno de los 15 ítems.
 * Lanza un error tipado si faltan o son inválidas.
 */
function scoreBFI(respuestas) {
  respuestas = respuestas || {};

  const faltantes = PREGUNTAS.filter((p) => respuestas[p.id] == null);
  if (faltantes.length) {
    const err = new Error(
      `Respuestas incompletas: faltan ${faltantes.length} ítem(s) (${faltantes
        .map((p) => p.id)
        .join(', ')}).`
    );
    err.code = 'RESPUESTAS_INCOMPLETAS';
    throw err;
  }

  const validos = valoresValidos();
  const invalidas = PREGUNTAS.filter((p) => !validos.includes(Number(respuestas[p.id])));
  if (invalidas.length) {
    const err = new Error(
      `Respuestas inválidas en ítem(s): ${invalidas.map((p) => p.id).join(', ')}. ` +
        `Cada respuesta debe ser un entero de ${ESCALA.min} a ${ESCALA.max}.`
    );
    err.code = 'RESPUESTAS_INVALIDAS';
    throw err;
  }

  // Detalle ítem a ítem (autocontenido para exportaciones e histórico).
  const detalle = PREGUNTAS.map((p) => {
    const respuesta = Number(respuestas[p.id]);
    return {
      id: p.id,
      texto: p.texto,
      dim: p.dim,
      dimNombre: DIMENSIONES[p.dim].nombre,
      inv: !!p.inv,
      respuesta,
      usado: valorUsado(p, respuesta),
    };
  });

  // Promedio y nivel por dimensión, en el orden de presentación.
  const resultados = {};
  ORDEN.forEach((dim) => {
    const meta = DIMENSIONES[dim];
    const items = meta.items.map((id) => {
      const p = PREGUNTA_POR_ID.get(id);
      const respuesta = Number(respuestas[id]);
      return { id, inv: !!p.inv, respuesta, usado: valorUsado(p, respuesta) };
    });
    const suma = items.reduce((acc, it) => acc + it.usado, 0);
    const promedio = suma / items.length;
    const nivel = nivelDesdePromedio(promedio);
    resultados[dim] = {
      dim,
      nombre: meta.nombre,
      color: meta.color || null,
      items,
      suma,
      promedio,
      nivel,
      interpretacion: (INTERPRETACIONES[dim] || {})[nivel.label] || '',
    };
  });

  return {
    total: TOTAL_PREGUNTAS,
    nRespondidas: PREGUNTAS.length - faltantes.length,
    detalle,
    resultados,
  };
}

module.exports = {
  PREGUNTAS,
  TOTAL_PREGUNTAS,
  ESCALA,
  DIMENSIONES,
  ORDEN,
  NIVELES,
  INTERPRETACIONES,
  valoresValidos,
  valorUsado,
  nivelDesdePromedio,
  scoreBFI,
};
