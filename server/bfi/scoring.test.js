'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');

const {
  PREGUNTAS,
  TOTAL_PREGUNTAS,
  ESCALA,
  DIMENSIONES,
  ORDEN,
  valoresValidos,
  valorUsado,
  nivelDesdePromedio,
  scoreBFI,
} = require('./scoring');

/** Todas las respuestas con el mismo valor. */
function respuestasUniformes(valor) {
  const r = {};
  PREGUNTAS.forEach((p) => (r[p.id] = valor));
  return r;
}

test('el instrumento tiene 15 ítems numerados 1..15 con dimensión conocida', () => {
  assert.equal(TOTAL_PREGUNTAS, 15);
  assert.equal(PREGUNTAS.length, 15);
  const ids = PREGUNTAS.map((p) => p.id).sort((a, b) => a - b);
  for (let i = 0; i < 15; i++) assert.equal(ids[i], i + 1);
  PREGUNTAS.forEach((p) => {
    assert.ok(DIMENSIONES[p.dim], `Dimensión desconocida en el ítem ${p.id}: ${p.dim}`);
  });
});

test('cada dimensión mapea 3 ítems y en total cubren los 15 sin repetición', () => {
  const vistos = new Set();
  let suma = 0;
  ORDEN.forEach((dim) => {
    const items = DIMENSIONES[dim].items;
    assert.equal(items.length, 3, `La dimensión ${dim} debe tener 3 ítems`);
    items.forEach((id) => {
      assert.ok(!vistos.has(id), `El ítem ${id} está asignado a más de una dimensión`);
      vistos.add(id);
      suma++;
    });
  });
  assert.equal(suma, 15);
  assert.equal(vistos.size, 15);
});

test('los ítems inversos son exactamente 2, 5, 8 y 13', () => {
  const inversos = PREGUNTAS.filter((p) => p.inv).map((p) => p.id).sort((a, b) => a - b);
  assert.deepEqual(inversos, [2, 5, 8, 13]);
});

test('valorUsado aplica 6 − respuesta solo a los ítems inversos', () => {
  const normal = PREGUNTAS.find((p) => !p.inv);
  const inverso = PREGUNTAS.find((p) => p.inv);
  assert.equal(valorUsado(normal, 4), 4);
  assert.equal(valorUsado(inverso, 4), 2);
  assert.equal(valorUsado(inverso, 1), 5);
  assert.equal(valorUsado(inverso, 5), 1);
});

test('todas las respuestas neutras (3) dan promedio 3 y nivel Medio en todo', () => {
  const { resultados } = scoreBFI(respuestasUniformes(3));
  ORDEN.forEach((dim) => {
    assert.equal(resultados[dim].promedio, 3);
    assert.equal(resultados[dim].nivel.label, 'Medio');
  });
});

test('respuesta uniforme 5: las dimensiones sin inversos son Muy alto', () => {
  const { resultados } = scoreBFI(respuestasUniformes(5));
  // A (1,3,14) y R (4,9,11) no tienen ítems inversos → promedio 5 → Muy alto.
  assert.equal(resultados.A.promedio, 5);
  assert.equal(resultados.A.nivel.label, 'Muy alto');
  assert.equal(resultados.R.promedio, 5);
  assert.equal(resultados.R.nivel.label, 'Muy alto');
  // E tiene un inverso (5): 5,5→usado 1 + 5 + 5 = 11/3 ≈ 3.67 → Alto.
  assert.ok(Math.abs(resultados.E.promedio - 11 / 3) < 1e-9);
  assert.equal(resultados.E.nivel.label, 'Alto');
});

test('los umbrales de nivelDesdePromedio respetan los cortes del instrumento', () => {
  assert.equal(nivelDesdePromedio(1.0).label, 'Muy bajo');
  assert.equal(nivelDesdePromedio(1.8).label, 'Muy bajo');
  assert.equal(nivelDesdePromedio(1.81).label, 'Bajo');
  assert.equal(nivelDesdePromedio(2.6).label, 'Bajo');
  assert.equal(nivelDesdePromedio(3.4).label, 'Medio');
  assert.equal(nivelDesdePromedio(4.2).label, 'Alto');
  assert.equal(nivelDesdePromedio(4.21).label, 'Muy alto');
  assert.equal(nivelDesdePromedio(5.0).label, 'Muy alto');
});

test('cada resultado trae la interpretación correspondiente a su nivel', () => {
  const { resultados } = scoreBFI(respuestasUniformes(3));
  ORDEN.forEach((dim) => {
    assert.ok(resultados[dim].interpretacion.length > 0, `Falta interpretación en ${dim}`);
  });
});

test('respuestas incompletas lanzan RESPUESTAS_INCOMPLETAS', () => {
  const r = respuestasUniformes(3);
  delete r[7];
  assert.throws(() => scoreBFI(r), (e) => e.code === 'RESPUESTAS_INCOMPLETAS');
  assert.throws(() => scoreBFI({}), (e) => e.code === 'RESPUESTAS_INCOMPLETAS');
});

test('un valor fuera de 1..5 lanza RESPUESTAS_INVALIDAS', () => {
  const r = respuestasUniformes(3);
  r[1] = 6;
  assert.throws(() => scoreBFI(r), (e) => e.code === 'RESPUESTAS_INVALIDAS');
  const r2 = respuestasUniformes(3);
  r2[2] = 0;
  assert.throws(() => scoreBFI(r2), (e) => e.code === 'RESPUESTAS_INVALIDAS');
});

test('el detalle es autocontenido: id, texto, dimensión, inverso y valor usado', () => {
  const { detalle } = scoreBFI(respuestasUniformes(4));
  assert.equal(detalle.length, 15);
  assert.deepEqual(valoresValidos(), [1, 2, 3, 4, 5]);
  assert.equal(ESCALA.min, 1);
  assert.equal(ESCALA.max, 5);
  detalle.forEach((d) => {
    assert.ok(d.texto && d.dim && d.dimNombre);
    assert.equal(d.respuesta, 4);
    assert.equal(d.usado, d.inv ? 2 : 4);
  });
});
