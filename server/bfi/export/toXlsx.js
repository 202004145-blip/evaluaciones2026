'use strict';

const XLSX = require('xlsx');
const { buildReportViewBFI } = require('../reportView');

function generarXlsxBFI(datos) {
  const v = buildReportViewBFI(datos);
  const wb = XLSX.utils.book_new();

  const resumen = [
    ['Inventario Big Five 2 — Versión ultra breve (BFI-2-XS)'],
    [],
    ['Nombre', v.candidato.nombre],
    ['Cargo', v.candidato.cargo || ''],
    ['Fecha', v.candidato.fecha || ''],
    ['Cédula / DNI', v.candidato.ci || ''],
    ['Folio', v.candidato.folio],
    ['Respondidas', `${v.resumen.respondidas}/${v.resumen.total}`],
    [],
    ['Dimensión', 'Promedio', 'Nivel'],
    ...v.filas.map((f) => [f.nombre, Number(f.promedio.toFixed(2)), f.nivel.label]),
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(resumen), 'Resumen');

  const bruto = [
    ['#', 'Ítem', 'Dimensión', 'Inverso', 'Respuesta', 'Valor usado'],
    ...v.bruto.detalle.map((d) => [d.id, d.texto, d.dimNombre, d.inv ? 'Sí' : 'No', d.respuesta, d.usado]),
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(bruto), 'Respuestas');

  const interp = [
    ['Dimensión', 'Promedio', 'Nivel', 'Interpretación'],
    ...v.filas.map((f) => [f.nombre, Number(f.promedio.toFixed(2)), f.nivel.label, f.interpretacion]),
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(interp), 'Interpretacion');

  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
}

module.exports = { generarXlsxBFI };
