/**
 * src/reports/excel-report.js
 * Genera un archivo .xlsx real usando SheetJS (biblioteca XLSX).
 *
 * Estructura del workbook — 4 hojas:
 *   1. "Datos"          — información del postulante (encabezado del informe)
 *   2. "Respuestas"     — una fila por pregunta con enunciado, opciones,
 *                          clave, respuesta del postulante y si puntúa.
 *   3. "Correccion"     — tabla de PDs, decatipos y niveles por escala.
 *   4. "Interpretacion" — descripción interpretativa por escala.
 *
 * Requiere: XLSX (cargado desde CDN en index.html)
 * Requiere: formatFecha (global)
 * Expone: generarExcel(datos) → Uint8Array (buffer del .xlsx) o null si XLSX falla
 */

/* -------- Excel (.xlsx) con SheetJS -------- */

function generarExcel(datos) {
  if (typeof XLSX === "undefined") {
    alert("La librería de Excel no cargó (necesita conexión a internet). Intenta con HTML o Word.");
    return null;
  }
  const wb = XLSX.utils.book_new();

  // Hoja 1: Datos del postulante
  const dataHeader = [
    ["Informe IPV — Inventario de Personalidad para Vendedores"],
    [],
    ["Postulante", datos.postulante.nombre || ""],
    ["Cargo al que postula", datos.postulante.cargo || ""],
    ["Fecha de aplicación", formatFecha(datos.postulante.fecha) || ""],
    ["Preguntas respondidas", `${datos.respondidas} de 87`],
    ["Fecha del informe", datos.fechaInforme]
  ];
  const ws1 = XLSX.utils.aoa_to_sheet(dataHeader);
  ws1["!cols"] = [{ wch: 26 }, { wch: 50 }];
  XLSX.utils.book_append_sheet(wb, ws1, "Datos");

  // Hoja 2: Respuestas en bruto
  const respHead = [["N°", "Escala", "Pregunta", "Opción A", "Opción B", "Opción C", "Clave", "Respuesta", "¿Puntúa?"]];
  const respRows = datos.respuestas.map(r => [
    r.n,
    r.escala,
    r.texto,
    r.opciones.A || "",
    r.opciones.B || "",
    r.opciones.C || "",
    r.clave,
    r.respuesta || "(sin responder)",
    r.respuesta === r.clave ? "SÍ" : (r.respuesta ? "no" : "—")
  ]);
  const ws2 = XLSX.utils.aoa_to_sheet(respHead.concat(respRows));
  ws2["!cols"] = [
    { wch: 5 }, { wch: 8 }, { wch: 60 },
    { wch: 40 }, { wch: 40 }, { wch: 40 },
    { wch: 7 }, { wch: 11 }, { wch: 10 }
  ];
  XLSX.utils.book_append_sheet(wb, ws2, "Respuestas");

  // Hoja 3: Corrección
  const corrHead = [["Escala", "PD", "Máximo", "Decatipo", "Nivel"]];
  const corrRows = datos.correccion.map(c => [c.escala, c.pd, c.max, c.decatipo, c.nivel]);
  const ws3 = XLSX.utils.aoa_to_sheet(corrHead.concat(corrRows));
  ws3["!cols"] = [{ wch: 40 }, { wch: 6 }, { wch: 8 }, { wch: 10 }, { wch: 10 }];
  XLSX.utils.book_append_sheet(wb, ws3, "Correccion");

  // Hoja 4: Interpretación
  const interpHead = [["Escala", "PD", "Máximo", "Decatipo", "Nivel", "Interpretación"]];
  const interpRows = datos.interpretacion.map(i => [i.escala, i.pd, i.max, i.decatipo, i.nivel, i.descripcion]);
  const ws4 = XLSX.utils.aoa_to_sheet(interpHead.concat(interpRows));
  ws4["!cols"] = [{ wch: 40 }, { wch: 6 }, { wch: 8 }, { wch: 10 }, { wch: 10 }, { wch: 90 }];
  // Envolver texto en columna Interpretación
  const range = XLSX.utils.decode_range(ws4["!ref"]);
  for (let R = 1; R <= range.e.r; R++) {
    const cell = ws4[XLSX.utils.encode_cell({ r: R, c: 5 })];
    if (cell) cell.s = { alignment: { wrapText: true, vertical: "top" } };
  }
  XLSX.utils.book_append_sheet(wb, ws4, "Interpretacion");

  return XLSX.write(wb, { bookType: "xlsx", type: "array" });
}
