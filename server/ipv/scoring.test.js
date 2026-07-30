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

test('cada ítem del mapeo y cada ítem DGV existen en el cuestionario', () => {
  const validos = new Set(PREGUNTAS.map((p) => p.n));
  Object.values(BAREMOS.mapeo).forEach((items) =>
    items.forEach((n) => assert.ok(validos.has(n), `Ítem inexistente en el mapeo: ${n}`))
  );
  BAREMOS.dgv_items.forEach((item) =>
    assert.ok(validos.has(item.q), `Ítem DGV inexistente: ${item.q}`)
  );
});

test('cada pregunta pertenece a exactamente una escala específica', () => {
  const enEscala = new Set();
  Object.values(BAREMOS.mapeo).forEach((items) => items.forEach((n) => enEscala.add(n)));
  assert.equal(enEscala.size, 87);
});

test('las 9 escalas específicas suman exactamente 87 ítems', () => {
  const total = Object.values(BAREMOS.mapeo).reduce((a, xs) => a + xs.length, 0);
  assert.equal(total, 87);
});

test('respuestas correctas al 100%: PD de I..IX iguala su nº de ítems (excepto VIII que es inversa → 0)', () => {
  const { pd } = scoreIPV(respuestasClave());
  Object.entries(BAREMOS.mapeo).forEach(([escala, items]) => {
    const esperado = BAREMOS.escala_reversa && BAREMOS.escala_reversa[escala] ? 0 : items.length;
    assert.equal(pd[escala], esperado, `PD de ${escala} con todo correcto`);
  });
  // Compuestas = suma de sus partes.
  assert.equal(pd.R, pd.I + pd.II + pd.III + pd.IV);
  assert.equal(pd.A, pd.V + pd.VI + pd.VII + pd.VIII);
});

