'use strict';

/**
 * Motor de calificación puro del Test de Cleaver. No toca la red, la base de
 * datos ni el DOM: recibe las marcas MÁS/MENOS del postulante y devuelve el
 * reporte completo (conteos M y L, T = M − L, lecturas ALTO/BAJO, claves
 * aplicadas con su interpretación, motivación y limitaciones). Toda la
 * información interpretativa (palabras del test y textos del manual) sale de
 * los archivos en `datos/cleaver/`, nunca del código.
 *
 * Réplica exacta de la lógica original (`calcularAnalisis`): por cada uno de
 * los 24 grupos el evaluado elige una palabra MÁS (M) y una MENOS (L); cada
 * palabra pertenece a un factor D/I/S/C. Se cuentan las M y las L por factor,
 * T = M − L, y la lectura es ALTO (T>0), BAJO (T<0) o LÍNEA MEDIA (T=0).
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
// Lista plana de los 24 grupos ordenada por número.
const GRUPOS = BLOQUES.flat().slice().sort((a, b) => a.g - b.g);
const TOTAL_GRUPOS = GRUPOS.length;
const GRUPO_POR_NUM = new Map(GRUPOS.map((gr) => [gr.g, gr]));
const NUMEROS_VALIDOS = new Set(GRUPOS.map((gr) => gr.g));

const { rapida: INTERPRETACION_RAPIDA, motivacion: MOTIVACION, limitaciones: LIMITACIONES } =
  INTERPRETACION;

/** Versión pública de los grupos: las 24 palabras por factor. No hay secreto
 * en las palabras (el evaluado las ve), pero sí en la calificación. */
const GRUPOS_PUBLICOS = GRUPOS.map((gr) => ({ g: gr.g, palabras: gr.palabras }));

function esFactor(x) {
  return typeof x === 'string' && FACTORES.includes(x);
}

function fmt(n) {
  return n > 0 ? `+${n}` : `${n}`;
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
    if (INTERPRETACION_RAPIDA[combo]) {
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
    const info = INTERPRETACION_RAPIDA[c.clave] || {};
    return { clave: c.clave, motivo: c.motivo, corto: info.corto || '', texto: info.texto || '' };
  });

  // Motivación y limitaciones por factor (solo para factores fuera de la línea
  // media), resueltas desde el manual.
  const motivacion = {};
  const limitaciones = {};
  FACTORES.forEach((f) => {
    if (estado[f] === 'LÍNEA MEDIA') {
      motivacion[f] = null;
      limitaciones[f] = null;
      return;
    }
    const nivel = estado[f] === 'ALTO' ? 'alto' : 'bajo';
    const m = (MOTIVACION[f] && MOTIVACION[f][nivel]) || { quiere: [], necesita: [] };
    motivacion[f] = { estado: estado[f], quiere: m.quiere || [], necesita: m.necesita || [] };
    limitaciones[f] = { estado: estado[f], lista: (LIMITACIONES[f] && LIMITACIONES[f][nivel]) || [] };
  });

  return {
    total: TOTAL_GRUPOS,
    factores: FACTORES,
    nombreFactor: NOMBRE_FACTOR,
    M,
    L,
    T,
    estado,
    orden,
    dominante,
    secundario,
    inferior,
    detalle,
    claves,
    motivacion,
    limitaciones,
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
  esFactor,
  fmt,
  scoreCleaver,
};
