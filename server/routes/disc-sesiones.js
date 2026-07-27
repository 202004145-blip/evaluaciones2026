// server/routes/disc-sesiones.js
const express = require('express');
const db = require('../db');
const { requireAuth } = require('../auth');

const router = express.Router();

// ===== GUARDAR SESIÓN DEL DISC (POST) =====
router.post('/', (req, res) => {
    const { nombre, cargo, fecha, respuestas, puntuaciones } = req.body;

    // Validar datos obligatorios
    if (!nombre) {
        return res.status(400).json({ error: 'El nombre es obligatorio.' });
    }
    if (!respuestas || typeof respuestas !== 'object') {
        return res.status(400).json({ error: 'Las respuestas son obligatorias.' });
    }

    try {
        // Crear la tabla si no existe
        db.exec(`
            CREATE TABLE IF NOT EXISTS disc_sesiones (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nombre TEXT NOT NULL,
                cargo TEXT,
                fecha TEXT,
                respuestas TEXT NOT NULL,
                puntuaciones TEXT,
                creado TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        const stmt = db.prepare(`
            INSERT INTO disc_sesiones (nombre, cargo, fecha, respuestas, puntuaciones)
            VALUES (?, ?, ?, ?, ?)
        `);

        const info = stmt.run(
            nombre,
            cargo || '',
            fecha || new Date().toISOString().split('T')[0],
            JSON.stringify(respuestas),
            JSON.stringify(puntuaciones || {})
        );

        res.json({ ok: true, id: info.lastInsertRowid, mensaje: 'Sesión guardada correctamente.' });
    } catch (err) {
        console.error('Error guardando DISC:', err);
        res.status(500).json({ error: 'Error interno al guardar la sesión.' });
    }
});

// ===== OBTENER TODAS LAS SESIONES DEL DISC (GET) =====
router.get('/', requireAuth, (req, res) => {
    try {
        const rows = db.prepare(`
            SELECT id, nombre, cargo, fecha, respuestas, puntuaciones, creado
            FROM disc_sesiones
            ORDER BY creado DESC
        `).all();

        // Parsear JSON automáticamente
        const sesiones = rows.map(row => ({
            ...row,
            respuestas: JSON.parse(row.respuestas || '{}'),
            puntuaciones: JSON.parse(row.puntuaciones || '{}')
        }));

        res.json(sesiones);
    } catch (err) {
        console.error('Error obteniendo sesiones DISC:', err);
        res.status(500).json({ error: 'Error al obtener las sesiones.' });
    }
});

// ===== OBTENER UNA SESIÓN POR ID =====
router.get('/:id', requireAuth, (req, res) => {
    const { id } = req.params;
    try {
        const row = db.prepare(`
            SELECT id, nombre, cargo, fecha, respuestas, puntuaciones, creado
            FROM disc_sesiones
            WHERE id = ?
        `).get(id);

        if (!row) {
            return res.status(404).json({ error: 'Sesión no encontrada.' });
        }

        res.json({
            ...row,
            respuestas: JSON.parse(row.respuestas || '{}'),
            puntuaciones: JSON.parse(row.puntuaciones || '{}')
        });
    } catch (err) {
        console.error('Error obteniendo sesión DISC:', err);
        res.status(500).json({ error: 'Error al obtener la sesión.' });
    }
});

// ===== ELIMINAR UNA SESIÓN =====
router.delete('/:id', requireAuth, (req, res) => {
    const { id } = req.params;
    try {
        const result = db.prepare('DELETE FROM disc_sesiones WHERE id = ?').run(id);
        if (result.changes === 0) {
            return res.status(404).json({ error: 'Sesión no encontrada.' });
        }
        res.json({ ok: true, mensaje: 'Sesión eliminada correctamente.' });
    } catch (err) {
        console.error('Error eliminando sesión DISC:', err);
        res.status(500).json({ error: 'Error al eliminar la sesión.' });
    }
});

module.exports = router;