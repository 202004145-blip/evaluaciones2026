'use strict';

const XLSX = require('xlsx');
const { buildReportView, NOMBRE_ESCALA, COLOR_ESCALA } = require('./reportView');

const ESCALAS = ['D', 'I', 'S', 'C'];

function generarXlsx(datos) {
  const vista = buildReportView(datos);
  const r = vista.resultado;
  const wb = XLSX.utils.book_new();

  const resumen = [
    ['DISC© — Estudio de perfil (método Marian Gamboa)'],
    [],
    ['Nombre', vista.candidato.nombre],
    ['Cargo', vista.candidato.cargo || ''],
    ['Fecha', vista.candidato.fecha || ''],
    ['Folio', vista.candidato.folio],
    [],
    ['Personalidad predominante (máximo +)', r.maxPositivo.nombres.join(' / ')],
    ['Personalidad que evita/repele (máximo −)', r.maxNegativo.nombres.join(' / ')],
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(resumen), 'Resumen');

  // Hoja de respuestas (Marian Gamboa): cada ítem en su fila, cada dimensión
  // en su columna, marcando MÁS (+) / MENOS (−), y la suma vertical al pie.
  const detalle = (vista.bruto.detalle || []).slice().sort((a, b) => a.id - b.id);
  const marca = (d, l) => `${d.palabras[l]}${d.mas === l ? ' (+)' : d.menos === l ? ' (−)' : ''}`;
  const bruto = [
    ['Ítem', ...ESCALAS.map((l) => `${l} · ${NOMBRE_ESCALA[l]} (${COLOR_ESCALA[l]})`)],
    ...detalle.map((d) => [d.id, ...ESCALAS.map((l) => marca(d, l))]),
    [],
    ['Positivos (+)', ...ESCALAS.map((l) => r.positivos[l])],
    ['Negativos (−)', ...ESCALAS.map((l) => r.negativos[l])],
    ['Neto (+ menos −)', ...ESCALAS.map((l) => r.neto[l])],
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(bruto), '1. Hoja de respuestas');

  const nombre = (l) => `${l} · ${NOMBRE_ESCALA[l]} (${COLOR_ESCALA[l]})`;
  const total = (o) => ESCALAS.reduce((a, l) => a + (o[l] || 0), 0);
  const correccion = [
    ['Calificación — suma por dimensión'],
    ['Se cuentan los + y los − de cada dimensión; el neto = (# de +) − (# de −).'],
    [],
    ['Dimensión', 'Positivos (+)', 'Negativos (−)', 'Neto (+ menos −)'],
    ...ESCALAS.map((l) => [nombre(l), r.positivos[l], r.negativos[l], r.neto[l]]),
    ['TOTAL', total(r.positivos), total(r.negativos), total(r.neto)],
    [],
    ['Personalidad predominante (más positivos)', r.maxPositivo.nombres.join(' / ')],
    ['Personalidad que evita/repele (más negativos)', r.maxNegativo.nombres.join(' / ')],
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(correccion), '2. Calificacion');

  const interp = [['Interpretación por colores'], []];
  const bloque = (titulo, fichas) => {
    interp.push([titulo]);
    fichas.forEach((f) => {
      interp.push([`${f.nombre} (${f.color})`, f.descripcion]);
      if (f.para_comunicarte_con_ella) interp.push(['Para comunicarte con esta persona', f.para_comunicarte_con_ella]);
      if (f.si_te_identificas) interp.push(['Si te identificas con este estilo', f.si_te_identificas]);
      interp.push([]);
    });
  };
  bloque('Personalidad predominante (máximo positivo)', vista.interpretacion.predominante);
  bloque('Personalidad que evita/repele (máximo negativo)', vista.interpretacion.repelida);
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(interp), '3. Interpretacion');

  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
}

module.exports = { generarXlsx };
