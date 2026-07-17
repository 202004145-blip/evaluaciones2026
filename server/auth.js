'use strict';

const bcrypt = require('bcryptjs');
const db = require('./db');

function verificarCredenciales(usuario, password) {
  const fila = db.prepare('SELECT id, usuario, password_hash FROM evaluadores WHERE usuario = ?').get(usuario);
  if (!fila) return null;
  const ok = bcrypt.compareSync(password || '', fila.password_hash);
  if (!ok) return null;
  return { id: fila.id, usuario: fila.usuario };
}

function hayEvaluadoresRegistrados() {
  const fila = db.prepare('SELECT COUNT(*) AS n FROM evaluadores').get();
  return fila.n > 0;
}

function requireAuth(req, res, next) {
  if (req.session && req.session.evaluador) {
    return next();
  }
  return res.status(401).json({ error: 'No autenticado.' });
}

module.exports = { verificarCredenciales, hayEvaluadoresRegistrados, requireAuth };
