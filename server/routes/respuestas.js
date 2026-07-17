'use strict';

const express = require('express');
const db = require('../db');
const { verificarSesion } = require('../auth');

const router = express.Router();

// Guardar respuestas de un formulario (requiere autenticación)
router.post('/', verificarSesion, (req, res) => {
  const { evaluador } = req.session;
  const { formulario, respuestas } = req.body;

  if (!formulario || !respuestas) {
    return res.status(400).json({ error: 'Faltan datos: formulario y respuestas son obligatorios.' });
  }

  try {
    const stmt = db.prepare(`
      INSERT INTO respuestas (evaluador_id, formulario, respuestas)
      VALUES (?, ?, ?)
    `);
    const info = stmt.run(evaluador.id, formulario, JSON.stringify(respuestas));
    res.json({ ok: true, id: info.lastInsertRowid, mensaje: 'Respuestas guardadas correctamente.' });
  } catch (err) {
    console.error('Error guardando respuestas:', err);
    res.status(500).json({ error: 'Error interno al guardar respuestas.' });
  }
});

// Obtener respuestas de un evaluador
router.get('/mis-respuestas', verificarSesion, (req, res) => {
  const { evaluador } = req.session;
  const rows = db.prepare(`
    SELECT * FROM respuestas WHERE evaluador_id = ? ORDER BY fecha DESC
  `).all(evaluador.id);
  res.json({ respuestas: rows });
});

module.exports = router;