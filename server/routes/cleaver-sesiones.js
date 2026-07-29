'use strict';

const express = require('express');
const crypto = require('node:crypto');
const db = require('../db');
const {
  GRUPOS_PUBLICOS,
  TOTAL_GRUPOS,
  NUMEROS_VALIDOS,
  esFactor,
  scoreCleaver,
} = require('../cleaver/scoring');

const router = express.Router();

function generarFolio() {
  return 'CLV' + crypto.randomBytes(4).toString('hex').toUpperCase();
}

function generarToken() {
  return crypto.randomBytes(24).toString('hex');
}

function obtenerSesion(folio) {
  return db.prepare('SELECT * FROM cleaver_sesiones WHERE folio = ?').get(folio);
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

function leerRespuestas(folio) {
  const filas = db
    .prepare('SELECT grupo, mas, menos FROM cleaver_respuestas WHERE folio = ?')
    .all(folio);
  const respuestas = {};
  filas.forEach((f) => {
    respuestas[f.grupo] = { mas: f.mas || null, menos: f.menos || null };
  });
  return respuestas;
}

// Crea una nueva sesión de evaluado y le entrega los 24 grupos (solo palabras).
router.post('/', (req, res) => {
  const { nombre, cargo, fecha } = req.body || {};
  let folio = generarFolio();
  while (obtenerSesion(folio)) folio = generarFolio();
  const token = generarToken();

  db.prepare(
    `INSERT INTO cleaver_sesiones (folio, token_sesion, nombre, cargo, fecha, estado)
     VALUES (?, ?, ?, ?, ?, 'en_progreso')`
  ).run(folio, token, (nombre || '').trim(), (cargo || '').trim(), (fecha || '').trim());

  res.status(201).json({ folio, token, total: TOTAL_GRUPOS, grupos: GRUPOS_PUBLICOS });
});

// Recupera el estado de una sesión propia para reanudarla (folio + token).
router.get('/:folio', (req, res) => {
  const token = req.query.token;
  const sesion = obtenerSesion(req.params.folio);
  if (!sesion || !token || sesion.token_sesion !== token) {
    return res.status(403).json({ error: 'Sesión o token inválido.' });
  }
  res.json({
    folio: sesion.folio,
    nombre: sesion.nombre,
    cargo: sesion.cargo,
    fecha: sesion.fecha,
    estado: sesion.estado,
    respuestas: leerRespuestas(sesion.folio),
    total: TOTAL_GRUPOS,
    grupos: GRUPOS_PUBLICOS,
  });
});

// Guarda (autosave) la marca MÁS/MENOS de un grupo.
router.put('/:folio/respuestas/:grupo', (req, res) => {
  const sesion = sesionPorTokenValido(req, res);
  if (!sesion) return;
  if (sesion.estado !== 'en_progreso') {
    return res.status(409).json({ error: 'Esta sesión ya fue completada.' });
  }

  const grupo = Number(req.params.grupo);
  if (!NUMEROS_VALIDOS.has(grupo)) {
    return res.status(400).json({ error: 'Grupo inválido.' });
  }
  let { mas = null, menos = null } = req.body || {};
  if (mas !== null && !esFactor(mas)) return res.status(400).json({ error: 'Factor MÁS inválido.' });
  if (menos !== null && !esFactor(menos)) return res.status(400).json({ error: 'Factor MENOS inválido.' });
  if (mas !== null && menos !== null && mas === menos) {
    return res.status(400).json({ error: 'MÁS y MENOS no pueden ser el mismo factor.' });
  }

  db.prepare(
    `INSERT INTO cleaver_respuestas (folio, grupo, mas, menos, actualizado_en)
     VALUES (?, ?, ?, ?, datetime('now'))
     ON CONFLICT(folio, grupo) DO UPDATE SET mas = excluded.mas, menos = excluded.menos, actualizado_en = excluded.actualizado_en`
  ).run(sesion.folio, grupo, mas, menos);

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

  const { nombre, cargo, fecha } = req.body || {};
  const respuestas = leerRespuestas(sesion.folio);

  let record;
  try {
    record = scoreCleaver(respuestas);
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
      `UPDATE cleaver_sesiones SET estado = 'completada', nombre = ?, cargo = ?, fecha = ?, completado_en = datetime('now') WHERE folio = ?`
    ).run(datosCompletos.nombre, datosCompletos.cargo, datosCompletos.fecha, sesion.folio);
    db.prepare(
      `INSERT INTO cleaver_resultados (folio, datos_json) VALUES (?, ?)
       ON CONFLICT(folio) DO UPDATE SET datos_json = excluded.datos_json`
    ).run(sesion.folio, JSON.stringify(datosCompletos));
  });
  tx();

  res.json({ folio: sesion.folio });
});

module.exports = router;
