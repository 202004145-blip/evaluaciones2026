'use strict';

const { ESCALAS, ORDEN, nivelDecatipo } = require('./scoring');

// Escalas globales/compuestas que se destacan (se interpretan primero).
const GLOBALES = new Set(['DGV', 'R', 'A']);

/**
 * Construye una vista normalizada de un resultado ya calificado (lo guardado
 * en la tabla `ipv_resultados`), lista para el panel del evaluador y para los
 * cuatro exportadores. No agrega reglas de corrección nuevas: reorganiza lo
 * ya calculado por server/ipv/scoring.js y los textos de datos/ipv/.
 *
 * El sistema usa 5 niveles cualitativos (1 Muy Bajo, 2 Bajo, 3 Promedio,
 * 4 Mayor Promedio, 5 Alto) tomados directamente de la clasificación oficial
 * del manual del IPV.
 */
function buildReportViewIPV(datos) {
  const filas = ORDEN.map((escala) => {
    const meta = ESCALAS[escala] || {};
    const decatipo = datos.decatipos[escala];
    const nv = nivelDecatipo(decatipo);
    const nivelRaw = datos.niveles ? datos.niveles[escala] : nv.codigo;
    const nivelCodigo = typeof nivelRaw === 'number' ? nivelRaw : nv.codigo;
    const nivelLabel =
      (datos.nivelesLabels && datos.nivelesLabels[escala]) || nv.label;
    const descripcion = meta['desc_' + nivelCodigo] || '';
    return {
      escala,
      corta: meta.corta || escala,
      nombre: meta.nombre || escala,
      pd: datos.pd[escala],
      max: meta.max ?? null,
      decatipo,
      nivel: { codigo: nivelCodigo, label: nivelLabel },
      descripcion,
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
    dgv: filas.find((f) => f.escala === 'DGV'),
  };
}

module.exports = { buildReportViewIPV, ORDEN, GLOBALES };
