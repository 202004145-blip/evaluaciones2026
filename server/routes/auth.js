'use strict';

const express = require('express');
const bcrypt = require('bcryptjs');
const { verificarCredenciales, hayEvaluadoresRegistrados } = require('../auth');
const db = require('../db');

const router = express.Router();

// Endpoint para crear el admin inicial (sin autenticación, solo funciona si no hay evaluadores)
router.post('/admin/setup', (req, res) => {
  if (hayEvaluadoresRegistrados()) {
    return res.status(400).json({ error: 'Ya existe un evaluador registrado. El setup ya fue completado.' });
  }

  const { usuario, password, passwordConfirm } = req.body || {};
  
  if (!usuario || !password) {
    return res.status(400).json({ error: 'Usuario y contraseña son obligatorios.' });
  }

  if (password !== passwordConfirm) {
    return res.status(400).json({ error: 'Las contraseñas no coinciden.' });
  }

  if (password.length < 8) {
    return res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres.' });
  }

  const hash = bcrypt.hashSync(password, 12);
  db.prepare(
    `INSERT INTO evaluadores (usuario, password_hash) VALUES (?, ?)`
  ).run(usuario, hash);

  res.json({ ok: true, mensaje: `Admin "${usuario}" creado exitosamente.` });
});

router.post('/login', (req, res) => {
  const { usuario, password } = req.body || {};
  if (!usuario || !password) {
    return res.status(400).json({ error: 'Usuario y contraseña son obligatorios.' });
  }
  const evaluador = verificarCredenciales(usuario, password);
  if (!evaluador) {
    return res.status(401).json({ error: 'Usuario o contraseña incorrectos.' });
  }
  req.session.regenerate((err) => {
    if (err) return res.status(500).json({ error: 'No se pudo iniciar sesión.' });
    req.session.evaluador = evaluador;
    res.json({ evaluador });
  });
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('connect.sid');
    res.json({ ok: true });
  });
});

router.get('/me', (req, res) => {
  if (req.session && req.session.evaluador) {
    return res.json({ evaluador: req.session.evaluador });
  }
  res.status(401).json({ error: 'No autenticado.' });
});

module.exports = router;