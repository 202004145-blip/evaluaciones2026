'use strict';

const express = require('express');
const crypto = require('node:crypto');
const db = require('../db');
const { PREGUNTAS, TOTAL_PREGUNTAS, ESCALA, valoresValidos, scoreBFI } = require('../bfi/scoring');

const router = express.Router();

const IDS_VALIDOS = new Set(PREGUNTAS.map((p) => p.id));
const VALORES_VALIDOS = new Set(valoresValidos());

// Versión pública de los ítems: solo id y texto. El evaluado no necesita (ni
// debe inferir) la dimensión, la inversión ni nada del proceso de corrección.
const PREGUNTAS_PUBLICAS = PREGUNTAS.map((p) => ({ id: p.id, texto: p.texto }));
const META_PUBLICA = { total: TOTAL_PREGUNTAS, escala: ESCALA, preguntas: PREGUNTAS_PUBLICAS };

function generarFolio() {
  return 'BFI' + crypto.randomBytes(4).toString('hex').toUpperCase();
}

function generarToken() {
  return crypto.randomBytes(24).toString('hex');
}

function obtenerSesion(folio) {
  return db.prepare('SELECT * FROM bfi_sesiones WHERE folio = ?').get(folio);
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
  const { nombre, cargo, fecha, ci } = req.body || {};
  let folio = generarFolio();
  while (obtenerSesion(folio)) folio = generarFolio();
  const token = generarToken();

  db.prepare(
    `INSERT INTO bfi_sesiones (folio, token_sesion, nombre, cargo, fecha, ci, estado)
     VALUES (?, ?, ?, ?, ?, ?, 'en_progreso')`
  ).run(
    folio,
    token,
    (nombre || '').trim(),
    (cargo || '').trim(),
    (fecha || '').trim(),
    (ci || '').trim()
  );

  res.status(201).json({ folio, token, ...META_PUBLICA });
});

// Recupera el estado de una sesión propia para reanudarla.
router.get('/:folio', (req, res) => {
  const token = req.query.token;
  const sesion = obtenerSesion(req.params.folio);
  if (!sesion || !token || sesion.token_sesion !== token) {
    return res.status(403).json({ error: 'Sesión o token inválido.' });
  }
  const filas = db
    .prepare('SELECT item_id, valor FROM bfi_respuestas WHERE folio = ?')
    .all(sesion.folio);
  const respuestas = {};
  filas.forEach((f) => {
    if (f.valor != null) respuestas[f.item_id] = f.valor;
  });
  res.json({
    folio: sesion.folio,
    nombre: sesion.nombre,
    cargo: sesion.cargo,
    fecha: sesion.fecha,
    ci: sesion.ci,
    estado: sesion.estado,
    respuestas,
    ...META_PUBLICA,
  });
});

// Guarda (autosave) la respuesta de un ítem.
router.put('/:folio/respuestas/:id', (req, res) => {
  const sesion = sesionPorTokenValido(req, res);
  if (!sesion) return;
  if (sesion.estado !== 'en_progreso') {
    return res.status(409).json({ error: 'Esta sesión ya fue completada.' });
  }

  const id = Number(req.params.id);
  if (!IDS_VALIDOS.has(id)) {
    return res.status(400).json({ error: 'Ítem inválido.' });
  }
  let { valor = null } = req.body || {};
  if (valor !== null) {
    valor = Number(valor);
    if (!VALORES_VALIDOS.has(valor)) {
      return res.status(400).json({ error: 'Valor inválido para este ítem.' });
    }
  }

  db.prepare(
    `INSERT INTO bfi_respuestas (folio, item_id, valor, actualizado_en)
     VALUES (?, ?, ?, datetime('now'))
     ON CONFLICT(folio, item_id) DO UPDATE SET valor = excluded.valor, actualizado_en = excluded.actualizado_en`
  ).run(sesion.folio, id, valor);

  res.json({ ok: true });
});

// Finaliza la sesión: califica y guarda el resultado. El evaluado nunca recibe
// puntuaciones ni interpretación, solo la confirmación con su folio.
router.post('/:folio/finalizar', (req, res) => {
  const sesion = sesionPorTokenValido(req, res);
  if (!sesion) return;
  if (sesion.estado !== 'en_progreso') {
    return res.status(200).json({ folio: sesion.folio });
  }

  const { nombre, cargo, fecha, ci } = req.body || {};

  const filas = db
    .prepare('SELECT item_id, valor FROM bfi_respuestas WHERE folio = ?')
    .all(sesion.folio);
  const respuestas = {};
  filas.forEach((f) => {
    if (f.valor != null) respuestas[f.item_id] = f.valor;
  });

  let record;
  try {
    record = scoreBFI(respuestas);
  } catch (err) {
    return res.status(400).json({ error: err.message, code: err.code });
  }

  const datosCompletos = {
    folio: sesion.folio,
    nombre: (nombre || sesion.nombre || '').trim() || 'Postulante sin nombre',
    cargo: (cargo || sesion.cargo || '').trim(),
    fecha: (fecha || sesion.fecha || '').trim(),
    ci: (ci || sesion.ci || '').trim(),
    completado_en: new Date().toISOString(),
    ...record,
  };

  const tx = db.transaction(() => {
    db.prepare(
      `UPDATE bfi_sesiones SET estado = 'completada', nombre = ?, cargo = ?, fecha = ?, ci = ?, completado_en = datetime('now') WHERE folio = ?`
    ).run(datosCompletos.nombre, datosCompletos.cargo, datosCompletos.fecha, datosCompletos.ci, sesion.folio);
    db.prepare(
      `INSERT INTO bfi_resultados (folio, datos_json) VALUES (?, ?)
       ON CONFLICT(folio) DO UPDATE SET datos_json = excluded.datos_json`
    ).run(sesion.folio, JSON.stringify(datosCompletos));
  });
  tx();

  res.json({ folio: sesion.folio });
});

module.exports = router;
