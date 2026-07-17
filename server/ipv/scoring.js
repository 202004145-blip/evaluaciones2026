'use strict';

/**
 * Motor de calificación puro del IPV (Inventario de Personalidad para
 * Vendedores). No toca la red, la base de datos ni el DOM: recibe las
 * respuestas del postulante y devuelve puntuaciones directas, decatipos y
 * niveles. Todo lo interpretativo (enunciados, clave, mapeo pregunta→escala,
 * baremos y descripciones) sale de los archivos en `datos/ipv/`, nunca del
 * código — así se puede contrastar y corregir sin tocar la lógica.
 */

const path = require('node:path');
const fs = require('node:fs');

const DATOS_DIR = path.join(__dirname, '..', '..', 'datos', 'ipv');

function loadJson(name) {
  return JSON.parse(fs.readFileSync(path.join(DATOS_DIR, name), 'utf8'));
}

const PREGUNTAS_DATA = loadJson('preguntas_ipv.json');
const BAREMOS = loadJson('baremos_ipv.json');

const PREGUNTAS = PREGUNTAS_DATA.preguntas;
const TOTAL_PREGUNTAS = PREGUNTAS.length;

// Escalas específicas medidas directamente por ítems (I..IX).
const ESCALAS_ESPECIFICAS = Object.keys(BAREMOS.mapeo);
// Orden de presentación completo, incluyendo las compuestas y la global.
const ORDEN = BAREMOS.orden;
// Escalas compuestas: R = I+II+III+IV, A = V+VI+VII+VIII.
const COMPUESTAS = BAREMOS.compuestas;

const PREGUNTA_POR_N = new Map(PREGUNTAS.map((p) => [p.n, p]));

/** Letras válidas (A/B/C) para una pregunta concreta. */
function opcionesValidas(n) {
  const p = PREGUNTA_POR_N.get(n);
  return p ? Object.keys(p.opciones) : [];
}

/**
 * Convierte una puntuación directa (PD) al decatipo 1..10 usando la tabla de
 * baremos de la escala. Cada entrada de la tabla es un rango [min, max]
 * inclusivo; el decatipo es la posición (1..10) del rango que contiene la PD.
 */
function decatipoDe(escala, pd) {
  const tabla = BAREMOS.decatipos[escala];
  if (!tabla) throw new Error(`Escala sin tabla de decatipos: ${escala}`);
  for (let i = 0; i < tabla.length; i++) {
    const [min, max] = tabla[i];
    if (pd >= min && pd <= max) return i + 1;
  }
  // Fuera de rango: por debajo del primer tramo → 1; por encima → 10.
  return pd < tabla[0][0] ? 1 : tabla.length;
}

/** Nivel cualitativo a partir del decatipo (1-10). */
function nivelDecatipo(dec) {
  if (dec <= 3) return { cat: 'bajo', label: 'Bajo' };
  if (dec <= 7) return { cat: 'medio', label: 'Medio' };
  return { cat: 'alto', label: 'Alto' };
}

/**
 * respuestas: { [n]: 'A'|'B'|'C' } — una entrada por cada una de las 87
 * preguntas. Lanza un error tipado si faltan o son inválidas.
 */
function scoreIPV(respuestas) {
  respuestas = respuestas || {};

  const faltantes = PREGUNTAS.filter((p) => !respuestas[p.n]);
  if (faltantes.length) {
    const err = new Error(
      `Respuestas incompletas: faltan ${faltantes.length} pregunta(s) (${faltantes
        .map((p) => p.n)
        .join(', ')}).`
    );
    err.code = 'RESPUESTAS_INCOMPLETAS';
    throw err;
  }

  const invalidas = PREGUNTAS.filter((p) => !opcionesValidas(p.n).includes(respuestas[p.n]));
  if (invalidas.length) {
    const err = new Error(
      `Respuestas inválidas en pregunta(s): ${invalidas.map((p) => p.n).join(', ')}.`
    );
    err.code = 'RESPUESTAS_INVALIDAS';
    throw err;
  }

  // Detalle pregunta a pregunta (autocontenido para exportaciones e histórico).
  const detalle = PREGUNTAS.map((p) => {
    const respuesta = respuestas[p.n];
    return {
      n: p.n,
      texto: p.texto,
      opciones: p.opciones,
      clave: p.clave,
      respuesta,
      acierto: respuesta === p.clave,
    };
  });

  // PD de las escalas específicas: 1 punto por cada coincidencia con la clave.
  const pd = {};
  ESCALAS_ESPECIFICAS.forEach((escala) => {
    pd[escala] = BAREMOS.mapeo[escala].reduce((acc, n) => {
      const p = PREGUNTA_POR_N.get(n);
      return acc + (p && respuestas[n] === p.clave ? 1 : 0);
    }, 0);
  });

  // PD global DGV: coincidencias entre los ítems representativos.
  pd.DGV = BAREMOS.itemsDGV.reduce((acc, n) => {
    const p = PREGUNTA_POR_N.get(n);
    return acc + (p && respuestas[n] === p.clave ? 1 : 0);
  }, 0);

  // Escalas compuestas (suma de sus escalas específicas).
  Object.entries(COMPUESTAS).forEach(([escala, partes]) => {
    pd[escala] = partes.reduce((acc, parte) => acc + pd[parte], 0);
  });

  // Decatipos y niveles en el orden de presentación.
  const decatipos = {};
  const niveles = {};
  ORDEN.forEach((escala) => {
    const dec = decatipoDe(escala, pd[escala]);
    decatipos[escala] = dec;
    niveles[escala] = nivelDecatipo(dec).cat;
  });

  return {
    total: TOTAL_PREGUNTAS,
    nRespondidas: PREGUNTAS.length - faltantes.length,
    detalle,
    pd,
    decatipos,
    niveles,
  };
}

module.exports = {
  PREGUNTAS,
  TOTAL_PREGUNTAS,
  BAREMOS,
  ESCALAS: BAREMOS.escalas,
  ORDEN,
  COMPUESTAS,
  opcionesValidas,
  decatipoDe,
  nivelDecatipo,
  scoreIPV,
};