test('todas incorrectas: PD 0 en todas las escalas específicas (excepto VIII que es inversa → maxItems)', () => {
  const { pd } = scoreIPV(respuestasErroneas());
  Object.entries(BAREMOS.mapeo).forEach(([escala, items]) => {
    const esperado = BAREMOS.escala_reversa && BAREMOS.escala_reversa[escala] ? items.length : 0;
    assert.equal(pd[escala], esperado, `PD de ${escala} con todo incorrecto`);
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
  r[78] = 'C';
  const p78 = PREGUNTAS.find((p) => p.n === 78);
  if (!opcionesValidas(78).includes('C')) {
    assert.throws(() => scoreIPV(r), (e) => e.code === 'RESPUESTAS_INVALIDAS');
  } else {
    // Si la pregunta 78 sí admite C en esta versión, tomamos otra que no.
    const alt = PREGUNTAS.find((p) => Object.keys(p.opciones).length < 3);
    if (alt) {
      const r2 = respuestasClave();
      r2[alt.n] = 'Z';
      assert.throws(() => scoreIPV(r2), (e) => e.code === 'RESPUESTAS_INVALIDAS');
    }
  }
});

test('decatipoDe respeta los rangos [min, max] y salta casillas inalcanzables', () => {
  // DGV: 1:[0,5] 2:[6,6] 3:[7,8] 4:[9,9] 5:[10,10] ... 10:[16,21]
  assert.equal(decatipoDe('DGV', 0), 1);
  assert.equal(decatipoDe('DGV', 5), 1);
  assert.equal(decatipoDe('DGV', 6), 2);
  assert.equal(decatipoDe('DGV', 7), 3);
  assert.equal(decatipoDe('DGV', 8), 3);
  assert.equal(decatipoDe('DGV', 21), 10);
  assert.equal(decatipoDe('DGV', 999), 10); // sobre el máximo
  // I tiene un tramo inalcanzable (dec 5 = [*,*]): PD 5 debe caer en dec 6.
  // I: 1:[0,1] 2:[2,2] 3:[3,3] 4:[4,4] 5:[*,*] 6:[5,5] 7:[6,6] ...
  assert.equal(decatipoDe('I', 5), 6);
});

test('nivelDecatipo devuelve los 5 niveles con etiquetas oficiales', () => {
  assert.deepEqual(nivelDecatipo(1), { codigo: 1, label: 'Muy Bajo' });
  assert.deepEqual(nivelDecatipo(2), { codigo: 1, label: 'Muy Bajo' });
  assert.deepEqual(nivelDecatipo(3), { codigo: 2, label: 'Bajo' });
  assert.deepEqual(nivelDecatipo(4), { codigo: 2, label: 'Bajo' });
  assert.deepEqual(nivelDecatipo(5), { codigo: 3, label: 'Promedio' });
  assert.deepEqual(nivelDecatipo(6), { codigo: 3, label: 'Promedio' });
  assert.deepEqual(nivelDecatipo(7), { codigo: 4, label: 'Mayor Promedio' });
  assert.deepEqual(nivelDecatipo(8), { codigo: 4, label: 'Mayor Promedio' });
  assert.deepEqual(nivelDecatipo(9), { codigo: 5, label: 'Alto' });
  assert.deepEqual(nivelDecatipo(10), { codigo: 5, label: 'Alto' });
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

// ===== Prueba oro: reproduce el ejemplo del Excel oficial =====
// Respuestas y PDs esperados extraídos directamente del `the_IPV_test.xls`.
test('reproduce exactamente el ejemplo oficial del Excel', () => {
  const respuestas = {
    1:"A",2:"B",3:"B",4:"B",5:"A",6:"B",7:"B",8:"C",9:"A",10:"B",
    11:"B",12:"B",13:"A",14:"B",15:"A",16:"C",17:"B",18:"C",19:"A",20:"B",
    21:"C",22:"A",23:"C",24:"A",25:"B",26:"C",27:"A",28:"B",29:"B",30:"B",
    31:"B",32:"B",33:"B",34:"B",35:"A",36:"C",37:"B",38:"B",39:"A",40:"C",
    41:"B",42:"A",43:"B",44:"B",45:"A",46:"B",47:"C",48:"C",49:"A",50:"C",
    51:"C",52:"A",53:"B",54:"C",55:"C",56:"A",57:"C",58:"A",59:"C",60:"C",
    61:"B",62:"C",63:"B",64:"C",65:"A",66:"C",67:"A",68:"A",69:"C",70:"B",
    71:"A",72:"B",73:"C",74:"C",75:"B",76:"A",77:"A",78:"B",79:"A",80:"B",
    81:"B",82:"A",83:"B",84:"B",85:"A",86:"A",87:"B"
  };
  const { pd, decatipos, nivelesLabels } = scoreIPV(respuestas);
  // PDs exactos del Excel (hoja "resultados").
  const pdEsperado = { I: 4, II: 4, III: 4, IV: 1, V: 6, VI: 4, VII: 3, VIII: 5, IX: 6, DGV: 13 };
  Object.entries(pdEsperado).forEach(([e, v]) => assert.equal(pd[e], v, `PD ${e}`));
  assert.equal(pd.R, 13, 'PD R (I+II+III+IV)');
  assert.equal(pd.A, 18, 'PD A (V+VI+VII+VIII)');
  // Decatipos exactos del Excel.
  const decEsperado = { DGV: 8, R: 1, A: 8, I: 4, II: 4, III: 4, IV: 1, V: 7, VI: 6, VII: 5, VIII: 10, IX: 7 };
  Object.entries(decEsperado).forEach(([e, v]) =>
    assert.equal(decatipos[e], v, `decatipo ${e} (pd=${pd[e]})`)
  );
  // Etiquetas de nivel oficiales.
  assert.equal(nivelesLabels.DGV, 'Mayor Promedio'); // dec 8
  assert.equal(nivelesLabels.IX, 'Mayor Promedio');  // dec 7
  assert.equal(nivelesLabels.VIII, 'Alto');          // dec 10
  assert.equal(nivelesLabels.IV, 'Muy Bajo');        // dec 1
});
