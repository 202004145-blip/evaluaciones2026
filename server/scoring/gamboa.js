'use strict';

// Motor de calificación del DISC© (versión Marian Gamboa).
//
// Método de corrección (según el PDF oficial del instrumento):
//   1. Cada uno de los 28 grupos tiene 4 palabras, una por dimensión D/I/S/C.
//      El evaluado marca una como MÁS (+) y una como MENOS (−).
//   2. Por cada dimensión se cuentan los positivos (+) y los negativos (−).
//   3. El neto de cada dimensión = (# de +) − (# de −).
//   4. La personalidad PREDOMINANTE es la dimensión con más positivos
//      (máximo positivo). La personalidad que se REPELE/EVITA es la de más
//      negativos (máximo negativo).
//
// A diferencia del Personal Profile System (server/scoring/scoring.js, que se
// conserva pero ya no se usa en la app), aquí NO hay tablas de conversión a
// niveles 1–7 ni búsqueda de patrones: la calificación es la suma directa.

const path = require('node:path');
const fs = require('node:fs');

const DATOS_DIR = path.join(__dirname, '..', '..', 'datos', 'gamboa');

function loadJson(name) {
  return JSON.parse(fs.readFileSync(path.join(DATOS_DIR, name), 'utf8'));
}

const ITEMS_DATA = loadJson('items.json');
const INTERPRETACION = loadJson('interpretacion.json');

const ITEMS = ITEMS_DATA.items;
const ESCALAS = ['D', 'I', 'S', 'C'];
const DIMENSIONES = INTERPRETACION.dimensiones;

function ceros() {
  return { D: 0, I: 0, S: 0, C: 0 };
}

function maximos(conteo) {
  const max = Math.max(...ESCALAS.map((d) => conteo[d]));
  return ESCALAS.filter((d) => conteo[d] === max);
}

/**
 * answers: { [itemId]: { mas: 'D'|'I'|'S'|'C', menos: 'D'|'I'|'S'|'C' } }
 * Debe traer una entrada completa (mas y menos, distintos) por cada uno de los 28 ítems.
 */
function scoreAnswers(answers) {
  const faltantes = ITEMS.filter((item) => {
    const e = answers[item.id];
    return !e || !e.mas || !e.menos;
  });
  if (faltantes.length) {
    const err = new Error(
      `Respuestas incompletas: faltan ${faltantes.length} grupo(s) (${faltantes.map((i) => i.id).join(', ')}).`
    );
    err.code = 'RESPUESTAS_INCOMPLETAS';
    throw err;
  }

  const invalidas = ITEMS.filter((item) => {
    const e = answers[item.id];
    return e.mas === e.menos || !ESCALAS.includes(e.mas) || !ESCALAS.includes(e.menos);
  });
  if (invalidas.length) {
    const err = new Error(`Respuestas inválidas en grupo(s): ${invalidas.map((i) => i.id).join(', ')}.`);
    err.code = 'RESPUESTAS_INVALIDAS';
    throw err;
  }

  const positivos = ceros();
  const negativos = ceros();
  const detalle = ITEMS.map((item) => {
    const e = answers[item.id];
    positivos[e.mas]++;
    negativos[e.menos]++;
    return {
      id: item.id,
      orden: Array.isArray(item.orden) && item.orden.length === 4 ? item.orden : ESCALAS.slice(),
      palabras: item.palabras,
      mas: e.mas,
      menos: e.menos,
      palabra_mas: item.palabras[e.mas],
      palabra_menos: item.palabras[e.menos],
    };
  });

  const neto = ceros();
  ESCALAS.forEach((d) => (neto[d] = positivos[d] - negativos[d]));

  return {
    positivos,
    negativos,
    neto,
    maxPositivo: maximos(positivos), // personalidad predominante
    maxNegativo: maximos(negativos), // personalidad que repele / evita
    detalle,
  };
}

function fichaDimension(dim) {
  return DIMENSIONES[dim] || null;
}

module.exports = {
  ITEMS,
  ESCALAS,
  DIMENSIONES,
  INTERPRETACION,
  scoreAnswers,
  fichaDimension,
};
