'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { scoreAnswers, ITEMS, ESCALAS, DIMENSIONES } = require('./gamboa');

function respuestas(fn) {
  const a = {};
  ITEMS.forEach((it, i) => (a[it.id] = fn(it, i)));
  return a;
}

test('hay 28 ítems y cada uno tiene las 4 dimensiones', () => {
  assert.strictEqual(ITEMS.length, 28);
  for (const it of ITEMS) {
    assert.deepStrictEqual(Object.keys(it.palabras).sort(), ['C', 'D', 'I', 'S']);
    const palabras = ESCALAS.map((d) => it.palabras[d]);
    assert.strictEqual(new Set(palabras).size, 4, `ítem ${it.id} tiene palabras repetidas`);
  }
});

test('MÁS→D y MENOS→I en los 28: positivos D=28, negativos I=28', () => {
  const r = scoreAnswers(respuestas(() => ({ mas: 'D', menos: 'I' })));
  assert.deepStrictEqual(r.positivos, { D: 28, I: 0, S: 0, C: 0 });
  assert.deepStrictEqual(r.negativos, { D: 0, I: 28, S: 0, C: 0 });
  assert.deepStrictEqual(r.neto, { D: 28, I: -28, S: 0, C: 0 });
  assert.deepStrictEqual(r.maxPositivo, ['D']);
  assert.deepStrictEqual(r.maxNegativo, ['I']);
});

test('el neto es positivos − negativos y coincide con un conteo hecho a mano', () => {
  const L = ESCALAS;
  const r = scoreAnswers(respuestas((it, i) => ({ mas: L[i % 4], menos: L[(i + 2) % 4] })));
  const posEsperado = { D: 0, I: 0, S: 0, C: 0 };
  const negEsperado = { D: 0, I: 0, S: 0, C: 0 };
  ITEMS.forEach((it, i) => {
    posEsperado[L[i % 4]]++;
    negEsperado[L[(i + 2) % 4]]++;
  });
  assert.deepStrictEqual(r.positivos, posEsperado);
  assert.deepStrictEqual(r.negativos, negEsperado);
  ESCALAS.forEach((d) => assert.strictEqual(r.neto[d], r.positivos[d] - r.negativos[d]));
});

test('el total de positivos y de negativos siempre suma 28', () => {
  const L = ESCALAS;
  const r = scoreAnswers(respuestas((it, i) => ({ mas: L[i % 4], menos: L[(i + 1) % 4] })));
  const sum = (o) => ESCALAS.reduce((a, d) => a + o[d], 0);
  assert.strictEqual(sum(r.positivos), 28);
  assert.strictEqual(sum(r.negativos), 28);
});

test('el ejemplo del PDF (+5, −8 → −3) se refleja en el neto', () => {
  // Caso donde D tiene exactamente +5 (ítems 1–5) y −8 (ítems 6–13),
  // sin que ningún ítem use D en MÁS y en MENOS a la vez.
  const a = {};
  ITEMS.forEach((it, i) => {
    if (i < 5) a[it.id] = { mas: 'D', menos: 'I' }; // 5 positivos en D
    else if (i < 13) a[it.id] = { mas: 'I', menos: 'D' }; // 8 negativos en D
    else a[it.id] = { mas: 'I', menos: 'S' };
  });
  const r = scoreAnswers(a);
  assert.strictEqual(r.positivos.D, 5);
  assert.strictEqual(r.negativos.D, 8);
  assert.strictEqual(r.neto.D, -3);
});

test('empate: maxPositivo puede devolver varias dimensiones', () => {
  const L = ESCALAS;
  const r = scoreAnswers(respuestas((it, i) => ({ mas: L[i % 4], menos: L[(i + 2) % 4] })));
  // 7 positivos por dimensión → empate en las 4
  assert.deepStrictEqual(r.maxPositivo, ['D', 'I', 'S', 'C']);
});

test('respuestas incompletas lanzan error con código', () => {
  const a = respuestas(() => ({ mas: 'D', menos: 'I' }));
  delete a[1].menos;
  assert.throws(() => scoreAnswers(a), (e) => e.code === 'RESPUESTAS_INCOMPLETAS');
});

test('MÁS y MENOS iguales son inválidas', () => {
  const a = respuestas(() => ({ mas: 'D', menos: 'I' }));
  a[3] = { mas: 'S', menos: 'S' };
  assert.throws(() => scoreAnswers(a), (e) => e.code === 'RESPUESTAS_INVALIDAS');
});

test('cada dimensión tiene su ficha de color', () => {
  for (const d of ESCALAS) {
    assert.ok(DIMENSIONES[d].nombre);
    assert.ok(DIMENSIONES[d].color);
    assert.ok(DIMENSIONES[d].descripcion);
  }
});
