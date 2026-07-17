'use strict';

const path = require('node:path');
const Database = require('better-sqlite3');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'data.sqlite');

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS evaluadores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    usuario TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    creado_en TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS sesiones (
    folio TEXT PRIMARY KEY,
    token_sesion TEXT NOT NULL UNIQUE,
    nombre TEXT NOT NULL DEFAULT '',
    cargo TEXT NOT NULL DEFAULT '',
    fecha TEXT NOT NULL DEFAULT '',
    estado TEXT NOT NULL DEFAULT 'en_progreso',
    creado_en TEXT NOT NULL DEFAULT (datetime('now')),
    completado_en TEXT
  );

  CREATE TABLE IF NOT EXISTS respuestas (
    folio TEXT NOT NULL REFERENCES sesiones(folio) ON DELETE CASCADE,
    item_id INTEGER NOT NULL,
    mas TEXT,
    menos TEXT,
    actualizado_en TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (folio, item_id)
  );

  CREATE TABLE IF NOT EXISTS resultados (
    folio TEXT PRIMARY KEY REFERENCES sesiones(folio) ON DELETE CASCADE,
    datos_json TEXT NOT NULL,
    creado_en TEXT NOT NULL DEFAULT (datetime('now'))
  );

  -- ===== IPV (Inventario de Personalidad para Vendedores) =====
  -- Instrumento independiente del DISC: 87 preguntas de elección única.
  -- Comparte el mismo login de evaluador, pero con tablas propias.
  CREATE TABLE IF NOT EXISTS ipv_sesiones (
    folio TEXT PRIMARY KEY,
    token_sesion TEXT NOT NULL UNIQUE,
    nombre TEXT NOT NULL DEFAULT '',
    cargo TEXT NOT NULL DEFAULT '',
    fecha TEXT NOT NULL DEFAULT '',
    estado TEXT NOT NULL DEFAULT 'en_progreso',
    creado_en TEXT NOT NULL DEFAULT (datetime('now')),
    completado_en TEXT
  );

  CREATE TABLE IF NOT EXISTS ipv_respuestas (
    folio TEXT NOT NULL REFERENCES ipv_sesiones(folio) ON DELETE CASCADE,
    pregunta INTEGER NOT NULL,
    opcion TEXT,
    actualizado_en TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (folio, pregunta)
  );

  CREATE TABLE IF NOT EXISTS ipv_resultados (
    folio TEXT PRIMARY KEY REFERENCES ipv_sesiones(folio) ON DELETE CASCADE,
    datos_json TEXT NOT NULL,
    creado_en TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

module.exports = db;
