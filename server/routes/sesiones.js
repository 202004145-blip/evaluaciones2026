'use strict';

const express = require('express');
const crypto = require('node:crypto');
const db = require('../db');
const { ITEMS, ESCALAS, scoreAnswers } = require('../scoring/scoring');

const router = express.Router();

const ITEM_IDS = new Set(ITEMS.map((i) => i.id));

function generarFolio() {
  return 'F' + crypto.randomBytes(4).toString('hex').toUpperCase();
}

function generarToken() {
  return crypto.randomBytes(24).toString('hex');
}

function obtenerSesion(folio) {
  return db.prepare('SELECT * FROM sesiones WHERE folio = ?').get(folio);
}

function sesionPorTokenValido(req, res) {
  const folio = req.params.folio;
  const token = req.body?.token || req.query?.token;
  const sesion = obtenerSesion(folio);
  if (!sesion || !token || sesion.token_sesion !== token) {
    res.status(403).json({ error: 'Sesión o token inválido.' });
    return null;
  }
  return sesion;
}

// Crea una nueva sesión de evaluado.
router.post('/', (req, res) => {
  const { nombre, cargo, fecha } = req.body || {};
  let folio = generarFolio();
  // Evitar colisiones improbables del folio aleatorio.
  while (obtenerSesion(folio)) folio = generarFolio();
  const token = generarToken();

  db.prepare(
    `INSERT INTO sesiones (folio, token_sesion, nombre, cargo, fecha, estado)
     VALUES (?, ?, ?, ?, ?, 'en_progreso')`
  ).run(folio, token, (nombre || '').trim(), (cargo || '').trim(), (fecha || '').trim());

  res.status(201).json({ folio, token, items: ITEMS });
});

// Recupera el estado de una sesión propia para reanudarla.
router.get('/:folio', (req, res) => {
  const token = req.query.token;
  const sesion = obtenerSesion(req.params.folio);
  if (!sesion || !token || sesion.token_sesion !== token) {
    return res.status(403).json({ error: 'Sesión o token inválido.' });
  }
  const filas = db
    .prepare('SELECT item_id, mas, menos FROM respuestas WHERE folio = ?')
    .all(sesion.folio);
  const respuestas = {};
  filas.forEach((f) => {
    respuestas[f.item_id] = { mas: f.mas, menos: f.menos };
  });
  res.json({
    folio: sesion.folio,
    nombre: sesion.nombre,
    cargo: sesion.cargo,
    fecha: sesion.fecha,
    estado: sesion.estado,
    respuestas,
    items: ITEMS,
  });
});

// Guarda (autosave) la respuesta de un ítem: MÁS y/o MENOS.
router.put('/:folio/respuestas/:itemId', (req, res) => {
  const sesion = sesionPorTokenValido(req, res);
  if (!sesion) return;
  if (sesion.estado !== 'en_progreso') {
    return res.status(409).json({ error: 'Esta sesión ya fue completada.' });
  }

  const itemId = Number(req.params.itemId);
  if (!ITEM_IDS.has(itemId)) {
    return res.status(400).json({ error: 'Ítem inválido.' });
  }
  const { mas = null, menos = null } = req.body || {};
  if (mas !== null && !ESCALAS.includes(mas)) {
    return res.status(400).json({ error: 'Valor de "mas" inválido.' });
  }
  if (menos !== null && !ESCALAS.includes(menos)) {
    return res.status(400).json({ error: 'Valor de "menos" inválido.' });
  }
  if (mas !== null && menos !== null && mas === menos) {
    return res.status(400).json({ error: 'MÁS y MENOS no pueden ser la misma escala.' });
  }

  db.prepare(
    `INSERT INTO respuestas (folio, item_id, mas, menos, actualizado_en)
     VALUES (?, ?, ?, ?, datetime('now'))
     ON CONFLICT(folio, item_id) DO UPDATE SET mas = excluded.mas, menos = excluded.menos, actualizado_en = excluded.actualizado_en`
  ).run(sesion.folio, itemId, mas, menos);

  res.json({ ok: true });
});

// Finaliza la sesión: califica y guarda el resultado. El evaluado nunca
// recibe el resultado calificado, solo la confirmación con su folio.
router.post('/:folio/finalizar', (req, res) => {
  const sesion = sesionPorTokenValido(req, res);
  if (!sesion) return;
  if (sesion.estado !== 'en_progreso') {
    return res.status(200).json({ folio: sesion.folio });
  }

  const { nombre, cargo, fecha } = req.body || {};

  const filas = db
    .prepare('SELECT item_id, mas, menos FROM respuestas WHERE folio = ?')
    .all(sesion.folio);
  const answers = {};
  filas.forEach((f) => {
    answers[f.item_id] = { mas: f.mas, menos: f.menos };
  });

  let record;
  try {
    record = scoreAnswers(answers);
  } catch (err) {
    return res.status(400).json({ error: err.message, code: err.code });
  }

  const datosCompletos = {
    folio: sesion.folio,
    nombre: (nombre || sesion.nombre || '').trim() || 'Postulante sin nombre',
    cargo: (cargo || sesion.cargo || '').trim(),
    fecha: (fecha || sesion.fecha || '').trim(),
    completado_en: new Date().toISOString(),
    ...record,
  };

  const tx = db.transaction(() => {
    db.prepare(
      `UPDATE sesiones SET estado = 'completada', nombre = ?, cargo = ?, fecha = ?, completado_en = datetime('now') WHERE folio = ?`
    ).run(datosCompletos.nombre, datosCompletos.cargo, datosCompletos.fecha, sesion.folio);
    db.prepare(
      `INSERT INTO resultados (folio, datos_json) VALUES (?, ?)
       ON CONFLICT(folio) DO UPDATE SET datos_json = excluded.datos_json`
    ).run(sesion.folio, JSON.stringify(datosCompletos));
  });
  tx();

  res.json({ folio: sesion.folio });
});

module.exports = router;
