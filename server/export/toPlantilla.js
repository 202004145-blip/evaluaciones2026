'use strict';

// Genera una "hoja en blanco" imprimible del DISC© (modelo Marian Gamboa) para
// aplicar el test en papel. Incluye dos hojas:
//   1. Hoja del test (Hoja de análisis): los 28 ítems con sus 4 palabras y
//      casillas MÁS (+) / MENOS (−). NO revela a qué dimensión pertenece cada
//      palabra: es la hoja que se entrega al postulante.
//   2. Hoja de corrección (Hoja de respuestas): tabla ítem × D/I/S/C con las
//      palabras y la sumatoria por dimensión, para que el evaluador transfiera
//      las marcas y sume a mano. Esta hoja sí muestra la clave, por eso la
//      descarga está protegida con login.

const { ITEMS, ESCALAS } = require('../scoring/gamboa');
const { NOMBRE_ESCALA, COLOR_ESCALA } = require('./reportView');

const COLOR_HEX = { D: '#C1443C', I: '#D69A2D', S: '#3E7A5B', C: '#3A5A78' };

function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function generarPlantillaHtml() {
  // --- Hoja 1: test en blanco (sin revelar dimensiones) ---
  const itemBlock = (item) => {
    const orden = Array.isArray(item.orden) && item.orden.length === 4 ? item.orden : ESCALAS;
    const filas = orden
      .map(
        (l) => `<tr>
          <td class="w">${esc(item.palabras[l])}</td>
          <td class="bx"></td>
          <td class="bx"></td>
        </tr>`
      )
      .join('');
    return `<table class="t-item">
      <thead><tr><th class="num">${item.id}</th><th class="hh">Más +</th><th class="hh">Menos −</th></tr></thead>
      <tbody>${filas}</tbody>
    </table>`;
  };
  const testBlocks = ITEMS.map(itemBlock).join('');

  // --- Hoja 2: corrección en blanco (con la clave por dimensión) ---
  const corrFilas = ITEMS.map((item) => {
    const celdas = ESCALAS.map((l) => `<td class="cc">${esc(item.palabras[l])} <span class="mk"></span></td>`).join('');
    return `<tr><td class="itn">${item.id}</td>${celdas}</tr>`;
  }).join('');
  const sumRow = (label) =>
    `<tr class="sum"><td>${label}</td>${ESCALAS.map(() => '<td></td>').join('')}</tr>`;

  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<title>DISC© — Hoja en blanco para imprimir</title>
<style>
  :root{ --ink:#1C2321; --soft:#5B6360; --line:#9a988e; }
  *{ box-sizing:border-box; }
  body{ font-family: Georgia, serif; color:var(--ink); margin:0; padding:24px 26px 60px; line-height:1.35; }
  h1{ font-size:22px; margin:0 0 2px; }
  h2{ font-size:16px; margin:24px 0 6px; border-bottom:1px solid var(--ink); padding-bottom:4px; }
  p.sub{ color:var(--soft); font-size:12.5px; margin:4px 0 10px; }
  .datos{ font-size:12.5px; margin:8px 0 4px; }
  .datos span{ display:inline-block; margin-right:18px; }
  .print-hint{ background:#F4EFE3; border:1px solid #E2D9BF; padding:8px 12px; border-radius:6px; font-size:12px; margin:8px 0 4px; }
  @media print { .print-hint{ display:none; } }

  /* Hoja 1: test */
  .test-grid{ display:grid; grid-template-columns:repeat(4,1fr); gap:8px 12px; }
  table.t-item{ border-collapse:collapse; width:100%; font-size:11px; page-break-inside:avoid; }
  table.t-item th, table.t-item td{ border:1px solid var(--line); padding:2px 4px; }
  table.t-item th.num{ text-align:left; background:#ECEEEA; font-size:12px; }
  table.t-item th.hh{ font-size:8.5px; font-weight:normal; color:var(--soft); text-align:center; width:30px; }
  table.t-item td.w{ text-align:left; }
  table.t-item td.bx{ width:30px; height:16px; }

  /* Hoja 2: corrección */
  .sheet2{ page-break-before:always; }
  table.corr{ border-collapse:collapse; width:100%; font-size:11px; }
  table.corr th, table.corr td{ border:1px solid var(--line); padding:3px 6px; text-align:left; }
  table.corr thead th{ color:#fff; font-size:10.5px; }
  table.corr td.itn{ text-align:center; font-weight:bold; color:var(--soft); width:34px; }
  table.corr td.cc .mk{ display:inline-block; float:right; width:22px; height:13px; border:1px solid var(--line); border-radius:3px; }
  table.corr tr.sum td{ background:#ECEEEA; font-weight:bold; height:20px; }
  table.corr tr.sum td:first-child{ text-align:right; }
  .concl{ font-size:12.5px; margin-top:10px; }
  .concl div{ margin:6px 0; }
</style>
</head>
<body>
  <div class="print-hint">Para imprimir: usa Ctrl/Cmd + P. La primera hoja es el test (se entrega al postulante); la segunda es la corrección (uso del evaluador — muestra la clave).</div>

  <h1>DISC© — Estudio de perfil</h1>
  <p class="sub">© 2019 Marian Gamboa — Formación Creativa para Trascender</p>

  <h2>Hoja del test</h2>
  <div class="datos"><span>Nombre: ____________________________________</span><span>Cargo: __________________</span><span>Fecha: ____________</span></div>
  <p class="sub">En cada grupo de 4 palabras, marca con una <b>X</b> la que MÁS (+) te describe y la que MENOS (−) te describe. Solo una MÁS y una MENOS por grupo. Contesta con rapidez y espontaneidad; no hay respuestas buenas ni malas.</p>
  <div class="test-grid">${testBlocks}</div>

  <div class="sheet2">
    <h2>Hoja de corrección (uso del evaluador)</h2>
    <div class="datos"><span>Nombre: ____________________________________</span><span>Folio: __________</span></div>
    <p class="sub">Transfiere del test cada MÁS (+) y cada MENOS (−) a la casilla de la columna correspondiente. Luego suma verticalmente cada columna: positivos, negativos y el neto (positivos − negativos).</p>
    <table class="corr">
      <thead><tr><th>Ítem</th>${ESCALAS.map(
        (l) => `<th style="background:${COLOR_HEX[l]}">${l} · ${esc(NOMBRE_ESCALA[l])} (${esc(COLOR_ESCALA[l])})</th>`
      ).join('')}</tr></thead>
      <tbody>${corrFilas}</tbody>
      <tfoot>
        ${sumRow('Positivos (+)')}
        ${sumRow('Negativos (−)')}
        ${sumRow('Neto (+ − −)')}
      </tfoot>
    </table>
    <div class="concl">
      <div><b>Dimensión con más positivos</b> (personalidad predominante): __________________________________</div>
      <div><b>Dimensión con más negativos</b> (personalidad que evita/repele): __________________________________</div>
    </div>
  </div>
</body>
</html>`;
}

module.exports = { generarPlantillaHtml };
