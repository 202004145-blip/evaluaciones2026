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

/**
 * Crea o actualiza el evaluador a partir de las variables de entorno
 * ADMIN_USER y ADMIN_PASSWORD. Pensado para plataformas como Railway, donde no
 * hay una terminal interactiva para correr `npm run set-admin-password`. Si las
 * variables están definidas, la contraseña del env es la fuente de verdad en
 * cada arranque (así se puede rotar cambiando el valor y redeploy). Si no están
 * definidas, no hace nada. Devuelve true si tocó la tabla.
 */
function bootstrapAdminFromEnv() {
  const usuario = (process.env.ADMIN_USER || '').trim();
  const password = process.env.ADMIN_PASSWORD || '';
  if (!usuario || !password) return false;
  if (password.length < 8) {
    console.warn('ADMIN_PASSWORD tiene menos de 8 caracteres; se recomienda una más larga.');
  }
  const hash = bcrypt.hashSync(password, 12);
  db.prepare(
    `INSERT INTO evaluadores (usuario, password_hash) VALUES (?, ?)
     ON CONFLICT(usuario) DO UPDATE SET password_hash = excluded.password_hash`
  ).run(usuario, hash);
  console.log(`Evaluador "${usuario}" configurado desde variables de entorno.`);
  return true;
}

function requireAuth(req, res, next) {
  if (req.session && req.session.evaluador) {
    return next();
  }
  return res.status(401).json({ error: 'No autenticado.' });
}

module.exports = {
  verificarCredenciales,
  hayEvaluadoresRegistrados,
  bootstrapAdminFromEnv,
  requireAuth,
};
