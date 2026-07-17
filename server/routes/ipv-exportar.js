'use strict';

const express = require('express');
const db = require('../db');
const { requireAuth } = require('../auth');
const { generarDocxIPV } = require('../ipv/export/toDocx');
const { generarXlsxIPV } = require('../ipv/export/toXlsx');
const { generarHtmlIPV } = require('../ipv/export/toHtml');

const router = express.Router();

router.use(requireAuth);

function cargarResultado(folio) {
  const fila = db.prepare('SELECT datos_json FROM ipv_resultados WHERE folio = ?').get(folio);
  if (!fila) return null;
  return JSON.parse(fila.datos_json);
}

router.get('/:folio/:formato', async (req, res) => {
  const { folio, formato } = req.params;
  const datos = cargarResultado(folio);
  if (!datos) return res.status(404).json({ error: 'Resultado no encontrado.' });

  const nombreArchivo = `IPV_${(datos.nombre || 'resultado').replace(/\s+/g, '_')}_${folio}`;

  try {
    switch (formato) {
      case 'docx': {
        const buffer = await generarDocxIPV(datos);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        res.setHeader('Content-Disposition', `attachment; filename="${nombreArchivo}.docx"`);
        return res.send(buffer);
      }
      case 'xlsx': {
        const buffer = generarXlsxIPV(datos);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${nombreArchivo}.xlsx"`);
        return res.send(buffer);
      }
      case 'html': {
        const html = generarHtmlIPV(datos);
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="${nombreArchivo}.html"`);
        return res.send(html);
      }
      case 'json': {
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="${nombreArchivo}.json"`);
        return res.send(JSON.stringify(datos, null, 2));
      }
      default:
        return res.status(400).json({ error: 'Formato de exportación no soportado.' });
    }
  } catch (err) {
    console.error('Error generando exportación IPV', err);
    return res.status(500).json({ error: 'No se pudo generar la exportación.' });
  }
});

module.exports = router;
