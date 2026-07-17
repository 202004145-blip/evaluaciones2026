'use strict';

const XLSX = require('xlsx');
const { buildReportViewIPV } = require('../reportView');

function generarXlsxIPV(datos) {
  const v = buildReportViewIPV(datos);
  const wb = XLSX.utils.book_new();

  const resumen = [
    ['Inventario de Personalidad para Vendedores (IPV)'],
    [],
    ['Nombre', v.candidato.nombre],
    ['Cargo', v.candidato.cargo || ''],
    ['Fecha', v.candidato.fecha || ''],
    ['Folio', v.candidato.folio],
    ['Respondidas', `${v.resumen.respondidas}/${v.resumen.total}`],
    ['Aciertos con la clave', v.resumen.aciertos],
    [],
    ['DGV — Disposición General para la Venta', `Decatipo ${v.dgv.decatipo}/10 (${v.dgv.nivel.label})`],
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(resumen), 'Resumen');

  const bruto = [
    ['#', 'Enunciado', 'Respuesta', 'Clave', '¿Puntúa?'],
    ...v.bruto.detalle.map((d) => [d.n, d.texto, d.respuesta || '', d.clave, d.acierto ? 'Sí' : 'No']),
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(bruto), '1. Preguntas y respuestas');

  const correccion = [
    ['Escala', 'Nombre', 'PD', 'Máx.', 'Decatipo', 'Nivel'],
    ...v.filas.map((f) => [f.corta, f.nombre, f.pd, f.max ?? '', f.decatipo, f.nivel.label]),
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(correccion), '2. Puntuaciones');

  const interp = [
    ['Escala', 'Decatipo', 'Nivel', 'Interpretación'],
    ...v.filas.map((f) => [f.nombre, f.decatipo, f.nivel.label, f.descripcion]),
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(interp), '3. Interpretacion');

  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
}

module.exports = { generarXlsxIPV };
