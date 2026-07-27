'use strict';

const XLSX = require('xlsx');
const { buildReportView } = require('./reportView');

function generarXlsx(datos) {
  const vista = buildReportView(datos);
  const wb = XLSX.utils.book_new();

  const resumen = [
    ['Sistema de Perfil Personal (DISC)'],
    [],
    ['Nombre', vista.candidato.nombre],
    ['Cargo', vista.candidato.cargo || ''],
    ['Fecha', vista.candidato.fecha || ''],
    ['Folio', vista.candidato.folio],
    [],
    ['Estilo predominante (D/I/S/C)', vista.interpretacion.predNombres.join(' / ')],
    ['Patrón clásico (Gráfica III)', vista.interpretacion.patternIII || 'No determinado'],
    ['Código de perfil', vista.interpretacion.codeIII],
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(resumen), 'Resumen');

  // Respuestas en bruto en el orden visual de la hoja DISC: las 4 palabras de
  // cada grupo tal como aparecen, indicando cuál se eligió MÁS y cuál MENOS.
  const marca = (p) => (p.esMas ? '(+) ' : p.esMenos ? '(−) ' : '') + p.palabra;
  const bruto = [
    ['#', '1ª palabra', '2ª palabra', '3ª palabra', '4ª palabra', 'Elegido MÁS', 'Elegido MENOS'],
    ...vista.bruto.filas.map((f) => [
      f.id,
      ...f.palabras.map(marca),
      `${f.mas} - ${f.palabras.find((p) => p.esMas).palabra}`,
      `${f.menos} - ${f.palabras.find((p) => p.esMenos).palabra}`,
    ]),
    [],
    ['Suma por escala (+1 por cada selección)'],
    ['Selección', 'D', 'I', 'S', 'C', 'Total'],
    ['MÁS (+)', ...['D', 'I', 'S', 'C'].map((l) => vista.bruto.sumas.mas[l]), 28],
    ['MENOS (−)', ...['D', 'I', 'S', 'C'].map((l) => vista.bruto.sumas.menos[l]), 28],
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(bruto), '1. Respuestas en bruto');

  const nombreEstilo = { D: 'D · Dominante', I: 'I · Influyente', S: 'S · Estable', C: 'C · Concienzudo' };
  const correccion = [
    ['Gráfica I · MÁS'],
    ['Escala', 'Nombre', 'Conteo', 'Nivel (1-7)'],
    ...['D', 'I', 'S', 'C'].map((l) => [l, nombreEstilo[l], vista.correccion.tallyMas[l], vista.correccion.levels.I[l]]),
    [],
    ['Gráfica II · MENOS'],
    ['Escala', 'Nombre', 'Conteo', 'Nivel (1-7)'],
    ...['D', 'I', 'S', 'C'].map((l) => [l, nombreEstilo[l], vista.correccion.tallyMenos[l], vista.correccion.levels.II[l]]),
    [],
    ['Gráfica III · Diferencia'],
    ['Escala', 'Nombre', 'Diferencia', 'Nivel (1-7)'],
    ...['D', 'I', 'S', 'C'].map((l) => [l, nombreEstilo[l], vista.correccion.diferencia[l], vista.correccion.levels.III[l]]),
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(correccion), '2. Correccion');

  const interp = [['Sección', 'Contenido']];
  interp.push(['Patrón clásico', vista.interpretacion.patternIII || 'No determinado']);
  interp.push(['Código de perfil', vista.interpretacion.codeIII]);
  if (vista.interpretacion.esSuperactivo) {
    interp.push(['Alternativa Gráfica I', `${vista.interpretacion.patternI || 'no disponible'} (código ${vista.interpretacion.codeI})`]);
    interp.push(['Alternativa Gráfica II', `${vista.interpretacion.patternII || 'no disponible'} (código ${vista.interpretacion.codeII})`]);
  }
  const ficha = vista.interpretacion.fichaPrincipal;
  if (ficha) {
    ficha.campos.forEach(([label, valor]) => interp.push([label, valor]));
    ficha.narrativa.forEach((texto, idx) => interp.push([`Narrativa ${idx + 1}`, texto]));
  }
  interp.push([]);
  interp.push(['Estilo predominante (D/I/S/C)', vista.interpretacion.predNombres.join(' / ')]);
  vista.interpretacion.estilos.forEach((s) => {
    interp.push([s.nombre, 'Descripción']);
    interp.push(['', s.descripcion]);
    s.tendencias.forEach((t) => interp.push([s.nombre, `Tendencia: ${t}`]));
    s.ambiente_deseado.forEach((t) => interp.push([s.nombre, `Ambiente deseado: ${t}`]));
    s.necesita_de_otros.forEach((t) => interp.push([s.nombre, `Necesita de otros: ${t}`]));
    s.para_ser_mas_eficaz.forEach((t) => interp.push([s.nombre, `Para ser más eficaz: ${t}`]));
  });
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(interp), '3. Interpretacion');

  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
}

module.exports = { generarXlsx };
