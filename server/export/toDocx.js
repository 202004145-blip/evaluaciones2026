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
const HEX = { D: 'C1443C', I: 'D69A2D', S: '3E7A5B', C: '3A5A78' };
const FILL_MAS = 'E7F1EC';
const FILL_MENOS = 'FBEAE8';
const FILL_HEAD = 'ECEEEA';

function celda(texto, opciones = {}) {
  return new TableCell({
    width: opciones.width ? { size: opciones.width, type: WidthType.PERCENTAGE } : undefined,
    shading: opciones.fill ? { fill: opciones.fill } : undefined,
    children: [
      new Paragraph({
        alignment: opciones.center ? AlignmentType.CENTER : AlignmentType.LEFT,
        children: [new TextRun({ text: String(texto ?? ''), bold: !!opciones.bold, color: opciones.color })],
      }),
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
  const detalle = (vista.bruto.detalle || []).slice().sort((a, b) => a.id - b.id);
  const total = (o) => ESCALAS.reduce((a, l) => a + (o[l] || 0), 0);
  const children = [];

  children.push(
    new Paragraph({ heading: HeadingLevel.TITLE, text: 'DISC© — Hoja de respuestas y corrección' }),
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

  // 1. Hoja de respuestas (modelo Marian Gamboa): ítems en filas, dimensiones
  // en columnas, marcando MÁS (+) / MENOS (−).
  children.push(heading('1. Hoja de respuestas'));
  children.push(
    parrafo('Cada ítem en su fila y cada dimensión (D/I/S/C) en su columna. (+) = elegida como MÁS, (−) = elegida como MENOS.')
  );

  const encabezado = new TableRow({
    tableHeader: true,
    children: [
      celda('Ítem', { bold: true, center: true, fill: FILL_HEAD }),
      ...ESCALAS.map((l) =>
        celda(`${l} · ${NOMBRE_ESCALA[l]} (${COLOR_ESCALA[l]})`, { bold: true, color: 'FFFFFF', fill: HEX[l] })
      ),
    ],
  });
  const filasCuerpo = detalle.map(
    (d) =>
      new TableRow({
        children: [
          celda(d.id, { center: true, bold: true }),
          ...ESCALAS.map((l) => {
            const esMas = d.mas === l;
            const esMenos = d.menos === l;
            const marca = esMas ? ' (+)' : esMenos ? ' (−)' : '';
            return celda(`${d.palabras[l]}${marca}`, { bold: esMas || esMenos, fill: esMas ? FILL_MAS : esMenos ? FILL_MENOS : undefined });
          }),
        ],
      })
  );
  children.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [encabezado, ...filasCuerpo] }));

  // 2. Sumatoria por dimensión (corrección).
  children.push(heading('2. Sumatoria por dimensión'));
  children.push(parrafo('Suma vertical de cada columna. El neto = (# de +) − (# de −).'));
  const filaSum = (label, obj, bold) =>
    new TableRow({
      children: [
        celda(label, { bold: true, fill: FILL_HEAD }),
        ...ESCALAS.map((l) => celda(obj[l] > 0 && bold ? `+${obj[l]}` : obj[l], { center: true, bold, color: HEX[l] })),
      ],
    });
  children.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          tableHeader: true,
          children: [celda('', { fill: FILL_HEAD }), ...ESCALAS.map((l) => celda(`${l} (${COLOR_ESCALA[l]})`, { bold: true, color: 'FFFFFF', fill: HEX[l], center: true }))],
        }),
        filaSum('Positivos (+)', r.positivos, false),
        filaSum('Negativos (−)', r.negativos, false),
        filaSum('Suma / Neto (+ − −)', r.neto, true),
      ],
    })
  );
  children.push(parrafo(''));
  children.push(parrafo(`Dimensión con más positivos (personalidad predominante): ${r.maxPositivo.nombres.join(' / ') || '—'}`, { bold: true }));
  children.push(parrafo(`Dimensión con más negativos (personalidad que evita/repele): ${r.maxNegativo.nombres.join(' / ') || '—'}`, { bold: true }));

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
