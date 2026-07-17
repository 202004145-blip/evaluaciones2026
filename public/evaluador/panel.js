'use strict';

const STYLE_COLOR = { D: 'var(--d)', I: 'var(--i)', S: 'var(--s)', C: 'var(--c)' };

let listaActual = [];

async function cargarListaResultados() {
  const cont = document.getElementById('listaResultados');
  cont.innerHTML = '<div class="admin-empty">Cargando…</div>';
  try {
    const lista = await api('/api/resultados');
    listaActual = lista;
    if (!lista.length) {
      cont.innerHTML = '<div class="admin-empty">Todavía no hay resultados guardados. Aparecerán aquí apenas alguien complete el test.</div>';
      return;
    }
    cont.innerHTML = lista
      .map((r) => {
        const estadoTxt = r.estado === 'completada' ? 'completada' : 'en progreso';
        const badgeClase = r.estado === 'completada' ? 'completada' : 'en-progreso';
        const accionesDerecha =
          r.estado === 'completada'
            ? `<div class="meta" style="cursor:pointer;" data-folio="${r.folio}" data-accion="abrir">patrón: <b>${r.patron_predominante || '—'}</b></div>`
            : `<span class="badge ${badgeClase}">${estadoTxt}</span>`;
        return `<div class="admin-row" data-folio="${r.folio}" data-accion="${r.estado === 'completada' ? 'abrir' : ''}">
          <div style="flex:1; cursor:${r.estado === 'completada' ? 'pointer' : 'default'};" data-folio="${r.folio}" data-accion="${r.estado === 'completada' ? 'abrir' : ''}">
            <div class="name">${escapeHtml(r.nombre)}</div>
            <div class="meta">${r.cargo ? escapeHtml(r.cargo) + ' · ' : ''}${escapeHtml(r.fecha || '')} · folio ${r.folio}</div>
          </div>
          ${accionesDerecha}
          <span id="del-wrap-${r.folio}">
            <button class="btn ghost small" data-folio="${r.folio}" data-accion="pedir-borrar">Borrar</button>
          </span>
        </div>`;
      })
      .join('');

    cont.querySelectorAll('[data-accion="abrir"]').forEach((el) => {
      el.addEventListener('click', () => abrirDetalle(el.dataset.folio));
    });
    cont.querySelectorAll('[data-accion="pedir-borrar"]').forEach((el) => {
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        pedirBorrado(el.dataset.folio);
      });
    });
  } catch (err) {
    cont.innerHTML = `<div class="admin-empty">No se pudieron cargar los resultados guardados. (${escapeHtml(err.message)})</div>`;
  }
}
window.cargarListaResultados = cargarListaResultados;

function pedirBorrado(folio) {
  const wrap = document.getElementById(`del-wrap-${folio}`);
  if (!wrap) return;
  wrap.innerHTML = `
    <span style="font-family:'IBM Plex Mono',monospace; font-size:10.5px; color:var(--d); margin-right:6px;">¿Borrar definitivamente?</span>
    <button class="btn small" style="background:var(--d); border-color:var(--d);" data-folio="${folio}" data-accion="confirmar-borrar">Sí, borrar</button>
    <button class="btn ghost small" data-folio="${folio}" data-accion="cancelar-borrar">Cancelar</button>`;
  wrap.querySelector('[data-accion="confirmar-borrar"]').addEventListener('click', (e) => {
    e.stopPropagation();
    confirmarBorrado(folio);
  });
  wrap.querySelector('[data-accion="cancelar-borrar"]').addEventListener('click', (e) => {
    e.stopPropagation();
    cargarListaResultados();
  });
}

async function confirmarBorrado(folio) {
  const wrap = document.getElementById(`del-wrap-${folio}`);
  if (wrap) wrap.innerHTML = `<span style="font-family:'IBM Plex Mono',monospace; font-size:10.5px; color:var(--ink-soft);">Borrando…</span>`;
  try {
    await api(`/api/resultados/${folio}`, { method: 'DELETE' });
  } catch (err) {
    console.error('Error al borrar:', err);
  }
  cargarListaResultados();
}

function escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function levelMeterHtml(level) {
  let segs = '';
  for (let n = 1; n <= 7; n++) segs += `<div class="level-seg ${n <= level ? 'on' : ''}"></div>`;
  return `<div class="level-meter">${segs}</div><div class="level-label">Nivel ${level} / 7</div>`;
}

function graphRowsHtml(tallies, levels, maxAbs) {
  return ['D', 'I', 'S', 'C']
    .map((l) => {
      const val = tallies[l];
      const pct = Math.max(0, Math.min(100, (val / maxAbs) * 100));
      return `<div class="graph-row">
        <div class="graph-tag" style="color:${STYLE_COLOR[l]}">${l}<span class="full">${NOMBRE_ESCALA[l]}</span></div>
        <div class="graph-track"><div class="graph-fill" style="width:${pct}%; background:${STYLE_COLOR[l]}"></div></div>
        <div class="graph-val">${val}</div>
        <div class="level-col">${levelMeterHtml(levels[l])}</div>
      </div>`;
    })
    .join('');
}

function diffRowsHtml(diferencia, levels) {
  return ['D', 'I', 'S', 'C']
    .map((l) => {
      const val = diferencia[l];
      const pct = Math.min(100, (Math.abs(val) / 28) * 50);
      const positivo = val >= 0;
      return `<div class="graph-row">
        <div class="graph-tag" style="color:${STYLE_COLOR[l]}">${l}<span class="full">${NOMBRE_ESCALA[l]}</span></div>
        <div class="diff-track"><div class="diff-fill" style="background:${STYLE_COLOR[l]}; ${positivo ? `left:50%;width:${pct}%;` : `right:50%;width:${pct}%;`}"></div></div>
        <div class="graph-val">${val > 0 ? '+' + val : val}</div>
        <div class="level-col">${levelMeterHtml(levels[l])}</div>
      </div>`;
    })
    .join('');
}

const NOMBRE_ESCALA = { D: 'Dominante', I: 'Influyente', S: 'Estable', C: 'Concienzudo' };

function fichaHtml(ficha) {
  if (!ficha) {
    return `<div class="notice-box"><b>Patrón no disponible</b>Este código específico no está documentado en la tabla de interpretación original (es uno de los pocos códigos que faltaban en la fuente). Usa la sección de estilo predominante y las descripciones de los patrones clásicos para una interpretación manual.</div>`;
  }
  const dl = ficha.campos.map(([k, v]) => `<dt>${escapeHtml(k)}</dt><dd>${escapeHtml(v)}.</dd>`).join('');
  const narrativa = ficha.narrativa.map((t) => `<p>${escapeHtml(t)}</p>`).join('');
  return `<div class="pattern-detail"><dl>${dl}</dl><div class="narrativa">${narrativa}</div></div>`;
}

