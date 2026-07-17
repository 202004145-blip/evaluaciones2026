'use strict';

const { buildReportViewIPV } = require('../reportView');

function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function tablaHtml(encabezados, filas) {
  return `<table><thead><tr>${encabezados.map((h) => `<th>${esc(h)}</th>`).join('')}</tr></thead>
    <tbody>${filas.map((f) => `<tr>${f.map((c) => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
}

function generarHtmlIPV(datos) {
  const v = buildReportViewIPV(datos);
  const candidateLine = [v.candidato.nombre, v.candidato.cargo, v.candidato.fecha, `Folio ${v.candidato.folio}`]
    .filter(Boolean)
    .join(' · ');

  const rawRows = v.bruto.detalle.map((d) => [
    d.n,
    d.texto,
    d.respuesta || '—',
    d.clave,
    d.acierto ? 'Sí' : 'No',
  ]);

  const scoreRows = v.filas.map((f) => [
    f.corta,
    f.nombre.split('—').slice(1).join('—').trim() || f.nombre,
    f.pd,
    f.max ?? '—',
    f.decatipo,
    f.nivel.label,
  ]);

  const interpBlocks = v.filas
    .map(
      (f) => `<div class="interp ${f.nivel.cat}">
      <h3>${esc(f.nombre)} ${f.esGlobal ? '<span class="tag">global</span>' : ''}</h3>
      <p class="metrics">PD ${f.pd}${f.max != null ? '/' + f.max : ''} · Decatipo ${f.decatipo}/10 · <b>${esc(f.nivel.label)}</b></p>
      <p>${esc(f.descripcion)}</p>
    </div>`
    )
    .join('');

  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<title>Resultado IPV — ${esc(v.candidato.nombre)}</title>
<style>
  :root{ --ink:#1B1B1F; --ink-soft:#5B6360; --line:#CBC9BE; --bg:#FBFAF7; --accent:#23405C; }
  body{ font-family: Georgia, 'Source Serif 4', serif; color:var(--ink); background:var(--bg); max-width:880px; margin:0 auto; padding:32px 20px 80px; line-height:1.5; }
  h1{ font-size:26px; border-bottom:2px solid var(--ink); padding-bottom:10px; }
  h2{ font-size:19px; margin-top:34px; }
  h3{ font-size:16px; margin:0 0 4px; }
  p{ margin:6px 0; }
  p.meta{ color:var(--ink-soft); }
  p.metrics{ color:var(--ink-soft); font-size:13px; }
  table{ border-collapse:collapse; width:100%; margin:10px 0 16px; font-size:13.5px; }
  td,th{ border:1px solid var(--line); padding:6px 10px; text-align:left; vertical-align:top; }
  th{ background:#ECEEEA; }
  .interp{ border:1px solid var(--line); border-left:4px solid var(--accent); border-radius:6px; padding:12px 16px; margin:8px 0; }
  .interp.bajo{ border-left-color:#A44A2E; }
  .interp.medio{ border-left-color:#8B7043; }
  .interp.alto{ border-left-color:#4E6B3E; }
  .tag{ font-size:10px; text-transform:uppercase; letter-spacing:.06em; background:#E8EEF4; color:var(--accent); padding:2px 6px; border-radius:3px; vertical-align:middle; }
  .notice{ background:#FEF3C7; border:1px solid #E4B84A; color:#78350F; padding:12px 16px; border-radius:6px; font-size:13px; }
  @media print { body{ background:#fff; } }
</style>
</head>
<body>
  <h1>Inventario de Personalidad para Vendedores (IPV)</h1>
  <p class="meta">${esc(candidateLine)}</p>
  <p class="meta">Respondidas: ${v.resumen.respondidas}/${v.resumen.total} · Aciertos con la clave: ${v.resumen.aciertos}</p>

  <h2>1. Preguntas y respuestas</h2>
  ${tablaHtml(['#', 'Enunciado', 'Resp.', 'Clave', 'Puntúa'], rawRows)}

  <h2>2. Puntuaciones directas y decatipos</h2>
  ${tablaHtml(['Escala', 'Nombre', 'PD', 'Máx.', 'Decatipo', 'Nivel'], scoreRows)}
  <p class="meta"><b>PD</b> = puntuación directa · <b>Decatipo</b> = valor tipificado 1–10 (media 5.5). Bajo: 1–3 · Medio: 4–7 · Alto: 8–10.</p>

  <h2>3. Interpretación del perfil</h2>
  ${interpBlocks}
  <p class="notice"><b>Nota metodológica.</b> La corrección usa los baremos mexicanos del manual del IPV (n = 300) y una asignación pregunta-escala basada en el análisis de contenidos del manual. Para selección de alta consecuencia se recomienda contrastar con la plantilla oficial del editor.</p>
</body>
</html>`;
}

module.exports = { generarHtmlIPV };
