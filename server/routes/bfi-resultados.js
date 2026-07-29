'use strict';

const express = require('express');
const db = require('../db');
const { requireAuth } = require('../auth');
const { buildReportViewBFI } = require('../bfi/reportView');

const router = express.Router();

router.use(requireAuth);

function listarResumen() {
  const filas = db
    .prepare(
      `SELECT s.folio, s.nombre, s.cargo, s.fecha, s.estado, s.creado_en, s.completado_en, r.datos_json
       FROM bfi_sesiones s LEFT JOIN bfi_resultados r ON r.folio = s.folio
       ORDER BY s.creado_en DESC`
    )
    .all();
  return filas.map((f) => {
    let dimensiones = null;
    if (f.datos_json) {
      const datos = JSON.parse(f.datos_json);
      dimensiones = Object.fromEntries(
        Object.entries(datos.resultados || {}).map(([dim, r]) => [
          dim,
          { promedio: r.promedio, nivel: r.nivel },
        ])
      );
    }
    return {
      folio: f.folio,
      nombre: f.nombre,
      cargo: f.cargo,
      fecha: f.fecha,
      estado: f.estado,
      creado_en: f.creado_en,
      completado_en: f.completado_en,
      dimensiones,
    };
  });
}

router.get('/', (req, res) => {
  res.json(listarResumen());
});

function cargarResultado(folio) {
  const fila = db.prepare('SELECT datos_json FROM bfi_resultados WHERE folio = ?').get(folio);
  if (!fila) return null;
  return JSON.parse(fila.datos_json);
}

router.get('/:folio', (req, res) => {
  const datos = cargarResultado(req.params.folio);
  if (!datos) return res.status(404).json({ error: 'Resultado no encontrado.' });
  res.json(buildReportViewBFI(datos));
});

router.delete('/:folio', (req, res) => {
  const folio = req.params.folio;
  const sesion = db.prepare('SELECT folio FROM bfi_sesiones WHERE folio = ?').get(folio);
  if (!sesion) return res.status(404).json({ error: 'Resultado no encontrado.' });
  db.prepare('DELETE FROM bfi_sesiones WHERE folio = ?').run(folio); // cascada
  res.json({ ok: true });
});

module.exports = router;