function construirDetalleHtml(folio, datos) {
  const { candidato, bruto, correccion, interpretacion, referenciaPatrones } = datos;

  const rawRows = bruto.detalle
    .map(
      (d) => `<tr>
        <td>${d.id}</td>
        <td>${escapeHtml(Object.values(d.palabras).join(' · '))}</td>
        <td><span class="pill" style="background:${STYLE_COLOR[d.mas]}">${d.mas}</span> ${escapeHtml(d.palabra_mas)}</td>
        <td><span class="pill" style="background:${STYLE_COLOR[d.menos]}">${d.menos}</span> ${escapeHtml(d.palabra_menos)}</td>
      </tr>`
    )
    .join('');
  const rawSection = `
    <div class="section-kicker">1. Resultados en bruto</div>
    <div class="section-title">Pregunta y respuesta (28 ítems)</div>
    <table class="detail-table">
      <thead><tr><th>#</th><th>Palabras del grupo</th><th>Elegido MÁS</th><th>Elegido MENOS</th></tr></thead>
      <tbody>${rawRows}</tbody>
    </table>`;

  const correctionSection = `
    <div class="section-kicker">2. Corrección</div>
    <div class="section-title">Conteo y nivel por gráfica</div>
    <div class="graph-card">
      <h3>Gráfica I · MÁS</h3>
      <div class="sub">Conteo (0–28) y nivel oficial de conversión (1–7), según la tabla del instrumento.</div>
      ${graphRowsHtml(correccion.tallyMas, correccion.levels.I, 28)}
      <div class="code-strip"><span class="code-chip">Código: ${correccion.codes.I}</span></div>
    </div>
    <div class="graph-card">
      <h3>Gráfica II · MENOS</h3>
      <div class="sub">Conteo (0–28) y nivel oficial de conversión (1–7).</div>
      ${graphRowsHtml(correccion.tallyMenos, correccion.levels.II, 28)}
      <div class="code-strip"><span class="code-chip">Código: ${correccion.codes.II}</span></div>
    </div>
    <div class="graph-card">
      <h3>Gráfica III · Diferencia (MÁS − MENOS)</h3>
      <div class="sub">Diferencia y nivel oficial de conversión (1–7). Esta gráfica es la base de la interpretación del patrón.</div>
      ${diffRowsHtml(correccion.diferencia, correccion.levels.III)}
      <div class="code-strip"><span class="code-chip">Código de perfil: ${correccion.codes.III}</span></div>
    </div>`;

  let patternBlock;
  if (interpretacion.esSuperactivo) {
    patternBlock = `
      <div class="pattern-card">
        <div class="kicker">Patrón clásico (Gráfica III)</div>
        <div class="num">Superactivo</div>
        <div class="desc">Los cuatro estilos obtuvieron niveles igualmente altos en la Gráfica III, por lo que no concuerda con ningún Patrón Clásico. La fuente recomienda interpretar usando la Gráfica I o la Gráfica II en su lugar.</div>
      </div>
      ${fichaHtml(interpretacion.fichaPrincipal)}
      <div class="section-kicker" style="margin-top:0;">Alternativas según Gráfica I y II</div>
      <div class="pattern-detail">
        <dl>
          <dt>Patrón según Gráfica I (MÁS) — código ${interpretacion.codeI}</dt><dd>${escapeHtml(interpretacion.patternI || 'No disponible en la tabla')}</dd>
          <dt>Patrón según Gráfica II (MENOS) — código ${interpretacion.codeII}</dt><dd>${escapeHtml(interpretacion.patternII || 'No disponible en la tabla')}</dd>
        </dl>
      </div>`;
  } else {
    patternBlock = `
      <div class="pattern-card">
        <div class="kicker">Patrón clásico (Gráfica III) · código ${interpretacion.codeIII}</div>
        <div class="num">${escapeHtml(interpretacion.patternIII || 'No determinado')}</div>
        <div class="desc">Clasificación obtenida cruzando el código de niveles D-I-S-C de la Gráfica III con la tabla oficial de interpretación.</div>
      </div>
      ${fichaHtml(interpretacion.fichaPrincipal)}`;
  }

  const styleBlocks = interpretacion.estilos
    .map(
      (s) => `<div class="style-detail">
      <h3 style="font-family:'Source Serif 4',serif; font-size:17px; margin:0; color:${STYLE_COLOR[s.nombre[0]]}">${escapeHtml(s.nombre)}</h3>
      <p style="color:var(--ink-soft); font-size:13.5px; margin:8px 0 0;">${escapeHtml(s.descripcion)}</p>
      <h4>Tendencias</h4><ul>${s.tendencias.map((t) => `<li>${escapeHtml(t)}</li>`).join('')}</ul>
      <h4>Ambiente deseado</h4><ul>${s.ambiente_deseado.map((t) => `<li>${escapeHtml(t)}</li>`).join('')}</ul>
      <h4>Necesita que otros…</h4><ul>${s.necesita_de_otros.map((t) => `<li>${escapeHtml(t)}</li>`).join('')}</ul>
      <h4>Para ser más eficaz, necesita…</h4><ul>${s.para_ser_mas_eficaz.map((t) => `<li>${escapeHtml(t)}</li>`).join('')}</ul>
    </div>`
    )
    .join('');

  const referencia = referenciaPatrones
    .map(
      (p) => `<div class="pattern-detail" style="padding:14px 16px;"><b style="font-family:'Source Serif 4',serif;">${escapeHtml(p.nombre)}</b><p style="font-size:12.5px; color:var(--ink-soft); margin:6px 0 0;">${escapeHtml(p.narrativa)}</p></div>`
    )
    .join('');

  const interpretationSection = `
    <div class="section-kicker">3. Interpretación</div>
    <div class="section-title">Patrón clásico y estilo predominante</div>
    ${patternBlock}
    <div class="section-kicker">Estilo de comportamiento predominante (D/I/S/C): ${escapeHtml(interpretacion.predNombres.join(' / '))}</div>
    ${styleBlocks}
    <details class="tech">
      <summary>Ver las descripciones de los 17 patrones / resultados posibles</summary>
      <div class="body">${referencia}</div>
    </details>`;

  const header = `
    <div style="margin-bottom:20px;">
      <b style="font-size:16px; color:var(--ink); font-family:'Source Serif 4',serif;">${escapeHtml(candidato.nombre)}</b><br>
      <span style="font-family:'IBM Plex Mono',monospace; font-size:11px; color:var(--ink-soft);">${escapeHtml([candidato.cargo, candidato.fecha, 'Folio ' + candidato.folio].filter(Boolean).join(' · '))}</span>
    </div>`;

  const actions = `
    <div class="btn-row" style="margin-top:26px;">
      <a class="btn ghost small" href="/api/exportar/${folio}/html" target="_blank" rel="noopener">Exportar página (HTML)</a>
      <a class="btn ghost small" href="/api/exportar/${folio}/docx">Descargar Word</a>
      <a class="btn ghost small" href="/api/exportar/${folio}/xlsx">Descargar Excel</a>
      <a class="btn ghost small" href="/api/exportar/${folio}/json">Descargar JSON</a>
      <span id="del-wrap-detail-${folio}" style="margin-left:auto;">
        <button class="btn ghost small" style="color:var(--d); border-color:var(--d);" data-accion="pedir-borrar-detalle">Borrar registro</button>
      </span>
    </div>`;

  return header + rawSection + correctionSection + interpretationSection + actions;
}

