'use strict';

const { buildReportView } = require('./reportView');

const COLOR_ESCALA = { D: '#C1443C', I: '#D69A2D', S: '#3E7A5B', C: '#3A5A78' };

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

function fichaHtml(ficha) {
  if (!ficha) {
    return `<p class="notice">Este código específico no está documentado en la tabla de interpretación original (es uno de los pocos códigos que faltaban en la fuente). Usa la sección de estilo predominante y las descripciones de los patrones clásicos para una interpretación manual.</p>`;
  }
  const dl = ficha.campos.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}.</dd>`).join('');
  const narrativa = ficha.narrativa.map((t) => `<p>${esc(t)}</p>`).join('');
  return `<dl>${dl}</dl>${narrativa}`;
}

function generarHtml(datos) {
  const v = buildReportView(datos);
  const candidateLine = [v.candidato.nombre, v.candidato.cargo, v.candidato.fecha, `Folio ${v.candidato.folio}`]
    .filter(Boolean)
    .join(' · ');

  const rawRows = v.bruto.detalle.map((d) => [
    d.id,
    Object.values(d.palabras).join(' · '),
    `${d.mas} — ${d.palabra_mas}`,
    `${d.menos} — ${d.palabra_menos}`,
  ]);

  const graphTable = (tallies, levels) =>
    tablaHtml(
      ['Escala', 'Conteo', 'Nivel (1-7)'],
      ['D', 'I', 'S', 'C'].map((l) => [l, tallies[l], levels[l]])
    );
  const diffTable = tablaHtml(
    ['Escala', 'Diferencia', 'Nivel (1-7)'],
    ['D', 'I', 'S', 'C'].map((l) => [l, v.correccion.diferencia[l], v.correccion.levels.III[l]])
  );

  let patternHtml;
  if (v.interpretacion.esSuperactivo) {
    patternHtml = `<p><b>Superactivo</b> — los cuatro estilos obtuvieron niveles igualmente altos en la Gráfica III; no concuerda con ningún Patrón Clásico. Se recomienda interpretar usando la Gráfica I o II.</p>
      ${fichaHtml(v.interpretacion.fichaPrincipal)}
      <p><b>Alternativa según Gráfica I</b> (código ${esc(v.interpretacion.codeI)}): ${esc(v.interpretacion.patternI || 'no disponible')}</p>
      <p><b>Alternativa según Gráfica II</b> (código ${esc(v.interpretacion.codeII)}): ${esc(v.interpretacion.patternII || 'no disponible')}</p>`;
  } else {
    patternHtml = `<p><b>${esc(v.interpretacion.patternIII || 'No determinado')}</b> — código de perfil ${esc(v.interpretacion.codeIII)}</p>${fichaHtml(v.interpretacion.fichaPrincipal)}`;
  }

  const styleBlocks = v.interpretacion.estilos
    .map(
      (s) => `<div class="style-detail">
      <h3 style="color:${COLOR_ESCALA[s.nombre[0]]}">${esc(s.nombre)}</h3>
      <p class="sub">${esc(s.descripcion)}</p>
      <h4>Tendencias</h4><ul>${s.tendencias.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>
      <h4>Ambiente deseado</h4><ul>${s.ambiente_deseado.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>
      <h4>Necesita que otros…</h4><ul>${s.necesita_de_otros.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>
      <h4>Para ser más eficaz, necesita…</h4><ul>${s.para_ser_mas_eficaz.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>
    </div>`
    )
    .join('');

  const referencia = v.referenciaPatrones
    .map(
      (p) => `<div class="pattern-detail"><b>${esc(p.nombre)}</b><p class="sub">${esc(p.narrativa)}</p></div>`
    )
    .join('');

  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<title>Resultado DISC — ${esc(v.candidato.nombre)}</title>
<style>
  :root{ --ink:#1C2321; --ink-soft:#5B6360; --line:#CBC9BE; --bg:#FBFAF7; }
  body{ font-family: Georgia, 'Source Serif 4', serif; color:var(--ink); background:var(--bg); max-width:860px; margin:0 auto; padding:32px 20px 80px; line-height:1.5; }
  h1{ font-size:26px; border-bottom:2px solid var(--ink); padding-bottom:10px; }
  h2{ font-size:19px; margin-top:34px; }
  h3{ font-size:16px; margin:18px 0 4px; }
  h4{ font-size:12px; text-transform:uppercase; letter-spacing:0.06em; color:var(--ink-soft); margin:14px 0 4px; }
  p{ margin:6px 0; }
  p.sub{ color:var(--ink-soft); font-size:14px; }
  ul{ margin:2px 0 10px; padding-left:20px; }
  table{ border-collapse:collapse; width:100%; margin:10px 0 16px; font-size:14px; }
  td,th{ border:1px solid var(--line); padding:6px 10px; text-align:left; }
  th{ background:#ECEEEA; }
  dt{ font-weight:bold; margin-top:8px; }
  dd{ margin:0 0 4px; }
  .meta{ color:var(--ink-soft); }
  .notice{ background:#F4EFE3; border:1px solid #E2D9BF; padding:10px 14px; border-radius:6px; }
  .pattern-detail{ border:1px solid var(--line); border-radius:8px; padding:12px 16px; margin:8px 0; }
  .style-detail{ border:1px solid var(--line); border-radius:8px; padding:14px 18px; margin:10px 0; }
  details{ margin-top:20px; }
  @media print { body{ background:#fff; } }
</style>
</head>
<body>
  <h1>Sistema de Perfil Personal (DISC)</h1>
  <p class="meta">${esc(candidateLine)}</p>

  <h2>1. Resultados en bruto</h2>
  ${tablaHtml(['#', 'Palabras del grupo', 'Elegido MÁS', 'Elegido MENOS'], rawRows)}

  <h2>2. Corrección</h2>
  <h3>Gráfica I · MÁS</h3>
  ${graphTable(v.correccion.tallyMas, v.correccion.levels.I)}
  <p class="meta">Código: ${esc(v.correccion.codes.I)}</p>
  <h3>Gráfica II · MENOS</h3>
  ${graphTable(v.correccion.tallyMenos, v.correccion.levels.II)}
  <p class="meta">Código: ${esc(v.correccion.codes.II)}</p>
  <h3>Gráfica III · Diferencia (MÁS − MENOS)</h3>
  ${diffTable}
  <p class="meta">Código de perfil: ${esc(v.correccion.codes.III)}</p>

  <h2>3. Interpretación</h2>
  <h3>Patrón clásico</h3>
  ${patternHtml}
  <h3>Estilo de comportamiento predominante: ${esc(v.interpretacion.predNombres.join(' / '))}</h3>
  ${styleBlocks}

  <details>
    <summary>Ver las descripciones de los 17 patrones / resultados posibles</summary>
    ${referencia}
  </details>
</body>
</html>`;
}

module.exports = { generarHtml };
