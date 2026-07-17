/**
 * src/reports/html-report.js
 * Genera un archivo HTML autónomo con el informe completo del postulante.
 *
 * Contiene 3 secciones:
 *   1. Respuestas en bruto — enunciado + opciones (con clave y respuesta
 *      resaltadas por color) para cada una de las 87 preguntas.
 *   2. Corrección — tabla con PD, decatipo y nivel por escala.
 *   3. Interpretación — descripción por escala según nivel obtenido.
 *
 * Estilos inline (para que el archivo sea autónomo, se pueda abrir en
 * cualquier navegador y también importar limpio a Word o similares).
 *
 * Requiere: escapeHTML, formatFecha (globales)
 * Expone: generarHTML(datos) → string
 */

/* -------- HTML autónomo -------- */

function generarHTML(datos) {
  const respuestasHTML = datos.respuestas.map(r => {
    const opts = Object.entries(r.opciones).map(([letra, texto]) => {
      const esClave = letra === r.clave;
      const esResp = letra === r.respuesta;
      let estilo = "";
      if (esClave && esResp) estilo = "background:#D1FAE5; border-left:4px solid #059669; font-weight:600;";
      else if (esClave) estilo = "background:#FEF3C7; border-left:4px solid #B45309;";
      else if (esResp) estilo = "background:#DBEAFE; border-left:4px solid #1E40AF; font-weight:600;";
      return `<div style="padding:6px 10px; margin:3px 0; ${estilo}"><strong>${letra}.</strong> ${escapeHTML(texto)}</div>`;
    }).join("");
    const marca = r.respuesta
      ? (r.acierto ? '<span style="color:#059669; font-weight:600;">✓ Coincide con clave</span>' : '<span style="color:#6B7280;">No puntúa</span>')
      : '<span style="color:#DC2626; font-weight:600;">Sin responder</span>';
    return `
      <div style="border:1px solid #E5E7EB; border-radius:4px; padding:14px 18px; margin-bottom:12px; page-break-inside:avoid;">
        <div style="font-size:12px; color:#6B7280; margin-bottom:6px;">Pregunta ${r.n} · Escala ${r.escala}</div>
        <div style="font-weight:600; margin-bottom:10px;">${escapeHTML(r.texto)}</div>
        ${opts}
        <div style="margin-top:8px; font-size:13px;">
          Respuesta del postulante: <strong>${r.respuesta || "—"}</strong> — ${marca}
        </div>
      </div>`;
  }).join("");

  const correccionHTML = `
    <table style="width:100%; border-collapse:collapse; margin-top:10px;">
      <thead>
        <tr style="background:#F3F4F6;">
          <th style="text-align:left; padding:10px; border:1px solid #D1D5DB;">Escala</th>
          <th style="padding:10px; border:1px solid #D1D5DB;">PD</th>
          <th style="padding:10px; border:1px solid #D1D5DB;">Máx.</th>
          <th style="padding:10px; border:1px solid #D1D5DB;">Decatipo</th>
          <th style="padding:10px; border:1px solid #D1D5DB;">Nivel</th>
        </tr>
      </thead>
      <tbody>
        ${datos.correccion.map(c => {
          const destacar = ["DGV", "R", "A"].includes(c.corta);
          const bg = destacar ? "background:#E8EEF4;" : "";
          const nivelColor = c.nivel === "Alto" ? "#059669" : c.nivel === "Medio" ? "#B45309" : "#DC2626";
          return `<tr style="${bg}">
            <td style="padding:10px; border:1px solid #D1D5DB; ${destacar ? 'font-weight:600' : ''}">${escapeHTML(c.escala)}</td>
            <td style="padding:10px; border:1px solid #D1D5DB; text-align:center;">${c.pd}</td>
            <td style="padding:10px; border:1px solid #D1D5DB; text-align:center; color:#6B7280;">${c.max}</td>
            <td style="padding:10px; border:1px solid #D1D5DB; text-align:center; font-weight:600; font-size:16px;">${c.decatipo}</td>
            <td style="padding:10px; border:1px solid #D1D5DB; color:${nivelColor}; font-weight:600;">${c.nivel}</td>
          </tr>`;
        }).join("")}
      </tbody>
    </table>`;

  const interpretacionHTML = datos.interpretacion.map(i => {
    const nivelColor = i.nivel === "Alto" ? "#059669" : i.nivel === "Medio" ? "#B45309" : "#DC2626";
    return `
      <div style="border:1px solid #E5E7EB; border-left:4px solid #23405C; border-radius:3px; padding:16px 20px; margin-bottom:12px; page-break-inside:avoid;">
        <div style="display:flex; justify-content:space-between; align-items:baseline; margin-bottom:8px; flex-wrap:wrap; gap:8px;">
          <div style="font-family:Georgia,serif; font-size:18px; font-weight:600; color:#23405C;">${escapeHTML(i.escala)}</div>
          <div style="font-size:13px;">
            PD: <strong>${i.pd}</strong>/${i.max} · Decatipo: <strong>${i.decatipo}</strong>/10 ·
            <span style="color:${nivelColor}; font-weight:700;">Nivel ${i.nivel}</span>
          </div>
        </div>
        <div style="font-size:14px; line-height:1.6; color:#374151;">${escapeHTML(i.descripcion)}</div>
      </div>`;
  }).join("");

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>Informe IPV — ${escapeHTML(datos.postulante.nombre || "postulante")}</title>
<style>
  body { font-family: 'Segoe UI', Tahoma, sans-serif; color:#1F2937; max-width:900px; margin:24px auto; padding:20px; line-height:1.5; }
  h1 { font-family: Georgia, serif; color:#23405C; font-size:28px; margin-bottom:6px; }
  h2 { font-family: Georgia, serif; color:#23405C; font-size:22px; margin-top:32px; padding-bottom:8px; border-bottom:2px solid #E5E7EB; }
  .meta { background:#F3F4F6; padding:16px 20px; border-radius:4px; margin:12px 0 20px; }
  .meta dl { display:grid; grid-template-columns: max-content 1fr; gap:6px 18px; margin:0; }
  .meta dt { font-weight:600; color:#4B5563; }
  .meta dd { margin:0; }
  .cover-note { color:#6B7280; font-size:13px; margin-top:10px; }
  .legend { font-size:12px; color:#6B7280; margin:10px 0; }
  .legend span { display:inline-block; padding:2px 8px; margin-right:8px; border-radius:2px; }
</style>
</head>
<body>

<h1>Informe IPV</h1>
<div class="cover-note">Inventario de Personalidad para Vendedores · Corrección con baremos mexicanos</div>

<div class="meta">
  <dl>
    <dt>Postulante:</dt><dd><strong>${escapeHTML(datos.postulante.nombre || "—")}</strong></dd>
    <dt>Cargo al que postula:</dt><dd>${escapeHTML(datos.postulante.cargo || "—")}</dd>
    <dt>Fecha de aplicación:</dt><dd>${escapeHTML(formatFecha(datos.postulante.fecha) || "—")}</dd>
    <dt>Preguntas respondidas:</dt><dd>${datos.respondidas} de 87</dd>
    <dt>Fecha del informe:</dt><dd>${escapeHTML(datos.fechaInforme)}</dd>
  </dl>
</div>

<h2>1. Respuestas en bruto</h2>
<div class="legend">
  <span style="background:#FEF3C7; border-left:3px solid #B45309;">Clave de puntuación</span>
  <span style="background:#DBEAFE; border-left:3px solid #1E40AF;">Respuesta del postulante</span>
  <span style="background:#D1FAE5; border-left:3px solid #059669;">Coinciden (puntúa)</span>
</div>
${respuestasHTML}

<h2>2. Corrección — Puntuaciones y decatipos</h2>
<p style="font-size:13px; color:#6B7280;">Baremos mexicanos (n=300) · Decatipo: 1–3 bajo · 4–7 medio · 8–10 alto</p>
${correccionHTML}

<h2>3. Interpretación del perfil</h2>
${interpretacionHTML}

<div style="margin-top:40px; padding-top:16px; border-top:1px solid #E5E7EB; font-size:12px; color:#6B7280;">
  Informe generado automáticamente por la herramienta IPV. La asignación pregunta–escala es una aproximación basada en el análisis de contenidos del manual; para uso clínico o de selección de alta consecuencia se recomienda contrastar con la plantilla oficial del editor.
</div>

</body>
</html>`;
}
