'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const {
  FACTORES,
  GRUPOS,
  TOTAL_GRUPOS,
  scoreCleaver,
} = require('./scoring');

// Ayuda: construye respuestas para los 24 grupos con una función (g) -> {mas,menos}.
function respuestasDesde(fn) {
  const r = {};
  GRUPOS.forEach((gr) => {
    r[gr.g] = fn(gr);
  });
  return r;
}

test('hay 24 grupos y los 4 factores D/I/S/C', () => {
  assert.strictEqual(TOTAL_GRUPOS, 24);
  assert.deepStrictEqual(FACTORES, ['D', 'I', 'S', 'C']);
  // Cada grupo tiene una palabra por cada factor.
  GRUPOS.forEach((gr) => {
    assert.deepStrictEqual(Object.keys(gr.palabras).sort(), ['C', 'D', 'I', 'S']);
  });
});

test('sumas de verificación: suma de M = 24 y suma de L = 24', () => {
  const respuestas = respuestasDesde(() => ({ mas: 'D', menos: 'I' }));
  const r = scoreCleaver(respuestas);
  assert.strictEqual(r.sumaM, 24);
  assert.strictEqual(r.sumaL, 24);
  assert.strictEqual(FACTORES.reduce((a, f) => a + r.M[f], 0), 24);
  assert.strictEqual(FACTORES.reduce((a, f) => a + r.L[f], 0), 24);
});

test('todo MÁS=D y MENOS=I → T(D)=+24, T(I)=-24, lecturas y claves', () => {
  const r = scoreCleaver(respuestasDesde(() => ({ mas: 'D', menos: 'I' })));
  assert.strictEqual(r.M.D, 24);
  assert.strictEqual(r.L.I, 24);
  assert.strictEqual(r.T.D, 24);
  assert.strictEqual(r.T.I, -24);
  assert.strictEqual(r.estado.D, 'ALTO');
  assert.strictEqual(r.estado.I, 'BAJO');
  assert.strictEqual(r.dominante, 'D');
  assert.strictEqual(r.inferior, 'I');
  const clavesIds = r.claves.map((c) => c.clave);
  assert.ok(clavesIds.includes('D+'), 'debe incluir la clave D+');
  assert.ok(clavesIds.includes('I-'), 'debe incluir la clave I-');
  // La interpretación se resuelve desde datos/cleaver/.
  const dMas = r.claves.find((c) => c.clave === 'D+');
  assert.ok(dMas.corto.length > 0 && dMas.texto.length > 0, 'D+ debe traer corto y texto');
});

test('empate D=C por encima de la media agrega la clave D=C+', () => {
  // MÁS alterna D y C, MENOS alterna I y S, de forma pareja entre los 24 grupos.
  let i = 0;
  const r = scoreCleaver(
    respuestasDesde(() => {
      const par = i++ % 2 === 0;
      return { mas: par ? 'D' : 'C', menos: par ? 'I' : 'S' };
    })
  );
  assert.strictEqual(r.T.D, r.T.C);
  assert.ok(r.T.D > 0);
  assert.ok(r.claves.some((c) => c.clave === 'D=C+'));
});

test('motivación y limitaciones solo para factores fuera de la línea media', () => {
  const r = scoreCleaver(respuestasDesde(() => ({ mas: 'D', menos: 'I' })));
  // D (ALTO) e I (BAJO) fuera de la media; S y C en la media (T=0).
  assert.ok(r.motivacion.D && r.limitaciones.D);
  assert.ok(r.motivacion.I && r.limitaciones.I);
  assert.strictEqual(r.motivacion.S, null);
  assert.strictEqual(r.limitaciones.C, null);
  assert.ok(Array.isArray(r.motivacion.D.quiere) && r.motivacion.D.quiere.length > 0);
});

test('rechaza respuestas incompletas con error tipado', () => {
  const parcial = { 1: { mas: 'D', menos: 'I' } };
  assert.throws(() => scoreCleaver(parcial), (e) => e.code === 'RESPUESTAS_INCOMPLETAS');
});

test('rechaza MÁS y MENOS iguales o factores inválidos', () => {
  const iguales = respuestasDesde(() => ({ mas: 'D', menos: 'D' }));
  assert.throws(() => scoreCleaver(iguales), (e) => e.code === 'RESPUESTAS_INVALIDAS');

  const invalido = respuestasDesde(() => ({ mas: 'X', menos: 'I' }));
  assert.throws(() => scoreCleaver(invalido), (e) => e.code === 'RESPUESTAS_INVALIDAS');
});
