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
const { buildReportViewBFI } = require('../reportView');

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
    children: [new TextRun({ text: texto, bold: !!opciones.bold, color: opciones.color })],
  });
}

async function generarDocxBFI(datos) {
  const v = buildReportViewBFI(datos);
  const children = [];

  children.push(
    new Paragraph({ heading: HeadingLevel.TITLE, text: 'Inventario Big Five 2 — BFI-2-XS' }),
    new Paragraph({
      alignment: AlignmentType.LEFT,
      spacing: { after: 120 },
      children: [
        new TextRun({
          text: [v.candidato.nombre, v.candidato.cargo, v.candidato.fecha, `Folio ${v.candidato.folio}`]
            .filter(Boolean)
            .join(' · '),
          color: '5B6360',
        }),
      ],
    }),
    parrafo(`Respondidas: ${v.resumen.respondidas}/${v.resumen.total}`, { color: '5B6360' }),
    parrafo(
      'Nota: previsualización automática. Las categorías descriptivas no constituyen baremos oficiales del BFI-2-XS; son rangos basados en el promedio de la escala. Revísese antes de emitir un informe definitivo.',
      { color: '5B6360' }
    )
  );

  // 1. Datos del evaluado
  children.push(heading('1. Datos del evaluado'));
  children.push(
    tabla(
      ['Campo', 'Valor'],
      [
        ['Nombre completo', v.candidato.nombre],
        ['Cargo al que se postula', v.candidato.cargo || '–'],
        ['Fecha de aplicación', v.candidato.fecha || '–'],
        ['Cédula / DNI', v.candidato.ci || '–'],
        ['Folio', v.candidato.folio],
      ]
    )
  );

  // 2. Respuestas en bruto
  children.push(heading('2. Respuestas en bruto'));
  children.push(
    tabla(
      ['#', 'Ítem', 'Dimensión', 'Resp. (1-5)'],
      v.bruto.detalle.map((d) => [d.id, d.texto, d.dimNombre + (d.inv ? ' (R)' : ''), d.respuesta])
    )
  );

  // 3. Cálculo con ítems invertidos
  children.push(heading('3. Cálculo con ítems invertidos'));
  children.push(parrafo('Los ítems inversos (R) se recodifican: valor usado = 6 − respuesta original.'));
  children.push(
    tabla(
      ['Ítem', 'Dimensión', 'Respuesta', 'Inverso', 'Valor usado'],
      v.bruto.detalle.map((d) => [d.id, d.dimNombre, d.respuesta, d.inv ? 'Sí' : 'No', d.usado])
    )
  );

  // 4. Resultados por dimensión
  children.push(heading('4. Resultados por dimensión'));
  children.push(
    tabla(
      ['Dimensión', 'Promedio', 'Nivel'],
      v.filas.map((f) => [f.nombre, f.promedio.toFixed(2), f.nivel.label])
    )
  );

  // 5. Interpretación descriptiva
  children.push(heading('5. Interpretación descriptiva'));
  v.filas.forEach((f) => {
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_3,
        spacing: { before: 200, after: 40 },
        children: [new TextRun({ text: `${f.nombre} — ${f.nivel.label} (${f.promedio.toFixed(2)})`, bold: true })],
      })
    );
    if (f.interpretacion) children.push(parrafo(f.interpretacion));
  });

  children.push(
    parrafo(
      'Instrumento: BFI-2-XS (Soto & John, 2017). Versión española de Gallardo-Pujol, Oceja, Cortijos-Bernabeu y Rouco. Se recomienda su uso solo para los cinco dominios generales y complementarlo con otras fuentes de información.',
      { color: '5B6360' }
    )
  );

  const doc = new Document({ sections: [{ children }] });
  return Packer.toBuffer(doc);
}

module.exports = { generarDocxBFI };
