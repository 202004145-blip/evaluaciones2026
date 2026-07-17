'use strict';

const express = require('express');
const { verificarCredenciales } = require('../auth');

const router = express.Router();

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
