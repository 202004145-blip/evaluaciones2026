'use strict';

const express = require('express');
const db = require('../db');
const { requireAuth } = require('../auth');
const { buildReportView } = require('../export/reportView');

const router = express.Router();

router.use(requireAuth);

function listarResumen() {
  const filas = db
    .prepare(
      `SELECT s.folio, s.nombre, s.cargo, s.fecha, s.estado, s.creado_en, s.completado_en, r.datos_json
       FROM sesiones s LEFT JOIN resultados r ON r.folio = s.folio
       ORDER BY s.creado_en DESC`
    )
    .all();
  return filas.map((f) => {
    let patronPredominante = null;
    if (f.datos_json) {
      const datos = JSON.parse(f.datos_json);
      patronPredominante = datos.patterns?.III ?? null;
    }
    return {
      folio: f.folio,
      nombre: f.nombre,
      cargo: f.cargo,
      fecha: f.fecha,
      estado: f.estado,
      creado_en: f.creado_en,
      completado_en: f.completado_en,
      patron_predominante: patronPredominante,
    };
  });
}

router.get('/', (req, res) => {
  res.json(listarResumen());
});

function cargarResultado(folio) {
  const fila = db.prepare('SELECT datos_json FROM resultados WHERE folio = ?').get(folio);
  if (!fila) return null;
  return JSON.parse(fila.datos_json);
}

router.get('/:folio', (req, res) => {
  const datos = cargarResultado(req.params.folio);
  if (!datos) return res.status(404).json({ error: 'Resultado no encontrado.' });
  res.json(buildReportView(datos));
});

router.delete('/:folio', (req, res) => {
  const folio = req.params.folio;
  const sesion = db.prepare('SELECT folio FROM sesiones WHERE folio = ?').get(folio);
  if (!sesion) return res.status(404).json({ error: 'Resultado no encontrado.' });
  db.prepare('DELETE FROM sesiones WHERE folio = ?').run(folio); // cascada: respuestas y resultados
  res.json({ ok: true });
});

module.exports = router;
