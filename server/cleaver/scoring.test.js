'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const {
  FACTORES,
  GRUPOS,
  BLOQUES,
  TOTAL_GRUPOS,
  PERCENTILES,
  percentilDe,
  scoreCleaver,
} = require('./scoring');

function respuestasDesde(fn) {
  const r = {};
  GRUPOS.forEach((gr) => (r[gr.g] = fn(gr)));
  return r;
}

test('hay 24 grupos y los 4 factores D/I/S/C', () => {
  assert.strictEqual(TOTAL_GRUPOS, 24);
  assert.deepStrictEqual(FACTORES, ['D', 'I', 'S', 'C']);
  GRUPOS.forEach((gr) => {
    assert.deepStrictEqual(Object.keys(gr.palabras).sort(), ['C', 'D', 'I', 'S']);
  });
});

test('los grupos están numerados 1..24 en orden natural (lectura izquierda→derecha, arriba→abajo)', () => {
  const nums = GRUPOS.map((g) => g.g);
  for (let i = 0; i < 24; i++) assert.strictEqual(nums[i], i + 1, `grupo ${i + 1}`);
  // Los BLOQUES agrupan los grupos consecutivos de 4 en 4.
  assert.strictEqual(BLOQUES.length, 6);
  for (let b = 0; b < 6; b++) {
    const esperados = [b * 4 + 1, b * 4 + 2, b * 4 + 3, b * 4 + 4];
    assert.deepStrictEqual(BLOQUES[b].map((g) => g.g), esperados, `bloque ${b + 1}`);
  }
});

test('cada palabra trae su sinónimo/definición oficial del manual', () => {
  const sinDef = [];
  GRUPOS.forEach((gr) => {
    FACTORES.forEach((f) => {
      if (!gr.definiciones || !gr.definiciones[f]) sinDef.push(`g${gr.g}-${f}`);
    });
  });
  assert.deepStrictEqual(sinDef, [], `Palabras sin definición: ${sinDef.join(', ')}`);
});

test('sumas de verificación: suma de M = 24 y suma de L = 24', () => {
  const r = scoreCleaver(respuestasDesde(() => ({ mas: 'D', menos: 'I' })));
  assert.strictEqual(r.sumaM, 24);
  assert.strictEqual(r.sumaL, 24);
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
  const dMas = r.claves.find((c) => c.clave === 'D+');
  assert.ok(dMas.corto.length > 0 && dMas.texto.length > 0, 'D+ debe traer corto y texto');
});

test('empate D=C por encima de la media agrega la clave D=C+', () => {
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

test('percentiles: cada factor recibe percentil para M, L y T', () => {
  const r = scoreCleaver(respuestasDesde(() => ({ mas: 'D', menos: 'I' })));
  FACTORES.forEach((f) => {
    assert.ok(typeof r.percentiles.M[f] === 'number', `percentil M[${f}]`);
    assert.ok(typeof r.percentiles.L[f] === 'number', `percentil L[${f}]`);
    assert.ok(typeof r.percentiles.T[f] === 'number', `percentil T[${f}]`);
  });
});

test('percentilDe reproduce valores clave del baremo oficial', () => {
  // Ejemplos exactos tomados del Excel oficial (hoja "hoja de captura"):
  assert.strictEqual(percentilDe('D_M', 0), 1);
  assert.strictEqual(percentilDe('D_M', 6), 50);
  assert.strictEqual(percentilDe('D_M', 20), 99);
  assert.strictEqual(percentilDe('I_M', 6), 82);
  assert.strictEqual(percentilDe('D_L', 0), 99);
  assert.strictEqual(percentilDe('D_L', 6), 50);
  assert.strictEqual(percentilDe('D_T', 0), 50);   // T=0 (línea media) → percentil 50
  assert.strictEqual(percentilDe('D_T', 10), 90);
  assert.strictEqual(percentilDe('D_T', -10), 9);
  // Extrapolación fuera de rango: cae al extremo más cercano
  assert.strictEqual(percentilDe('D_T', 99), 99);
  assert.strictEqual(percentilDe('D_T', -99), 1);
});

test('12 tablas de percentiles cargadas (D/I/S/C × M/L/T)', () => {
  const keys = Object.keys(PERCENTILES).sort();
  assert.deepStrictEqual(keys, [
    'C_L', 'C_M', 'C_T',
    'D_L', 'D_M', 'D_T',
    'I_L', 'I_M', 'I_T',
    'S_L', 'S_M', 'S_T',
  ]);
  for (const k of keys) assert.ok(PERCENTILES[k].length > 0, `${k} no vacía`);
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

// ===== Prueba oro: reproduce el ejemplo del Excel oficial =====
// La "hoja de captura" del Excel trae un caso resuelto que da:
//   M: D=2, I=6, S=4, C=8
//   L: D=5, I=4, S=6, C=3
//   T: D=-3, I=+2, S=-2, C=+5
// Con estos conteos, los percentiles oficiales del Excel son:
//   T(D) = -3 → 35, T(I) = +2 → 70, T(S) = -2 → 40, T(C) = +5 → 96
test('los percentiles del ejemplo del Excel dan el resultado publicado', () => {
  assert.strictEqual(percentilDe('D_T', -3), 35);
  assert.strictEqual(percentilDe('I_T', 2), 70);
  assert.strictEqual(percentilDe('S_T', -2), 40);
  assert.strictEqual(percentilDe('C_T', 5), 96);
  assert.strictEqual(percentilDe('D_M', 2), 10);
  assert.strictEqual(percentilDe('I_M', 6), 82);
  assert.strictEqual(percentilDe('S_M', 4), 40);
  assert.strictEqual(percentilDe('C_M', 8), 95);
});
