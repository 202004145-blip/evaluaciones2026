'use strict';

const { buildReportView, NOMBRE_ESCALA, COLOR_ESCALA } = require('./reportView');

const COLOR_HEX = { D: '#C1443C', I: '#D69A2D', S: '#3E7A5B', C: '#3A5A78' };
const ESCALAS = ['D', 'I', 'S', 'C'];

function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function fichaHtml(f) {
  return `<div class="style-detail">
    <h3 style="color:${COLOR_HEX[f.dim]}">${esc(f.nombre)} (${esc(f.color)})</h3>
    <p class="sub">${esc(f.descripcion)}</p>
    ${f.para_comunicarte_con_ella ? `<h4>Para comunicarte con esta persona</h4><p>${esc(f.para_comunicarte_con_ella)}</p>` : ''}
    ${f.si_te_identificas ? `<h4>Si te identificas con este estilo</h4><p>${esc(f.si_te_identificas)}</p>` : ''}
  </div>`;
}

function generarHtml(datos) {
  const v = buildReportView(datos);
  const r = v.resultado;
  const candidateLine = [v.candidato.nombre, v.candidato.cargo, v.candidato.fecha, `Folio ${v.candidato.folio}`]
    .filter(Boolean)
    .join(' · ');

  const rawBlocks = v.bruto.filas
    .map((f) => {
      const rows = f.palabras
        .map(
          (p) => `<tr>
            <td class="rb-word" style="border-left:3px solid ${COLOR_HEX[p.escala]}">${esc(p.palabra)}</td>
            <td class="rb-mark${p.esMas ? ' mas' : ''}">${p.esMas ? '+' : ''}</td>
            <td class="rb-mark${p.esMenos ? ' menos' : ''}">${p.esMenos ? '−' : ''}</td>
          </tr>`
        )
        .join('');
      return `<div class="rb-block"><table class="rb-table">
        <thead><tr><th class="rb-num">${f.id}</th><th>+</th><th>−</th></tr></thead>
        <tbody>${rows}</tbody></table></div>`;
    })
    .join('');

  const total = (obj) => ESCALAS.reduce((a, l) => a + (obj[l] || 0), 0);
  const calcRow = (l) => `<tr>
      <td style="border-left:4px solid ${COLOR_HEX[l]}"><b>${l}</b> · ${esc(NOMBRE_ESCALA[l])} (${esc(COLOR_ESCALA[l])})</td>
      <td>${r.positivos[l]}</td><td>${r.negativos[l]}</td><td><b>${r.neto[l] > 0 ? '+' + r.neto[l] : r.neto[l]}</b></td>
    </tr>`;
  const calcTabla = `<table class="calc">
    <thead><tr><th>Dimensión</th><th>Positivos (+)</th><th>Negativos (−)</th><th>Neto</th></tr></thead>
    <tbody>${ESCALAS.map(calcRow).join('')}
      <tr class="tot"><td>TOTAL</td><td>${total(r.positivos)}</td><td>${total(r.negativos)}</td><td>${total(r.neto)}</td></tr>
    </tbody></table>`;

  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<title>Resultado DISC — ${esc(v.candidato.nombre)}</title>
<style>
  :root{ --ink:#1C2321; --ink-soft:#5B6360; --line:#CBC9BE; --bg:#FBFAF7; }
  body{ font-family: Georgia, serif; color:var(--ink); background:var(--bg); max-width:860px; margin:0 auto; padding:32px 20px 80px; line-height:1.5; }
  h1{ font-size:26px; border-bottom:2px solid var(--ink); padding-bottom:10px; }
  h2{ font-size:19px; margin-top:34px; }
  h3{ font-size:16px; margin:18px 0 4px; }
  h4{ font-size:12px; text-transform:uppercase; letter-spacing:0.06em; color:var(--ink-soft); margin:14px 0 4px; }
  p{ margin:6px 0; } p.sub{ color:var(--ink-soft); font-size:14px; }
  table{ border-collapse:collapse; width:100%; margin:10px 0 16px; font-size:14px; }
  td,th{ border:1px solid var(--line); padding:6px 10px; text-align:left; }
  th{ background:#ECEEEA; }
  .meta{ color:var(--ink-soft); }
  .highlight{ background:#F4EFE3; border:1px solid #E2D9BF; padding:10px 14px; border-radius:6px; margin:10px 0; }
  .style-detail{ border:1px solid var(--line); border-radius:8px; padding:14px 18px; margin:10px 0; }
  .rb-grid{ display:grid; grid-template-columns:repeat(4,1fr); gap:10px; margin:10px 0 8px; }
  .rb-block{ border:1px solid var(--line); }
  table.rb-table{ width:100%; margin:0; font-size:13px; }
  table.rb-table td, table.rb-table th{ border:none; border-bottom:1px solid var(--line); padding:5px 7px; }
  table.rb-table thead th{ background:#ECEEEA; text-align:center; font-size:12px; }
  table.rb-table th.rb-num{ text-align:left; }
  .rb-word{ text-align:left; }
  .rb-mark{ width:22px; text-align:center; font-weight:bold; color:#B9B7AC; }
  .rb-mark.mas{ background:#3E7A5B; color:#fff; }
  .rb-mark.menos{ background:#C1443C; color:#fff; }
  table.calc td:nth-child(n+2), table.calc th:nth-child(n+2){ text-align:center; }
  table.calc tr.tot td{ background:#ECEEEA; font-weight:bold; }
  @media screen and (max-width:640px){ .rb-grid{ grid-template-columns:repeat(2,1fr); } }
</style>
</head>
<body>
  <h1>DISC© — Estudio de perfil</h1>
  <p class="meta">${esc(candidateLine)}</p>

  <h2>1. Respuestas en bruto</h2>
  <p class="sub">Cada grupo conserva el orden original de sus 4 palabras y marca una como MÁS (+) y una como MENOS (−).</p>
  <div class="rb-grid">${rawBlocks}</div>

  <h2>2. Calificación</h2>
  <p class="sub">Por cada dimensión se cuentan los + y los −; el neto = (# de +) − (# de −).</p>
  ${calcTabla}
  <div class="highlight">
    <p><b>Personalidad predominante</b> (máximo positivo): ${esc(r.maxPositivo.nombres.join(' / ')) || '—'}</p>
    <p><b>Personalidad que evita/repele</b> (máximo negativo): ${esc(r.maxNegativo.nombres.join(' / ')) || '—'}</p>
  </div>

  <h2>3. Interpretación</h2>
  <h3>Personalidad predominante</h3>
  ${v.interpretacion.predominante.map(fichaHtml).join('')}
  <h3>Personalidad que evita/repele</h3>
  ${v.interpretacion.repelida.map(fichaHtml).join('')}
</body>
</html>`;
}

module.exports = { generarHtml };
