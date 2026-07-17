'use strict';

const express = require('express');
const crypto = require('node:crypto');
const db = require('../db');
const { PREGUNTAS, TOTAL_PREGUNTAS, opcionesValidas, scoreIPV } = require('../ipv/scoring');

const router = express.Router();

const NUMEROS_VALIDOS = new Set(PREGUNTAS.map((p) => p.n));

// Versión pública de las preguntas: SIN la clave de corrección. El evaluado
// jamás debe recibir qué opción puntúa.
const PREGUNTAS_PUBLICAS = PREGUNTAS.map((p) => ({
  n: p.n,
  texto: p.texto,
  opciones: p.opciones,
}));

function generarFolio() {
  return 'IPV' + crypto.randomBytes(4).toString('hex').toUpperCase();
}

function generarToken() {
  return crypto.randomBytes(24).toString('hex');
}

function obtenerSesion(folio) {
  return db.prepare('SELECT * FROM ipv_sesiones WHERE folio = ?').get(folio);
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
  while (obtenerSesion(folio)) folio = generarFolio();
  const token = generarToken();

  db.prepare(
    `INSERT INTO ipv_sesiones (folio, token_sesion, nombre, cargo, fecha, estado)
     VALUES (?, ?, ?, ?, ?, 'en_progreso')`
  ).run(folio, token, (nombre || '').trim(), (cargo || '').trim(), (fecha || '').trim());

  res.status(201).json({ folio, token, total: TOTAL_PREGUNTAS, preguntas: PREGUNTAS_PUBLICAS });
});

// Recupera el estado de una sesión propia para reanudarla.
router.get('/:folio', (req, res) => {
  const token = req.query.token;
  const sesion = obtenerSesion(req.params.folio);
  if (!sesion || !token || sesion.token_sesion !== token) {
    return res.status(403).json({ error: 'Sesión o token inválido.' });
  }
  const filas = db
    .prepare('SELECT pregunta, opcion FROM ipv_respuestas WHERE folio = ?')
    .all(sesion.folio);
  const respuestas = {};
  filas.forEach((f) => {
    if (f.opcion) respuestas[f.pregunta] = f.opcion;
  });
  res.json({
    folio: sesion.folio,
    nombre: sesion.nombre,
    cargo: sesion.cargo,
    fecha: sesion.fecha,
    estado: sesion.estado,
    respuestas,
    total: TOTAL_PREGUNTAS,
    preguntas: PREGUNTAS_PUBLICAS,
  });
});

// Guarda (autosave) la respuesta de una pregunta.
router.put('/:folio/respuestas/:n', (req, res) => {
  const sesion = sesionPorTokenValido(req, res);
  if (!sesion) return;
  if (sesion.estado !== 'en_progreso') {
    return res.status(409).json({ error: 'Esta sesión ya fue completada.' });
  }

  const n = Number(req.params.n);
  if (!NUMEROS_VALIDOS.has(n)) {
    return res.status(400).json({ error: 'Pregunta inválida.' });
  }
  const { opcion = null } = req.body || {};
  if (opcion !== null && !opcionesValidas(n).includes(opcion)) {
    return res.status(400).json({ error: 'Opción inválida para esta pregunta.' });
  }

  db.prepare(
    `INSERT INTO ipv_respuestas (folio, pregunta, opcion, actualizado_en)
     VALUES (?, ?, ?, datetime('now'))
     ON CONFLICT(folio, pregunta) DO UPDATE SET opcion = excluded.opcion, actualizado_en = excluded.actualizado_en`
  ).run(sesion.folio, n, opcion);

  res.json({ ok: true });
});

// Finaliza la sesión: califica y guarda el resultado. El evaluado nunca
// recibe puntuaciones ni interpretación, solo la confirmación con su folio.
router.post('/:folio/finalizar', (req, res) => {
  const sesion = sesionPorTokenValido(req, res);
  if (!sesion) return;
  if (sesion.estado !== 'en_progreso') {
    return res.status(200).json({ folio: sesion.folio });
  }

  const { nombre, cargo, fecha } = req.body || {};

  const filas = db
    .prepare('SELECT pregunta, opcion FROM ipv_respuestas WHERE folio = ?')
    .all(sesion.folio);
  const respuestas = {};
  filas.forEach((f) => {
    if (f.opcion) respuestas[f.pregunta] = f.opcion;
  });

  let record;
  try {
    record = scoreIPV(respuestas);
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
      `UPDATE ipv_sesiones SET estado = 'completada', nombre = ?, cargo = ?, fecha = ?, completado_en = datetime('now') WHERE folio = ?`
    ).run(datosCompletos.nombre, datosCompletos.cargo, datosCompletos.fecha, sesion.folio);
    db.prepare(
      `INSERT INTO ipv_resultados (folio, datos_json) VALUES (?, ?)
       ON CONFLICT(folio) DO UPDATE SET datos_json = excluded.datos_json`
    ).run(sesion.folio, JSON.stringify(datosCompletos));
  });
  tx();

  res.json({ folio: sesion.folio });
});

module.exports = router;
