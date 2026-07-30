'use strict';

/**
 * Motor de calificación puro del Test de Cleaver. No toca la red, la base de
 * datos ni el DOM: recibe las marcas MÁS/MENOS del postulante y devuelve el
 * reporte completo (conteos M y L por factor, T = M − L, **percentiles**
 * oficiales, lecturas ALTO/BAJO/LÍNEA MEDIA, claves aplicadas con
 * interpretación, motivación y limitaciones). Toda la información
 * interpretativa (palabras del test, sinónimos y textos del manual) sale de
 * los archivos en `datos/cleaver/`, nunca del código.
 *
 * Réplica del Excel oficial (`Test_de_Cleaver_automatizado.xls`, hoja "hoja
 * de captura"): por cada uno de los 24 grupos el evaluado elige una palabra
 * MÁS (M) y una MENOS (L); cada palabra pertenece a un factor D/I/S/C. Se
 * cuentan M y L por factor, T = M − L, y se convierten a **percentiles**
 * usando las 12 tablas de baremos oficiales (D_M, I_M, S_M, C_M, D_L, I_L,
 * S_L, C_L, D_T, I_T, S_T, C_T).
 */

const path = require('node:path');
const fs = require('node:fs');

const DATOS_DIR = path.join(__dirname, '..', '..', 'datos', 'cleaver');

function loadJson(name) {
  return JSON.parse(fs.readFileSync(path.join(DATOS_DIR, name), 'utf8'));
}

const GRUPOS_DATA = loadJson('grupos_cleaver.json');
const INTERPRETACION = loadJson('interpretacion_cleaver.json');

const FACTORES = GRUPOS_DATA.factores; // ["D","I","S","C"]
const NOMBRE_FACTOR = GRUPOS_DATA.nombreFactor;
const BLOQUES = GRUPOS_DATA.bloques;
const GRUPOS = BLOQUES.flat().slice().sort((a, b) => a.g - b.g);
const TOTAL_GRUPOS = GRUPOS.length;
const GRUPO_POR_NUM = new Map(GRUPOS.map((gr) => [gr.g, gr]));
const NUMEROS_VALIDOS = new Set(GRUPOS.map((gr) => gr.g));

const COMBINACIONES = INTERPRETACION.combinaciones;   // {D/I: {nombre, texto}, ...}
const ALTO_BAJO = INTERPRETACION.altoBajo;             // {D+: {nombre, texto}, D-, I+, ...}
const PERCENTILES = INTERPRETACION.percentiles;        // {D_M, I_M, ..., C_T}: [[val,pct], ...]

/** Versión pública de los grupos (para el evaluado): las 24 palabras por
 * factor con sus sinónimos. La calificación e interpretación no viajan al
 * cliente. */
const GRUPOS_PUBLICOS = GRUPOS.map((gr) => ({
  g: gr.g,
  palabras: gr.palabras,
  definiciones: gr.definiciones || {},
}));

function esFactor(x) { return typeof x === 'string' && FACTORES.includes(x); }
function fmt(n) { return n > 0 ? `+${n}` : `${n}`; }

/** Convierte un conteo (M/L/T) al percentil oficial buscando en la tabla. Si
 * no hay entrada exacta, usa la más cercana por debajo. */
function percentilDe(clave, valor) {
  const tabla = PERCENTILES[clave];
  if (!tabla || !tabla.length) return null;
  // Búsqueda exacta primero
  for (const [v, p] of tabla) if (v === valor) return p;
  // Extrapolación: si está por debajo del mínimo, usa el percentil del mínimo;
  // si por encima del máximo, usa el del máximo.
  const vals = tabla.map((x) => x[0]);
  const minV = Math.min(...vals), maxV = Math.max(...vals);
  if (valor < minV) return tabla.find((x) => x[0] === minV)[1];
  if (valor > maxV) return tabla.find((x) => x[0] === maxV)[1];
  // Rango intermedio sin match exacto (no debería pasar por la granularidad de
  // las tablas, pero por si acaso: usa la entrada inmediatamente inferior).
  let best = null;
  for (const [v, p] of tabla) if (v <= valor && (best === null || v > best[0])) best = [v, p];
  return best ? best[1] : null;
}

/**
 * respuestas: { [g]: { mas: 'D'|'I'|'S'|'C', menos: 'D'|'I'|'S'|'C' } } — una
 * entrada por cada uno de los 24 grupos. Lanza un error tipado si faltan, si
 * una marca no es un factor válido o si MÁS y MENOS coinciden.
 */
