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

  // Tabla "Hoja de respuestas" de Marian Gamboa: ítems en filas, dimensiones
  // D/I/S/C en columnas, con la suma vertical al pie.
  const detalle = (v.bruto.detalle || []).slice().sort((a, b) => a.id - b.id);
  const total = (obj) => ESCALAS.reduce((a, l) => a + (obj[l] || 0), 0);
  const hojaFilas = detalle
    .map((d) => {
      const celdas = ESCALAS.map((l) => {
        const cls = d.mas === l ? ' mas' : d.menos === l ? ' menos' : '';
        const badge = d.mas === l ? ' <b>+</b>' : d.menos === l ? ' <b>−</b>' : '';
        return `<td class="cell${cls}">${esc(d.palabras[l])}${badge}</td>`;
      }).join('');
      return `<tr><td class="itnum">${d.id}</td>${celdas}</tr>`;
    })
    .join('');
  const hojaSum = (label, obj, strong) =>
    `<tr class="sum${strong ? ' neto' : ''}"><td>${label}</td>${ESCALAS.map(
      (l) => `<td style="color:${COLOR_HEX[l]}">${obj[l] > 0 && strong ? '+' + obj[l] : obj[l]}</td>`
    ).join('')}</tr>`;
  const hojaGamboa = `<div class="hoja-wrap"><table class="hoja">
      <thead><tr><th>Ítem</th>${ESCALAS.map(
        (l) => `<th style="background:${COLOR_HEX[l]};color:#fff">${l} · ${NOMBRE_ESCALA[l]} (${COLOR_ESCALA[l]})</th>`
      ).join('')}</tr></thead>
      <tbody>${hojaFilas}</tbody>
      <tfoot>${hojaSum('Positivos (+)', r.positivos, false)}${hojaSum('Negativos (−)', r.negativos, false)}${hojaSum('Neto (+ − −)', r.neto, true)}</tfoot>
    </table></div>`;
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
  .hoja-wrap{ overflow-x:auto; }
  table.hoja{ font-size:12.5px; min-width:640px; }
  table.hoja .itnum{ text-align:center; font-weight:bold; color:var(--ink-soft); }
  table.hoja td.cell.mas{ background:#e7f1ec; }
  table.hoja td.cell.menos{ background:#fbeae8; }
  table.hoja td.cell b{ display:inline-block; min-width:14px; text-align:center; border-radius:4px; padding:0 3px; color:#fff; }
  table.hoja td.cell.mas b{ background:#3E7A5B; }
  table.hoja td.cell.menos b{ background:#C1443C; }
  table.hoja tfoot tr.sum td{ background:#ECEEEA; font-weight:bold; text-align:center; }
  table.hoja tfoot tr.sum td:first-child{ text-align:right; }
  table.calc td:nth-child(n+2), table.calc th:nth-child(n+2){ text-align:center; }
  table.calc tr.tot td{ background:#ECEEEA; font-weight:bold; }
</style>
</head>
<body>
  <h1>DISC© — Estudio de perfil</h1>
  <p class="meta">${esc(candidateLine)}</p>

  <h2>1. Respuestas (Hoja de respuestas — Marian Gamboa)</h2>
  <p class="sub">Cada ítem en su fila y cada dimensión D/I/S/C en su columna. Se marca la palabra elegida como MÁS (+) o MENOS (−); al pie se suma verticalmente cada columna.</p>
  ${hojaGamboa}

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
