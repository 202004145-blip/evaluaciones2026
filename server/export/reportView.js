'use strict';

// Vista normalizada de un resultado DISC© (método Marian Gamboa) ya calificado
// y guardado en la tabla `resultados`. La usan por igual el detalle del panel
// del evaluador y las 4 exportaciones (docx, xlsx, html, json).
//
// No agrega ninguna regla de corrección: solo reorganiza lo que ya calculó
// server/scoring/gamboa.js y los textos de datos/gamboa/.

const { DIMENSIONES } = require('../scoring/gamboa');

const ESCALAS = ['D', 'I', 'S', 'C'];
const NOMBRE_ESCALA = {
  D: 'Dominante',
  I: 'Influyente',
  S: 'Sereno / Estable',
  C: 'Concienzudo',
};
const COLOR_ESCALA = { D: 'Rojo', I: 'Amarillo', S: 'Verde', C: 'Azul' };

function nombresDe(dims) {
  return (dims || []).map((d) => `${DIMENSIONES[d]?.nombre || NOMBRE_ESCALA[d]} (${COLOR_ESCALA[d]})`);
}

function fichasDe(dims) {
  return (dims || []).map((d) => ({ dim: d, ...(DIMENSIONES[d] || {}) }));
}

function buildReportView(datos) {
  const positivos = datos.positivos || { D: 0, I: 0, S: 0, C: 0 };
  const negativos = datos.negativos || { D: 0, I: 0, S: 0, C: 0 };
  const neto = datos.neto || {};
  ESCALAS.forEach((d) => {
    if (neto[d] === undefined) neto[d] = (positivos[d] || 0) - (negativos[d] || 0);
  });
  const maxPositivo = datos.maxPositivo || [];
  const maxNegativo = datos.maxNegativo || [];

  // Respuestas en bruto respetando el orden de la hoja: cada grupo muestra sus
  // 4 palabras marcando cuál se eligió MÁS (+) y cuál MENOS (−).
  const filas = (datos.detalle || []).map((d) => {
    const orden = Array.isArray(d.orden) && d.orden.length === 4 ? d.orden : ESCALAS;
    return {
      id: d.id,
      mas: d.mas,
      menos: d.menos,
      palabras: orden.map((escala) => ({
        escala,
        palabra: d.palabras[escala],
        esMas: d.mas === escala,
        esMenos: d.menos === escala,
      })),
    };
  });

  return {
    candidato: {
      nombre: datos.nombre,
      cargo: datos.cargo,
      fecha: datos.fecha,
      folio: datos.folio,
      completado_en: datos.completado_en,
    },
    bruto: {
      detalle: datos.detalle,
      filas,
      sumas: { positivos, negativos },
    },
    resultado: {
      positivos,
      negativos,
      neto,
      maxPositivo: { dims: maxPositivo, nombres: nombresDe(maxPositivo) },
      maxNegativo: { dims: maxNegativo, nombres: nombresDe(maxNegativo) },
    },
    interpretacion: {
      dimensiones: DIMENSIONES,
      predominante: fichasDe(maxPositivo),
      repelida: fichasDe(maxNegativo),
    },
  };
}

module.exports = { buildReportView, ESCALAS, NOMBRE_ESCALA, COLOR_ESCALA };
