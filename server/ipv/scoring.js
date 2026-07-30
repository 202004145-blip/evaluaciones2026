'use strict';

/**
 * Motor de calificación puro del IPV (Inventario de Personalidad para
 * Vendedores). No toca la red, la base de datos ni el DOM: recibe las
 * respuestas del postulante y devuelve puntuaciones directas, decatipos y
 * niveles. Toda la información interpretativa (enunciados, clave, mapeo
 * pregunta→escala, baremos y descripciones) sale de los archivos en
 * `datos/ipv/`, nunca del código — así se puede contrastar y corregir sin
 * tocar la lógica.
 *
 * Réplica exacta del Excel oficial del instrumento (`the_IPV_test.xls`):
 * - Cada una de las 9 escalas específicas (I..IX) tiene su propia lista de
 *   ítems y cada ítem su opción "correcta" (la que da +1 a esa escala).
 * - La escala VIII (Actividad) es de puntuación **inversa**: `PD = max − hits`
 *   (marcado en `baremos.escala_reversa.VIII`).
 * - DGV (Disposición General para la Venta) es una escala global con **su
 *   propia lista de ítems y sus propias opciones puntuables**, que pueden
 *   diferir de las opciones puntuables en la escala específica de la misma
 *   pregunta (ver `baremos.dgv_items`).
 * - Escalas compuestas: R = I + II + III + IV, A = V + VI + VII + VIII.
 * - Cada PD se convierte a decatipo 1..10 usando el rango [min, max] del
 *   baremo (algunas casillas son inalcanzables, marcadas con min/max null).
 * - Cada decatipo cae en uno de 5 niveles: 1-2 Muy Bajo, 3-4 Bajo, 5-6
 *   Promedio, 7-8 Mayor Promedio, 9-10 Alto (fórmula del Excel:
 *   `IF(dec<3,1,IF(dec<5,2,IF(dec<7,3,IF(dec<9,4,5))))`).
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

const ESCALAS_ESPECIFICAS = Object.keys(BAREMOS.mapeo); // I..IX
const ORDEN = BAREMOS.orden;                             // DGV, R, A, I..IX
const COMPUESTAS = BAREMOS.compuestas;                   // R, A
const DGV_ITEMS = BAREMOS.dgv_items;                     // [{q, opt}]
const ESCALA_REVERSA = BAREMOS.escala_reversa || {};     // {VIII: true}
const NIVELES_LABELS = BAREMOS.niveles;                  // {1: 'Muy Bajo', ...}

const PREGUNTA_POR_N = new Map(PREGUNTAS.map((p) => [p.n, p]));

/** Letras válidas (A/B/C) para una pregunta concreta. */
function opcionesValidas(n) {
  const p = PREGUNTA_POR_N.get(n);
  return p ? Object.keys(p.opciones) : [];
}

/**
 * Convierte una puntuación directa (PD) al decatipo 1..10 según la tabla del
 * baremo. Cada entrada de la tabla es {decatipo, min, max}; se busca el
 * decatipo cuyo rango [min, max] contiene la PD. Algunas casillas son
 * inalcanzables (min y max null) — se saltan. Si la PD queda por debajo del
 * primer tramo alcanzable → 1; por encima del último → 10.
 */
function decatipoDe(escala, pd) {
  const tabla = BAREMOS.decatipos[escala];
  if (!tabla) throw new Error(`Escala sin tabla de decatipos: ${escala}`);
  for (const fila of tabla) {
    if (fila.min === null || fila.max === null) continue;
    if (pd >= fila.min && pd <= fila.max) return fila.decatipo;
  }
  // Fallback: por debajo del primer rango → 1; por encima → 10.
  const alcanzables = tabla.filter((f) => f.min !== null && f.max !== null);
  if (!alcanzables.length) return 1;
  if (pd < alcanzables[0].min) return 1;
  return 10;
}

/**
 * Nivel cualitativo a partir del decatipo (fórmula del Excel oficial):
 *   1-2 → 1 (Muy Bajo), 3-4 → 2 (Bajo), 5-6 → 3 (Promedio),
 *   7-8 → 4 (Mayor Promedio), 9-10 → 5 (Alto).
 * Devuelve { codigo: 1..5, label: 'Muy Bajo'.. }.
 */
function nivelDecatipo(dec) {
  let cod;
  if (dec < 3) cod = 1;
  else if (dec < 5) cod = 2;
  else if (dec < 7) cod = 3;
  else if (dec < 9) cod = 4;
  else cod = 5;
  return { codigo: cod, label: NIVELES_LABELS[cod] || String(cod) };
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
    const items = BAREMOS.mapeo[escala];
    const aciertos = items.reduce((acc, n) => {
      const p = PREGUNTA_POR_N.get(n);
      return acc + (p && respuestas[n] === p.clave ? 1 : 0);
    }, 0);
    // Si la escala es "inversa" (VIII): PD = maxItems − aciertos.
    pd[escala] = ESCALA_REVERSA[escala] ? items.length - aciertos : aciertos;
  });

  // PD global DGV: cuenta cada ítem cuya opción marcada coincide con la
  // opción puntuable listada para esa pregunta en la lista DGV. Una pregunta
  // puede figurar dos veces con opciones distintas (ambas cuentan).
  pd.DGV = DGV_ITEMS.reduce((acc, item) => {
    return acc + (respuestas[item.q] === item.opt ? 1 : 0);
  }, 0);

  // Escalas compuestas (suma de sus escalas específicas).
  Object.entries(COMPUESTAS).forEach(([escala, partes]) => {
    pd[escala] = partes.reduce((acc, parte) => acc + pd[parte], 0);
  });

  // Decatipos y niveles en el orden de presentación.
  const decatipos = {};
  const niveles = {};
  const nivelesLabels = {};
  ORDEN.forEach((escala) => {
    const dec = decatipoDe(escala, pd[escala]);
    decatipos[escala] = dec;
    const nv = nivelDecatipo(dec);
    niveles[escala] = nv.codigo;
    nivelesLabels[escala] = nv.label;
  });

  return {
    total: TOTAL_PREGUNTAS,
    nRespondidas: PREGUNTAS.length - faltantes.length,
    detalle,
    pd,
    decatipos,
    niveles,        // codigo 1..5 por escala
    nivelesLabels,  // 'Muy Bajo'..'Alto' por escala
  };
}

module.exports = {
  PREGUNTAS,
  TOTAL_PREGUNTAS,
  BAREMOS,
  ESCALAS: BAREMOS.escalas,
  ORDEN,
  COMPUESTAS,
  NIVELES_LABELS,
  opcionesValidas,
  decatipoDe,
  nivelDecatipo,
  scoreIPV,
};
