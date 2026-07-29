'use strict';

const {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
} = require('docx');
const { buildReportView, NOMBRE_ESCALA, COLOR_ESCALA } = require('./reportView');

const ESCALAS = ['D', 'I', 'S', 'C'];

function celda(texto, opciones = {}) {
  return new TableCell({
    width: opciones.width ? { size: opciones.width, type: WidthType.PERCENTAGE } : undefined,
    children: [new Paragraph({ children: [new TextRun({ text: String(texto ?? ''), bold: !!opciones.bold })] })],
  });
}

function tabla(encabezados, filas) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({ tableHeader: true, children: encabezados.map((h) => celda(h, { bold: true })) }),
      ...filas.map((fila) => new TableRow({ children: fila.map((c) => celda(c)) })),
    ],
  });
}

function heading(texto, level = HeadingLevel.HEADING_2) {
  return new Paragraph({ text: texto, heading: level, spacing: { before: 300, after: 120 } });
}

function parrafo(texto, opciones = {}) {
  return new Paragraph({
    spacing: { after: 100 },
    children: [new TextRun({ text: texto, bold: !!opciones.bold })],
  });
}

async function generarDocx(datos) {
  const vista = buildReportView(datos);
  const r = vista.resultado;
  const children = [];

  children.push(
    new Paragraph({ heading: HeadingLevel.TITLE, text: 'DISC© — Estudio de perfil' }),
    new Paragraph({
      spacing: { after: 300 },
      children: [
        new TextRun({
          text: [vista.candidato.nombre, vista.candidato.cargo, vista.candidato.fecha, `Folio ${vista.candidato.folio}`]
            .filter(Boolean)
            .join(' · '),
          color: '5B6360',
        }),
      ],
    })
  );

  // 1. Respuestas en bruto — orden original de las 4 palabras, marcando MÁS/MENOS.
  children.push(heading('1. Respuestas en bruto'));
  children.push(
    parrafo('Cada grupo conserva el orden original de sus 4 palabras. (+) = elegida como MÁS, (−) = elegida como MENOS.')
  );
  const marcaPalabra = (p) => `${p.palabra}${p.esMas ? ' (+)' : p.esMenos ? ' (−)' : ''}`;
  children.push(
    tabla(
      ['#', '1ª palabra', '2ª palabra', '3ª palabra', '4ª palabra'],
      vista.bruto.filas.map((f) => [f.id, ...f.palabras.map(marcaPalabra)])
    )
  );

  // 2. Calificación — suma de + y − por dimensión y neto.
  const total = (o) => ESCALAS.reduce((a, l) => a + (o[l] || 0), 0);
  children.push(heading('2. Calificación'));
  children.push(parrafo('Por cada dimensión se cuentan los + y los −; el neto = (# de +) − (# de −).'));
  children.push(
    tabla(
      ['Dimensión', 'Positivos (+)', 'Negativos (−)', 'Neto'],
      [
        ...ESCALAS.map((l) => [`${l} · ${NOMBRE_ESCALA[l]} (${COLOR_ESCALA[l]})`, r.positivos[l], r.negativos[l], r.neto[l]]),
        ['TOTAL', total(r.positivos), total(r.negativos), total(r.neto)],
      ]
    )
  );
  children.push(parrafo(`Personalidad predominante (máximo positivo): ${r.maxPositivo.nombres.join(' / ') || '—'}`, { bold: true }));
  children.push(parrafo(`Personalidad que evita/repele (máximo negativo): ${r.maxNegativo.nombres.join(' / ') || '—'}`, { bold: true }));

  // 3. Interpretación por colores.
  children.push(heading('3. Interpretación'));
  const bloque = (titulo, fichas) => {
    children.push(heading(titulo, HeadingLevel.HEADING_3));
    fichas.forEach((f) => {
      children.push(parrafo(`${f.nombre} (${f.color})`, { bold: true }));
      children.push(parrafo(f.descripcion));
      if (f.para_comunicarte_con_ella) {
        children.push(new Paragraph({ text: 'Para comunicarte con esta persona', heading: HeadingLevel.HEADING_4, spacing: { before: 120 } }));
        children.push(parrafo(f.para_comunicarte_con_ella));
      }
      if (f.si_te_identificas) {
        children.push(new Paragraph({ text: 'Si te identificas con este estilo', heading: HeadingLevel.HEADING_4, spacing: { before: 120 } }));
        children.push(parrafo(f.si_te_identificas));
      }
    });
  };
  bloque('Personalidad predominante', vista.interpretacion.predominante);
  bloque('Personalidad que evita/repele', vista.interpretacion.repelida);

  const doc = new Document({ sections: [{ children }] });
  return Packer.toBuffer(doc);
}

module.exports = { generarDocx };