function scoreCleaver(respuestas) {
  respuestas = respuestas || {};

  const faltantes = GRUPOS.filter((gr) => {
    const r = respuestas[gr.g];
    return !r || !r.mas || !r.menos;
  });
  if (faltantes.length) {
    const err = new Error(
      `Respuestas incompletas: faltan ${faltantes.length} grupo(s) (${faltantes
        .map((gr) => gr.g)
        .join(', ')}). Cada grupo necesita una palabra MÁS y una MENOS.`
    );
    err.code = 'RESPUESTAS_INCOMPLETAS';
    throw err;
  }
  const invalidas = GRUPOS.filter((gr) => {
    const r = respuestas[gr.g];
    return !esFactor(r.mas) || !esFactor(r.menos) || r.mas === r.menos;
  });
  if (invalidas.length) {
    const err = new Error(
      `Respuestas inválidas en grupo(s): ${invalidas.map((gr) => gr.g).join(', ')}. ` +
        'MÁS y MENOS deben ser factores distintos (D/I/S/C).'
    );
    err.code = 'RESPUESTAS_INVALIDAS';
    throw err;
  }

  const M = { D: 0, I: 0, S: 0, C: 0 };
  const L = { D: 0, I: 0, S: 0, C: 0 };
  const detalle = GRUPOS.map((gr) => {
    const r = respuestas[gr.g];
    M[r.mas] += 1;
    L[r.menos] += 1;
    return {
      g: gr.g,
      M: r.mas,
      L: r.menos,
      palabraM: gr.palabras[r.mas],
      palabraL: gr.palabras[r.menos],
    };
  });

  const T = {};
  const estado = {};
  FACTORES.forEach((f) => {
    T[f] = M[f] - L[f];
    estado[f] = T[f] > 0 ? 'ALTO' : T[f] < 0 ? 'BAJO' : 'LÍNEA MEDIA';
  });

  // Percentiles oficiales para M, L y T de cada factor.
  const percentiles = { M: {}, L: {}, T: {} };
  FACTORES.forEach((f) => {
    percentiles.M[f] = percentilDe(`${f}_M`, M[f]);
    percentiles.L[f] = percentilDe(`${f}_L`, L[f]);
    percentiles.T[f] = percentilDe(`${f}_T`, T[f]);
  });

  const orden = [...FACTORES].sort((a, b) => T[b] - T[a]);
  const dominante = orden[0];
  const secundario = orden[1];
  const inferior = orden[3];

  // Claves aplicadas (misma lógica del original), con su interpretación resuelta.
  const clavesBrutas = [];
  if (T[dominante] > 0) {
    clavesBrutas.push({
      clave: `${dominante}+`,
      motivo: `Factor con T más alto (${dominante} = ${fmt(T[dominante])}), por encima de la línea media.`,
    });
  }
  if (dominante !== secundario && T[dominante] !== T[secundario]) {
    const combo = `${dominante}/${secundario}`;
    if (COMBINACIONES[combo]) {
      clavesBrutas.push({
        clave: combo,
        motivo: `Combinación básica: factor más alto (${dominante} = ${fmt(T[dominante])}) sobre el segundo más alto (${secundario} = ${fmt(T[secundario])}).`,
      });
    }
  }
  if (T[inferior] < 0) {
    clavesBrutas.push({
      clave: `${inferior}-`,
      motivo: `Factor con T más bajo (${inferior} = ${fmt(T[inferior])}), por debajo de la línea media.`,
    });
  }
  if (T.D === T.C) {
    if (T.D > 0) {
      clavesBrutas.push({
        clave: 'D=C+',
        motivo: `T(D) = T(C) = ${fmt(T.D)}, ambos por encima de la línea media.`,
      });
    } else if (T.D < 0) {
      clavesBrutas.push({
        clave: 'D=C-',
        motivo: `T(D) = T(C) = ${fmt(T.D)}, ambos por debajo de la línea media.`,
      });
    }
  }

  const claves = clavesBrutas.map((c) => {
    // Puede venir de COMBINACIONES (D/I, D/S, ...) o de ALTO_BAJO (D+, D-, I+, ...)
    const info = COMBINACIONES[c.clave] || ALTO_BAJO[c.clave] || {};
    return {
      clave: c.clave,
      motivo: c.motivo,
      corto: info.nombre || '',
      texto: info.texto || '',
    };
  });

  return {
    total: TOTAL_GRUPOS,
    factores: FACTORES,
    nombreFactor: NOMBRE_FACTOR,
    M,
    L,
    T,
    percentiles,
    estado,
    orden,
    dominante,
    secundario,
    inferior,
    detalle,
    claves,
    sumaM: FACTORES.reduce((a, f) => a + M[f], 0),
    sumaL: FACTORES.reduce((a, f) => a + L[f], 0),
  };
}

module.exports = {
  FACTORES,
  NOMBRE_FACTOR,
  BLOQUES,
  GRUPOS,
  GRUPOS_PUBLICOS,
  TOTAL_GRUPOS,
  NUMEROS_VALIDOS,
  GRUPO_POR_NUM,
  COMBINACIONES,
  ALTO_BAJO,
  PERCENTILES,
  esFactor,
  fmt,
  percentilDe,
  scoreCleaver,
};
