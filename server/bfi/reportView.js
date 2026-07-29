'use strict';

const { DIMENSIONES, ORDEN, ESCALA } = require('./scoring');

/**
 * Construye una vista normalizada de un resultado BFI-2-XS ya calificado (lo
 * guardado en la tabla `bfi_resultados`), lista para el panel del evaluador y
 * para los tres exportadores. No agrega reglas de corrección nuevas: reorganiza
 * lo ya calculado por server/bfi/scoring.js y los textos de datos/bfi/.
 */
function buildReportViewBFI(datos) {
  const filas = ORDEN.map((dim) => {
    const r = datos.resultados[dim];
    const meta = DIMENSIONES[dim] || {};
    return {
      dim,
      nombre: r.nombre,
      color: r.color || meta.color || null,
      items: meta.items || r.items.map((it) => it.id),
      suma: r.suma,
      promedio: r.promedio,
      // Porcentaje de la escala (1–5) para barras de progreso.
      pct: ((r.promedio - ESCALA.min) / (ESCALA.max - ESCALA.min)) * 100,
      nivel: r.nivel,
      interpretacion: r.interpretacion,
    };
  });

  return {
    candidato: {
      nombre: datos.nombre,
      cargo: datos.cargo,
      fecha: datos.fecha,
      ci: datos.ci || '',
      folio: datos.folio,
      completado_en: datos.completado_en,
    },
    resumen: {
      total: datos.total,
      respondidas: datos.nRespondidas,
    },
    escala: ESCALA,
    bruto: { detalle: datos.detalle },
    filas,
  };
}

module.exports = { buildReportViewBFI, ORDEN };
