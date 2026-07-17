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
const { buildReportViewIPV } = require('../reportView');

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

async function generarDocxIPV(datos) {
  const v = buildReportViewIPV(datos);
  const children = [];

  children.push(
    new Paragraph({ heading: HeadingLevel.TITLE, text: 'Inventario de Personalidad para Vendedores (IPV)' }),
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
    parrafo(`Respondidas: ${v.resumen.respondidas}/${v.resumen.total} · Aciertos con la clave: ${v.resumen.aciertos}`, {
      color: '5B6360',
    })
  );

  // 1. Preguntas y respuestas
  children.push(heading('1. Preguntas y respuestas'));
  children.push(
    tabla(
      ['#', 'Enunciado', 'Resp.', 'Clave', 'Puntúa'],
      v.bruto.detalle.map((d) => [d.n, d.texto, d.respuesta || '—', d.clave, d.acierto ? 'Sí' : 'No'])
    )
  );

  // 2. Puntuaciones directas y decatipos
  children.push(heading('2. Puntuaciones directas y decatipos'));
  children.push(
    tabla(
      ['Escala', 'Nombre', 'PD', 'Máx.', 'Decatipo', 'Nivel'],
      v.filas.map((f) => [f.corta, f.nombre, f.pd, f.max ?? '—', f.decatipo, f.nivel.label])
    )
  );
  children.push(
    parrafo(
      'PD = puntuación directa · Decatipo = valor tipificado 1–10 (media 5.5). Bajo: 1–3 · Medio: 4–7 · Alto: 8–10.',
      { color: '5B6360' }
    )
  );

  // 3. Interpretación
  children.push(heading('3. Interpretación del perfil'));
  v.filas.forEach((f) => {
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_3,
        spacing: { before: 200, after: 40 },
        children: [new TextRun({ text: `${f.nombre} — Decatipo ${f.decatipo}/10 (${f.nivel.label})`, bold: true })],
      })
    );
    children.push(parrafo(`PD ${f.pd}${f.max != null ? '/' + f.max : ''}`, { color: '5B6360' }));
    if (f.descripcion) children.push(parrafo(f.descripcion));
  });

  children.push(
    parrafo(
      'Nota metodológica: la corrección usa los baremos mexicanos del manual del IPV (n = 300) y una asignación pregunta-escala basada en el análisis de contenidos del manual. Para selección de alta consecuencia se recomienda contrastar con la plantilla oficial del editor.',
      { color: '5B6360' }
    )
  );

  const doc = new Document({ sections: [{ children }] });
  return Packer.toBuffer(doc);
}

module.exports = { generarDocxIPV };
