'use strict';

const { ESCALAS, ORDEN, nivelDecatipo } = require('./scoring');

// Escalas globales/compuestas que se destacan (se interpretan primero).
const GLOBALES = new Set(['DGV', 'R', 'A']);

/**
 * Construye una vista normalizada de un resultado ya calificado (lo guardado
 * en la tabla `ipv_resultados`), lista para el panel del evaluador y para los
 * cuatro exportadores. No agrega reglas de corrección nuevas: reorganiza lo ya
 * calculado por server/ipv/scoring.js y los textos de datos/ipv/.
 */
function buildReportViewIPV(datos) {
  const filas = ORDEN.map((escala) => {
    const meta = ESCALAS[escala] || {};
    const decatipo = datos.decatipos[escala];
    const nivel = nivelDecatipo(decatipo);
    const cat = datos.niveles[escala] || nivel.cat;
    return {
      escala,
      corta: meta.corta || escala,
      nombre: meta.nombre || escala,
      pd: datos.pd[escala],
      max: meta.max ?? null,
      decatipo,
      nivel: { cat, label: nivelDecatipo(decatipo).label },
      descripcion: meta['desc_' + cat] || '',
      esGlobal: GLOBALES.has(escala),
    };
  });

  const aciertos = datos.detalle.filter((d) => d.acierto).length;

  return {
    candidato: {
      nombre: datos.nombre,
      cargo: datos.cargo,
      fecha: datos.fecha,
      folio: datos.folio,
      completado_en: datos.completado_en,
    },
    resumen: {
      total: datos.total,
      respondidas: datos.nRespondidas,
      aciertos,
    },
    bruto: { detalle: datos.detalle },
    filas,
    // Atajos útiles para encabezados y listados.
    dgv: filas.find((f) => f.escala === 'DGV'),
  };
}

module.exports = { buildReportViewIPV, ORDEN, GLOBALES };
