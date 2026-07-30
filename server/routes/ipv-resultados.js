'use strict';

const express = require('express');
const db = require('../db');
const { requireAuth } = require('../auth');
const { buildReportViewIPV } = require('../ipv/reportView');
const { scoreIPV } = require('../ipv/scoring');

const router = express.Router();

router.use(requireAuth);

function listarResumen() {
  const filas = db
    .prepare(
      `SELECT s.folio, s.nombre, s.cargo, s.fecha, s.estado, s.creado_en, s.completado_en, r.datos_json
       FROM ipv_sesiones s LEFT JOIN ipv_resultados r ON r.folio = s.folio
       ORDER BY s.creado_en DESC`
    )
    .all();
  return filas.map((f) => {
    let dgvDecatipo = null;
    let dgvNivel = null;
    if (f.datos_json) {
      const datos = JSON.parse(f.datos_json);
      dgvDecatipo = datos.decatipos?.DGV ?? null;
      // La etiqueta cualitativa oficial (Muy Bajo/Bajo/Promedio/Mayor Promedio/Alto).
      // Compatible con resultados guardados con el formato antiguo (string).
      dgvNivel =
        datos.nivelesLabels?.DGV ??
        (typeof datos.niveles?.DGV === 'string' ? datos.niveles.DGV : null);
    }
    return {
      folio: f.folio,
      nombre: f.nombre,
      cargo: f.cargo,
      fecha: f.fecha,
      estado: f.estado,
      creado_en: f.creado_en,
      completado_en: f.completado_en,
      dgv_decatipo: dgvDecatipo,
      dgv_nivel: dgvNivel,
    };
  });
}

router.get('/', (req, res) => {
  res.json(listarResumen());
});

function cargarResultado(folio) {
  const fila = db.prepare('SELECT datos_json FROM ipv_resultados WHERE folio = ?').get(folio);
  if (!fila) return null;
  return JSON.parse(fila.datos_json);
}

router.get('/:folio', (req, res) => {
  const datos = cargarResultado(req.params.folio);
  if (!datos) return res.status(404).json({ error: 'Resultado no encontrado.' });
  res.json(buildReportViewIPV(datos));
});

router.delete('/:folio', (req, res) => {
  const folio = req.params.folio;
  const sesion = db.prepare('SELECT folio FROM ipv_sesiones WHERE folio = ?').get(folio);
  if (!sesion) return res.status(404).json({ error: 'Resultado no encontrado.' });
  db.prepare('DELETE FROM ipv_sesiones WHERE folio = ?').run(folio); // cascada
  res.json({ ok: true });
});

/**
 * Re-califica UN evaluado ya finalizado con la lógica vigente. Toma sus
 * respuestas de `ipv_respuestas` (fuente de verdad), llama a scoreIPV y
 * sobrescribe `ipv_resultados.datos_json`. Útil para evaluados que fueron
 * calificados antes del PR #12 (que corrigió la lógica contra el Excel).
 */
function recalificarFolio(folio) {
  const sesion = db.prepare('SELECT * FROM ipv_sesiones WHERE folio = ?').get(folio);
  if (!sesion) return { ok: false, error: 'Sesión no encontrada.' };
  if (sesion.estado !== 'completada') {
    return { ok: false, error: 'La sesión aún no ha sido finalizada.' };
  }
  const filas = db
    .prepare('SELECT pregunta, opcion FROM ipv_respuestas WHERE folio = ?')
    .all(folio);
  const respuestas = {};
  filas.forEach((f) => {
    if (f.opcion) respuestas[f.pregunta] = f.opcion;
  });
  let record;
  try {
    record = scoreIPV(respuestas);
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
    `INSERT INTO ipv_resultados (folio, datos_json) VALUES (?, ?)
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
    .prepare(`SELECT folio FROM ipv_sesiones WHERE estado = 'completada'`)
    .all()
    .map((f) => f.folio);
  const detalle = folios.map((folio) => ({ folio, ...recalificarFolio(folio) }));
  const ok = detalle.filter((d) => d.ok).length;
  const fallidos = detalle.filter((d) => !d.ok);
  res.json({ total: folios.length, recalificados: ok, fallidos });
});

module.exports = router;
