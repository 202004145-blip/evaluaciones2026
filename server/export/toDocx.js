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
const { buildReportView } = require('./reportView');

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
  const children = [];

  children.push(
    new Paragraph({
      heading: HeadingLevel.TITLE,
      text: 'Sistema de Perfil Personal (DISC)',
    }),
    new Paragraph({
      alignment: AlignmentType.LEFT,
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

  // 1. Resultados en bruto
  children.push(heading('1. Resultados en bruto'));
  children.push(
    tabla(
      ['#', 'Palabras del grupo', 'Elegido MÁS', 'Elegido MENOS'],
      vista.bruto.detalle.map((d) => [
        d.id,
        Object.values(d.palabras).join(' · '),
        `${d.mas} — ${d.palabra_mas}`,
        `${d.menos} — ${d.palabra_menos}`,
      ])
    )
  );

  // 2. Corrección
  children.push(heading('2. Corrección'));
  children.push(heading('Gráfica I · MÁS', HeadingLevel.HEADING_3));
  children.push(
    tabla(
      ['Escala', 'Conteo', 'Nivel (1-7)'],
      ['D', 'I', 'S', 'C'].map((l) => [l, vista.correccion.tallyMas[l], vista.correccion.levels.I[l]])
    )
  );
  children.push(parrafo(`Código: ${vista.correccion.codes.I}`));

  children.push(heading('Gráfica II · MENOS', HeadingLevel.HEADING_3));
  children.push(
    tabla(
      ['Escala', 'Conteo', 'Nivel (1-7)'],
      ['D', 'I', 'S', 'C'].map((l) => [l, vista.correccion.tallyMenos[l], vista.correccion.levels.II[l]])
    )
  );
  children.push(parrafo(`Código: ${vista.correccion.codes.II}`));

  children.push(heading('Gráfica III · Diferencia (MÁS − MENOS)', HeadingLevel.HEADING_3));
  children.push(
    tabla(
      ['Escala', 'Diferencia', 'Nivel (1-7)'],
      ['D', 'I', 'S', 'C'].map((l) => [l, vista.correccion.diferencia[l], vista.correccion.levels.III[l]])
    )
  );
  children.push(parrafo(`Código de perfil: ${vista.correccion.codes.III}`));

  // 3. Interpretación
  children.push(heading('3. Interpretación'));
  if (vista.interpretacion.esSuperactivo) {
    children.push(
      parrafo('Superactivo', { bold: true }),
      parrafo(
        'Los cuatro estilos obtuvieron niveles igualmente altos en la Gráfica III; no concuerda con ningún Patrón Clásico. Se recomienda interpretar usando la Gráfica I o II.'
      ),
      parrafo(`Alternativa según Gráfica I (código ${vista.interpretacion.codeI}): ${vista.interpretacion.patternI || 'no disponible'}`),
      parrafo(`Alternativa según Gráfica II (código ${vista.interpretacion.codeII}): ${vista.interpretacion.patternII || 'no disponible'}`)
    );
  } else {
    children.push(
      parrafo(`${vista.interpretacion.patternIII || 'No determinado'} — código de perfil ${vista.interpretacion.codeIII}`, {
        bold: true,
      })
    );
  }
  const ficha = vista.interpretacion.fichaPrincipal;
  if (ficha) {
    ficha.campos.forEach(([label, valor]) => children.push(parrafo(`${label}: ${valor}.`)));
    ficha.narrativa.forEach((texto) => children.push(parrafo(texto)));
  } else if (!vista.interpretacion.esSuperactivo) {
    children.push(
      parrafo(
        'Este código específico no está documentado en la tabla de interpretación original (es uno de los pocos códigos que faltaban en la fuente). Usa la sección de estilo predominante y las descripciones de los patrones clásicos para una interpretación manual.'
      )
    );
  }

  children.push(heading(`Estilo de comportamiento predominante: ${vista.interpretacion.predNombres.join(' / ')}`, HeadingLevel.HEADING_3));
  vista.interpretacion.estilos.forEach((s) => {
    children.push(parrafo(s.nombre, { bold: true }));
    children.push(parrafo(s.descripcion));
    const listas = [
      ['Tendencias', s.tendencias],
      ['Ambiente deseado', s.ambiente_deseado],
      ['Necesita que otros…', s.necesita_de_otros],
      ['Para ser más eficaz, necesita…', s.para_ser_mas_eficaz],
    ];
    listas.forEach(([titulo, items]) => {
      children.push(new Paragraph({ text: titulo, heading: HeadingLevel.HEADING_4, spacing: { before: 150 } }));
      items.forEach((item) => children.push(new Paragraph({ text: item, bullet: { level: 0 } })));
    });
  });

  const doc = new Document({
    sections: [{ children }],
  });

  return Packer.toBuffer(doc);
}

module.exports = { generarDocx };
