'use strict';

const { ESTILOS_BASE, PATRONES_DETALLE, PATTERN_LOOKUP_DATA, interpretacionParaPatron } = require('../scoring/scoring');

const NOMBRE_ESCALA = { D: 'Dominante', I: 'Influyente', S: 'Estable', C: 'Concienzudo' };
const ESCALAS = ['D', 'I', 'S', 'C'];

const CAMPOS_FICHA = [
  ['Emociones', 'emociones'],
  ['Meta', 'meta'],
  ['Juzga a los demás por', 'juzga_a_otros_por'],
  ['Influye en los demás mediante', 'influye_mediante'],
  ['Su valor para la organización', 'valor_para_organizacion'],
  ['Abusa de', 'abusa_de'],
  ['Bajo presión', 'bajo_presion'],
  ['Teme', 'teme'],
  ['Sería más eficaz si', 'seria_mas_eficaz_si'],
];

/**
 * Construye una vista normalizada de un resultado ya calificado (datos
 * guardados en la tabla `resultados`), lista para alimentar cualquiera de
 * los exportadores (docx, xlsx, html, json) o el detalle del panel.
 * No agrega ninguna regla de corrección nueva: solo reorganiza lo ya
 * calculado por server/scoring/scoring.js y los textos de datos/.
 */
function buildReportView(datos) {
  const predNombres = datos.predominantes.map((l) => ESTILOS_BASE[l].nombre);
  const esSuperactivo = datos.patterns.III === 'Superactivo';

  const fichaPara = (nombrePatron) => {
    const ficha = interpretacionParaPatron(nombrePatron);
    if (!ficha) return null;
    const campos = CAMPOS_FICHA.filter(([, key]) => ficha[key]).map(([label, key]) => [label, ficha[key]]);
    const narrativa = ficha.narrativa || [];
    return { campos, narrativa };
  };

  return {
    candidato: {
      nombre: datos.nombre,
      cargo: datos.cargo,
      fecha: datos.fecha,
      folio: datos.folio,
      completado_en: datos.completado_en,
    },
    bruto: { detalle: datos.detalle },
    correccion: {
      tallyMas: datos.tallyMas,
      tallyMenos: datos.tallyMenos,
      diferencia: datos.diferencia,
      levels: datos.levels,
      codes: datos.codes,
    },
    interpretacion: {
      esSuperactivo,
      patternIII: datos.patterns.III,
      patternI: datos.patterns.I,
      patternII: datos.patterns.II,
      codeIII: datos.codes.III,
      codeI: datos.codes.I,
      codeII: datos.codes.II,
      fichaPrincipal: fichaPara(esSuperactivo ? 'Superactivo' : datos.patterns.III),
      predominantes: datos.predominantes,
      predNombres,
      estilos: datos.predominantes.map((l) => ESTILOS_BASE[l]),
    },
    referenciaPatrones: PATTERN_LOOKUP_DATA.PATTERN_LIST.map((nombre) => ({
      nombre,
      narrativa: (PATRONES_DETALLE[nombre]?.narrativa || [])[0] || '',
    })),
  };
}

module.exports = { buildReportView, ESCALAS, NOMBRE_ESCALA };