async function abrirDetalle(folio) {
  mostrarVista('detailView');
  const cont = document.getElementById('detalleContenido');
  cont.innerHTML = '<div class="admin-empty">Cargando…</div>';
  try {
    const datos = await api(`/api/resultados/${folio}`);
    cont.innerHTML = construirDetalleHtml(folio, datos);
    const wrap = document.getElementById(`del-wrap-detail-${folio}`);
    wrap.querySelector('[data-accion="pedir-borrar-detalle"]').addEventListener('click', () => pedirBorradoDetalle(folio));
  } catch (err) {
    cont.innerHTML = `<div class="admin-empty">No se pudo cargar el detalle. (${escapeHtml(err.message)})</div>`;
  }
}

function pedirBorradoDetalle(folio) {
  const wrap = document.getElementById(`del-wrap-detail-${folio}`);
  if (!wrap) return;
  wrap.innerHTML = `
    <span style="font-family:'IBM Plex Mono',monospace; font-size:10.5px; color:var(--d); margin-right:6px;">¿Borrar definitivamente este registro?</span>
    <button class="btn small" style="background:var(--d); border-color:var(--d);" data-accion="confirmar">Sí, borrar</button>
    <button class="btn ghost small" data-accion="cancelar">Cancelar</button>`;
  wrap.querySelector('[data-accion="confirmar"]').addEventListener('click', async () => {
    wrap.innerHTML = `<span style="font-family:'IBM Plex Mono',monospace; font-size:10.5px; color:var(--ink-soft);">Borrando…</span>`;
    try {
      await api(`/api/resultados/${folio}`, { method: 'DELETE' });
    } catch (err) {
      console.error('Error al borrar:', err);
    }
    volverALista();
  });
  wrap.querySelector('[data-accion="cancelar"]').addEventListener('click', () => {
    wrap.innerHTML = `<button class="btn ghost small" style="color:var(--d); border-color:var(--d);" data-accion="pedir-borrar-detalle">Borrar registro</button>`;
    wrap.querySelector('[data-accion="pedir-borrar-detalle"]').addEventListener('click', () => pedirBorradoDetalle(folio));
  });
}

function volverALista() {
  mostrarVista('listView');
  cargarListaResultados();
}

document.getElementById('btnVolverLista').addEventListener('click', volverALista);
