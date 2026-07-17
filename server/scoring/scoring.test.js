'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  ITEMS,
  ESCALAS,
  CONVERSION_TABLES,
  PATTERN_LOOKUP_DATA,
  PATRONES_DETALLE,
  levelFromBreakpoints,
  patternForCode,
  scoreAnswers,
} = require('./scoring.js');

function respuestasValidasDeMuestra() {
  const answers = {};
  ITEMS.forEach((item, idx) => {
    const mas = ESCALAS[idx % 4];
    const menos = ESCALAS[(idx + 1) % 4];
    answers[item.id] = { mas, menos };
  });
  return answers;
}

test('items_disc.json tiene exactamente 28 ítems', () => {
  assert.equal(ITEMS.length, 28);
});

test('suma de conteos MAS = 28 y MENOS = 28 sobre un formulario completo', () => {
  const record = scoreAnswers(respuestasValidasDeMuestra());
  const sumaMas = ESCALAS.reduce((acc, l) => acc + record.tallyMas[l], 0);
  const sumaMenos = ESCALAS.reduce((acc, l) => acc + record.tallyMenos[l], 0);
  assert.equal(sumaMas, 28);
  assert.equal(sumaMenos, 28);
});

test('la diferencia (Gráfica III) es MÁS - MENOS por escala', () => {
  const record = scoreAnswers(respuestasValidasDeMuestra());
  ESCALAS.forEach((l) => {
    assert.equal(record.diferencia[l], record.tallyMas[l] - record.tallyMenos[l]);
  });
});

test('scoreAnswers rechaza formularios incompletos', () => {
  const answers = respuestasValidasDeMuestra();
  delete answers[1];
  assert.throws(() => scoreAnswers(answers), /RESPUESTAS_INCOMPLETAS|incompletas/);
});

test('scoreAnswers rechaza mas === menos en un mismo ítem', () => {
  const answers = respuestasValidasDeMuestra();
  answers[1] = { mas: 'D', menos: 'D' };
  assert.throws(() => scoreAnswers(answers), /RESPUESTAS_INVALIDAS|inválidas/);
});

test('códigos de verificación conocidos (CLAUDE.md)', () => {
  assert.equal(patternForCode('1115'), 'Objetivo');
  assert.equal(patternForCode('1511'), 'Promotor');
  assert.equal(patternForCode('5555'), 'Superactivo');
});

test('exactamente 13 códigos faltantes en la matriz de patrones', () => {
  assert.equal(PATTERN_LOOKUP_DATA.MISSING.length, 13);
  let faltantesEncontrados = 0;
  PATTERN_LOOKUP_DATA.MISSING.forEach((code) => {
    assert.equal(patternForCode(code), null, `el código ${code} debería estar marcado como faltante`);
    faltantesEncontrados++;
  });
  assert.equal(faltantesEncontrados, 13);
});

test('todo código no marcado como faltante resuelve a un patrón documentado', () => {
  for (let d = 1; d <= 7; d++) {
    for (let i = 1; i <= 7; i++) {
      for (let s = 1; s <= 7; s++) {
        for (let c = 1; c <= 7; c++) {
          const code = `${d}${i}${s}${c}`;
          const pattern = patternForCode(code);
          if (PATTERN_LOOKUP_DATA.MISSING.includes(code)) {
            assert.equal(pattern, null);
          } else {
            assert.ok(
              PATTERN_LOOKUP_DATA.PATTERN_LIST.includes(pattern),
              `código ${code} no resolvió a un patrón válido`
            );
          }
        }
      }
    }
  }
});

test('cada patrón documentado (salvo Superactivo/Desconcertante) tiene ficha en patrones_estructurados.json', () => {
  PATTERN_LOOKUP_DATA.PATTERN_LIST.forEach((nombre) => {
    assert.ok(PATRONES_DETALLE[nombre], `falta ficha interpretativa para ${nombre}`);
  });
});

test('caso Superactivo: siempre se calculan también los patrones alternativos de Gráfica I y II', () => {
  const record = scoreAnswers(respuestasValidasDeMuestra());
  // patterns.I y patterns.II deben calcularse siempre, independientemente
  // de si patterns.III es "Superactivo", para poder mostrarlos como alternativa.
  assert.ok('I' in record.patterns);
  assert.ok('II' in record.patterns);
  assert.ok('III' in record.patterns);
});

test('las tablas de conversión cubren todo el rango posible de conteos sin lanzar error', () => {
  ['I', 'II'].forEach((grafica) => {
    ESCALAS.forEach((escala) => {
      for (let v = 0; v <= 28; v++) {
        const nivel = levelFromBreakpoints(CONVERSION_TABLES[grafica][escala], v);
        assert.ok(nivel >= 1 && nivel <= 7, `${grafica}/${escala} valor ${v} dio nivel ${nivel}`);
      }
    });
  });
  ESCALAS.forEach((escala) => {
    for (let v = -28; v <= 28; v++) {
      const nivel = levelFromBreakpoints(CONVERSION_TABLES.III[escala], v);
      assert.ok(nivel >= 1 && nivel <= 7, `III/${escala} valor ${v} dio nivel ${nivel}`);
    }
  });
});
