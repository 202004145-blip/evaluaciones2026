'use strict';

const express = require('express');
const db = require('../db');
const { requireAuth } = require('../auth');
const { scoreCleaver } = require('../cleaver/scoring');

const router = express.Router();

router.use(requireAuth);

// Lista todas las sesiones (completadas y en curso) con un resumen. El detalle
// con calificación solo existe para las completadas (cleaver_resultados).
function listarResumen() {
  const filas = db
    .prepare(
      `SELECT s.folio, s.nombre, s.cargo, s.fecha, s.estado, s.creado_en, s.completado_en, r.datos_json
       FROM cleaver_sesiones s LEFT JOIN cleaver_resultados r ON r.folio = s.folio
       ORDER BY s.creado_en DESC`
    )
    .all();
  return filas.map((f) => {
    let perfil = null;
    if (f.datos_json) {
      const datos = JSON.parse(f.datos_json);
      // Código de perfil compacto por orden de T (p. ej. "D>C>S>I").
      perfil = datos.orden ? datos.orden.join('>') : null;
    }
    return {
      folio: f.folio,
      nombre: f.nombre,
      cargo: f.cargo,
      fecha: f.fecha,
      estado: f.estado,
      creado_en: f.creado_en,
      completado_en: f.completado_en,
      perfil,
    };
  });
}

router.get('/', (req, res) => {
  res.json(listarResumen());
});

function cargarResultado(folio) {
  const fila = db.prepare('SELECT datos_json FROM cleaver_resultados WHERE folio = ?').get(folio);
  if (!fila) return null;
  return JSON.parse(fila.datos_json);
}

router.get('/:folio', (req, res) => {
  const datos = cargarResultado(req.params.folio);
  if (!datos) {
    return res.status(404).json({ error: 'Resultado no encontrado o cuestionario no finalizado.' });
  }
  res.json(datos);
});

router.delete('/:folio', (req, res) => {
  const folio = req.params.folio;
  const sesion = db.prepare('SELECT folio FROM cleaver_sesiones WHERE folio = ?').get(folio);
  if (!sesion) return res.status(404).json({ error: 'Resultado no encontrado.' });
  db.prepare('DELETE FROM cleaver_sesiones WHERE folio = ?').run(folio); // cascada
  res.json({ ok: true });
});

/**
 * Re-califica UN evaluado ya finalizado con la lógica y baremos vigentes. Usa
 * las respuestas guardadas en `cleaver_respuestas` (fuente de verdad) y
 * sobrescribe `cleaver_resultados.datos_json`. Útil tras cambios en los baremos
 * o en la lógica de calificación.
 */
function recalificarFolio(folio) {
  const sesion = db.prepare('SELECT * FROM cleaver_sesiones WHERE folio = ?').get(folio);
  if (!sesion) return { ok: false, error: 'Sesión no encontrada.' };
  if (sesion.estado !== 'completada') {
    return { ok: false, error: 'La sesión aún no ha sido finalizada.' };
  }
  const filas = db
    .prepare('SELECT grupo, mas, menos FROM cleaver_respuestas WHERE folio = ?')
    .all(folio);
  const respuestas = {};
  filas.forEach((f) => {
    respuestas[f.grupo] = { mas: f.mas || null, menos: f.menos || null };
  });
  let record;
  try {
    record = scoreCleaver(respuestas);
  } catch (err) {
    return { ok: false, error: err.message, code: err.code };
  }
  const previo = cargarResultado(folio) || {};
  const datosCompletos = {
    folio,
    nombre: sesion.nombre || previo.nombre || '',
    cargo: sesion.cargo || previo.cargo || '',
    fecha: sesion.fecha || previo.fecha || '',
    completado_en: previo.completado_en || sesion.completado_en || new Date().toISOString(),
    ...record,
    recalificado_en: new Date().toISOString(),
  };
  db.prepare(
    `INSERT INTO cleaver_resultados (folio, datos_json) VALUES (?, ?)
     ON CONFLICT(folio) DO UPDATE SET datos_json = excluded.datos_json`
  ).run(folio, JSON.stringify(datosCompletos));
  return { ok: true };
}

router.post('/:folio/recalificar', (req, res) => {
  const r = recalificarFolio(req.params.folio);
  if (!r.ok) return res.status(400).json(r);
  res.json(r);
});

router.post('/recalificar-todo', (req, res) => {
  const folios = db
    .prepare(`SELECT folio FROM cleaver_sesiones WHERE estado = 'completada'`)
    .all()
    .map((f) => f.folio);
  const detalle = folios.map((folio) => ({ folio, ...recalificarFolio(folio) }));
  const ok = detalle.filter((d) => d.ok).length;
  const fallidos = detalle.filter((d) => !d.ok);
  res.json({ total: folios.length, recalificados: ok, fallidos });
});

module.exports = router;
