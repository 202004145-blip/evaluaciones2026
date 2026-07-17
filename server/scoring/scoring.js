'use strict';

const path = require('node:path');
const fs = require('node:fs');

const DATOS_DIR = path.join(__dirname, '..', '..', 'datos');

function loadJson(name) {
  return JSON.parse(fs.readFileSync(path.join(DATOS_DIR, name), 'utf8'));
}

const ITEMS_DATA = loadJson('items_disc.json');
const CONVERSION_TABLES = loadJson('conversion_tables.json');
const PATTERN_LOOKUP_DATA = loadJson('pattern_lookup.json');
const PATRONES_DETALLE = loadJson('patrones_estructurados.json');
const ESTILOS_BASE = loadJson('estilos_base.json');

const ITEMS = ITEMS_DATA.items;
const ESCALAS = ['D', 'I', 'S', 'C'];

function levelFromBreakpoints(breakpoints, value) {
  for (const [v, l] of breakpoints) {
    if (v >= value) return l;
  }
  return breakpoints[breakpoints.length - 1][1];
}

function levelsForGrafica(grafica, tallies) {
  const tables = CONVERSION_TABLES[grafica];
  const out = {};
  ESCALAS.forEach((l) => {
    out[l] = levelFromBreakpoints(tables[l], tallies[l]);
  });
  return out;
}

function codeFromLevels(levels) {
  return '' + levels.D + levels.I + levels.S + levels.C;
}

function patternForCode(code) {
  const d = +code[0], i = +code[1], s = +code[2], c = +code[3];
  if ([d, i, s, c].some((n) => n < 1 || n > 7)) return null;
  const idx = (d - 1) * 343 + (i - 1) * 49 + (s - 1) * 7 + (c - 1);
  const ch = PATTERN_LOOKUP_DATA.LOOKUP[idx];
  if (ch === '.') return null;
  const pidx = PATTERN_LOOKUP_DATA.CHARS.indexOf(ch);
  return PATTERN_LOOKUP_DATA.PATTERN_LIST[pidx];
}

/**
 * answers: { [itemId]: { mas: 'D'|'I'|'S'|'C', menos: 'D'|'I'|'S'|'C' } }
 * Debe traer una entrada completa (mas y menos, distintos) para cada uno de los 28 ítems.
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
    const err = new Error(
      `Respuestas inválidas en grupo(s): ${invalidas.map((i) => i.id).join(', ')}.`
    );
    err.code = 'RESPUESTAS_INVALIDAS';
    throw err;
  }

  const tallyMas = { D: 0, I: 0, S: 0, C: 0 };
  const tallyMenos = { D: 0, I: 0, S: 0, C: 0 };
  const detalle = ITEMS.map((item) => {
    const e = answers[item.id];
    tallyMas[e.mas]++;
    tallyMenos[e.menos]++;
    return {
      id: item.id,
      palabras: item.palabras,
      mas: e.mas,
      menos: e.menos,
      palabra_mas: item.palabras[e.mas],
      palabra_menos: item.palabras[e.menos],
    };
  });

  const diferencia = {};
  ESCALAS.forEach((k) => (diferencia[k] = tallyMas[k] - tallyMenos[k]));
  const maxDif = Math.max(...Object.values(diferencia));
  const predominantes = ESCALAS.filter((k) => diferencia[k] === maxDif);

  const levelsI = levelsForGrafica('I', tallyMas);
  const levelsII = levelsForGrafica('II', tallyMenos);
  const levelsIII = levelsForGrafica('III', diferencia);
  const codeI = codeFromLevels(levelsI);
  const codeII = codeFromLevels(levelsII);
  const codeIII = codeFromLevels(levelsIII);
  const patternI = patternForCode(codeI);
  const patternII = patternForCode(codeII);
  const patternIII = patternForCode(codeIII);

  return {
    tallyMas,
    tallyMenos,
    diferencia,
    predominantes,
    detalle,
    levels: { I: levelsI, II: levelsII, III: levelsIII },
    codes: { I: codeI, II: codeII, III: codeIII },
    patterns: { I: patternI, II: patternII, III: patternIII },
  };
}

function interpretacionParaPatron(nombrePatron) {
  if (!nombrePatron) return null;
  return PATRONES_DETALLE[nombrePatron] || null;
}

module.exports = {
  ITEMS,
  ESCALAS,
  CONVERSION_TABLES,
  PATTERN_LOOKUP_DATA,
  PATRONES_DETALLE,
  ESTILOS_BASE,
  levelFromBreakpoints,
  levelsForGrafica,
  codeFromLevels,
  patternForCode,
  scoreAnswers,
  interpretacionParaPatron,
};
