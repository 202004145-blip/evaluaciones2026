'use strict';

const { buildReportViewBFI } = require('../reportView');

function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function nivelBadgeClass(cat) {
  return 'b-' + cat;
}

function generarHtmlBFI(datos) {
  const v = buildReportViewBFI(datos);
  const candidateLine = [v.candidato.nombre, v.candidato.cargo, v.candidato.fecha, `Folio ${v.candidato.folio}`]
    .filter(Boolean)
    .join(' · ');

  const brutoRows = v.bruto.detalle
    .map(
      (d) => `<tr>
        <td class="c">${d.id}</td>
        <td>${esc(d.texto)}</td>
        <td>${esc(d.dimNombre)}${d.inv ? ' <span class="rev">(R)</span>' : ''}</td>
        <td class="c b">${d.respuesta}</td>
      </tr>`
    )
    .join('');

  const scoringRows = v.bruto.detalle
    .map(
      (d) => `<tr>
        <td class="c">${d.id}</td>
        <td>${esc(d.dimNombre)}</td>
        <td class="c">${d.respuesta}</td>
        <td class="c">${d.inv ? 'Sí' : 'No'}</td>
        <td class="c b">${d.usado}</td>
      </tr>`
    )
    .join('');

  const resumenRows = v.filas
    .map(
      (f) => `<tr>
        <td><b>${esc(f.nombre)}</b></td>
        <td class="c b">${f.promedio.toFixed(2)}</td>
        <td><span class="badge ${nivelBadgeClass(f.nivel.cat)}">${esc(f.nivel.label)}</span></td>
      </tr>`
    )
    .join('');

  const interpBlocks = v.filas
    .map(
      (f) => `<div class="dim">
        <h3>${esc(f.nombre)} <span class="badge ${nivelBadgeClass(f.nivel.cat)}" style="float:right">${esc(
        f.nivel.label
      )} (${f.promedio.toFixed(2)})</span></h3>
        <div class="bar"><span style="width:${Math.max(0, Math.min(100, f.pct)).toFixed(1)}%"></span></div>
        <p>${esc(f.interpretacion)}</p>
      </div>`
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>Informe BFI-2-XS — ${esc(v.candidato.nombre)}</title>
<style>
  body { font-family: Arial, sans-serif; max-width: 900px; margin: 20px auto; padding: 20px; color: #2d3748; line-height: 1.6; }
  h1 { color: #1e3a5f; border-bottom: 3px solid #1e3a5f; padding-bottom: 10px; margin: 0; }
  h2 { color: #2c5282; margin-top: 30px; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; }
  h3 { color: #3182ce; margin-top: 20px; }
  table { width: 100%; border-collapse: collapse; margin: 15px 0; font-size: 14px; }
  th, td { border: 1px solid #cbd5e0; padding: 8px 12px; text-align: left; }
  th { background: #edf2f7; color: #1e3a5f; }
  td.c { text-align: center; }
  td.b { font-weight: bold; }
  .rev { color: #e53e3e; font-weight: 600; }
  .header { background: #1e3a5f; color: white; padding: 20px; margin: -20px -20px 20px; }
  .header h1 { color: white; border: none; }
  .header p { margin: 4px 0 0; color: rgba(255,255,255,0.85); }
  .meta { color: #5b6360; font-size: 13px; }
  .warning { background: #fef5e7; border-left: 4px solid #d69e2e; padding: 12px 16px; margin: 20px 0; }
  .dim { border: 1px solid #e2e8f0; padding: 15px; margin: 10px 0; border-radius: 6px; }
  .bar { height: 8px; background: #e2e8f0; border-radius: 4px; overflow: hidden; margin: 8px 0; }
  .bar span { display: block; height: 100%; background: linear-gradient(90deg, #3182ce, #1e3a5f); }
  .badge { display: inline-block; padding: 4px 10px; border-radius: 12px; font-weight: 600; font-size: 12px; }
  .b-muy-bajo { background: #fed7d7; color: #742a2a; }
  .b-bajo { background: #feebc8; color: #7c2d12; }
  .b-medio { background: #e6f0fa; color: #1e3a5f; }
  .b-alto { background: #c6f6d5; color: #22543d; }
  .b-muy-alto { background: #9ae6b4; color: #1a4731; }
  .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #718096; }
</style>
</head>
<body>
<div class="header">
  <h1>Informe de Evaluación BFI-2-XS</h1>
  <p>Inventario Big Five 2 — Versión ultra breve (15 ítems)</p>
</div>
<p class="meta">${esc(candidateLine)} · ${v.resumen.respondidas}/${v.resumen.total} ítems respondidos</p>

<div class="warning">
  <strong>⚠️ Nota importante:</strong> Este informe es una previsualización automática generada por el sistema. Debe ser revisado cuidadosamente por un profesional antes de ser utilizado como documento definitivo. Las categorías descriptivas no constituyen baremos oficiales del BFI-2-XS; son rangos descriptivos basados en el promedio de la escala.
</div>

<h2>1. Datos del evaluado</h2>
<table>
  <tr><th style="width:220px">Nombre completo</th><td>${esc(v.candidato.nombre)}</td></tr>
  <tr><th>Cargo al que se postula</th><td>${esc(v.candidato.cargo || '–')}</td></tr>
  <tr><th>Fecha de aplicación</th><td>${esc(v.candidato.fecha || '–')}</td></tr>
  <tr><th>Cédula / DNI</th><td>${esc(v.candidato.ci || '–')}</td></tr>
  <tr><th>Folio</th><td>${esc(v.candidato.folio)}</td></tr>
</table>

<h2>2. Respuestas en bruto</h2>
<table>
  <thead><tr><th>#</th><th>Ítem</th><th>Dimensión</th><th>Respuesta (1-5)</th></tr></thead>
  <tbody>${brutoRows}</tbody>
</table>

<h2>3. Cálculo con ítems invertidos</h2>
<p>Los ítems inversos (marcados con R) se recodifican con la fórmula: <strong>valor invertido = 6 – respuesta original</strong>.</p>
<table>
  <thead><tr><th>Ítem</th><th>Dimensión</th><th>Respuesta original</th><th>¿Inverso?</th><th>Valor usado</th></tr></thead>
  <tbody>${scoringRows}</tbody>
</table>

<h2>4. Resultados por dimensión</h2>
<table>
  <thead><tr><th>Dimensión</th><th>Promedio</th><th>Nivel</th></tr></thead>
  <tbody>${resumenRows}</tbody>
</table>

<h2>5. Interpretación descriptiva</h2>
${interpBlocks}

<h2>6. Consideraciones para el evaluador</h2>
<ul>
  <li>El BFI-2-XS es una versión ultra breve del Big Five Inventory-2, con 3 ítems por dimensión.</li>
  <li>Solo se recomienda su uso para evaluar los cinco dominios generales, no facetas específicas.</li>
  <li>Los rangos descriptivos son orientativos y no constituyen baremos normativos oficiales.</li>
  <li>Se recomienda complementar esta prueba con otras fuentes de información (entrevista, observación, otras pruebas).</li>
  <li>Revise la coherencia interna de las respuestas y el contexto de aplicación antes de emitir conclusiones.</li>
</ul>

<div class="footer">
  <p><strong>Instrumento:</strong> BFI-2-XS (Soto &amp; John, 2017) — Versión española de Gallardo-Pujol, Oceja, Cortijos-Bernabeu y Rouco.</p>
</div>
</body>
</html>`;
}

module.exports = { generarHtmlBFI };
