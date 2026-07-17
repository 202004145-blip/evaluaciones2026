'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');

const {
  PREGUNTAS,
  TOTAL_PREGUNTAS,
  BAREMOS,
  ORDEN,
  COMPUESTAS,
  opcionesValidas,
  decatipoDe,
  nivelDecatipo,
  scoreIPV,
} = require('./scoring');

/** Respuestas todas correctas (cada pregunta contestada con su clave). */
function respuestasClave() {
  const r = {};
  PREGUNTAS.forEach((p) => (r[p.n] = p.clave));
  return r;
}

/** Respuestas todas incorrectas (una opción distinta de la clave). */
function respuestasErroneas() {
  const r = {};
  PREGUNTAS.forEach((p) => {
    r[p.n] = Object.keys(p.opciones).find((l) => l !== p.clave);
  });
  return r;
}

test('el instrumento tiene 87 preguntas con clave válida', () => {
  assert.equal(TOTAL_PREGUNTAS, 87);
  assert.equal(PREGUNTAS.length, 87);
  const nums = PREGUNTAS.map((p) => p.n).sort((a, b) => a - b);
  for (let i = 0; i < 87; i++) assert.equal(nums[i], i + 1);
  PREGUNTAS.forEach((p) => {
    assert.ok(p.opciones[p.clave], `La clave de la pregunta ${p.n} debe ser una de sus opciones`);
    assert.ok(opcionesValidas(p.n).length >= 2, `La pregunta ${p.n} debe tener al menos 2 opciones`);
  });
});

test('cada ítem del mapeo y de DGV existe en el cuestionario', () => {
  const validos = new Set(PREGUNTAS.map((p) => p.n));
  Object.values(BAREMOS.mapeo).forEach((items) =>
    items.forEach((n) => assert.ok(validos.has(n), `Ítem inexistente en el mapeo: ${n}`))
  );
  BAREMOS.itemsDGV.forEach((n) => assert.ok(validos.has(n), `Ítem DGV inexistente: ${n}`));
});

test('todas las respuestas correctas: la PD de cada escala iguala su número de ítems', () => {
  const { pd, decatipos, niveles } = scoreIPV(respuestasClave());

  Object.entries(BAREMOS.mapeo).forEach(([escala, items]) => {
    assert.equal(pd[escala], items.length, `PD de ${escala} con todo correcto`);
  });
  assert.equal(pd.DGV, BAREMOS.itemsDGV.length);

  // Compuestas = suma de sus partes.
  assert.equal(pd.R, pd.I + pd.II + pd.III + pd.IV);
  assert.equal(pd.A, pd.V + pd.VI + pd.VII + pd.VIII);

  // Se calcula decatipo y nivel para cada escala del orden.
  ORDEN.forEach((escala) => {
    assert.ok(decatipos[escala] >= 1 && decatipos[escala] <= 10);
    assert.ok(['bajo', 'medio', 'alto'].includes(niveles[escala]));
  });
});

test('las escalas compuestas siempre son la suma de sus partes', () => {
  // Un patrón de respuestas mixto (par correcto, impar incorrecto).
  const clave = respuestasClave();
  const err = respuestasErroneas();
  const mixto = {};
  PREGUNTAS.forEach((p) => (mixto[p.n] = p.n % 2 === 0 ? clave[p.n] : err[p.n]));

  const { pd } = scoreIPV(mixto);
  Object.entries(COMPUESTAS).forEach(([escala, partes]) => {
    const suma = partes.reduce((acc, parte) => acc + pd[parte], 0);
    assert.equal(pd[escala], suma, `${escala} = ${partes.join('+')}`);
  });
});

test('todas incorrectas: PD 0 y decatipo 1 en todas las escalas', () => {
  const { pd, decatipos } = scoreIPV(respuestasErroneas());
  ORDEN.forEach((escala) => {
    assert.equal(pd[escala], 0, `PD de ${escala}`);
    assert.equal(decatipos[escala], 1, `decatipo de ${escala}`);
  });
});

test('respuestas incompletas lanzan RESPUESTAS_INCOMPLETAS', () => {
  const r = respuestasClave();
  delete r[42];
  assert.throws(() => scoreIPV(r), (e) => e.code === 'RESPUESTAS_INCOMPLETAS');
  assert.throws(() => scoreIPV({}), (e) => e.code === 'RESPUESTAS_INCOMPLETAS');
});

test('una letra fuera de las opciones lanza RESPUESTAS_INVALIDAS', () => {
  const r = respuestasClave();
  r[78] = 'C'; // La pregunta 78 solo admite A o B.
  assert.throws(() => scoreIPV(r), (e) => e.code === 'RESPUESTAS_INVALIDAS');
});

test('decatipoDe respeta los límites de cada tramo', () => {
  const tabla = BAREMOS.decatipos.DGV; // [[0,5],[6,7],...,[16,21]]
  assert.equal(decatipoDe('DGV', 0), 1);
  assert.equal(decatipoDe('DGV', 5), 1);
  assert.equal(decatipoDe('DGV', 6), 2);
  assert.equal(decatipoDe('DGV', tabla[tabla.length - 1][0]), 10);
  assert.equal(decatipoDe('DGV', 999), 10); // por encima del máximo
});

test('nivelDecatipo clasifica bajo/medio/alto', () => {
  assert.equal(nivelDecatipo(1).cat, 'bajo');
  assert.equal(nivelDecatipo(3).cat, 'bajo');
  assert.equal(nivelDecatipo(4).cat, 'medio');
  assert.equal(nivelDecatipo(7).cat, 'medio');
  assert.equal(nivelDecatipo(8).cat, 'alto');
  assert.equal(nivelDecatipo(10).cat, 'alto');
});

test('el detalle es autocontenido: enunciado, opciones, clave y respuesta', () => {
  const { detalle } = scoreIPV(respuestasClave());
  assert.equal(detalle.length, 87);
  detalle.forEach((d) => {
    assert.ok(d.texto && d.opciones && d.clave);
    assert.equal(d.respuesta, d.clave);
    assert.equal(d.acierto, true);
  });
});
