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

const NOMBRE_ESCALA = { D: 'Dominante', I: 'Influyente', S: 'Sereno / Estable', C: 'Concienzudo' };
const COLOR_ESCALA = { D: 'Rojo', I: 'Amarillo', S: 'Verde', C: 'Azul' };

function fichaColorHtml(f) {
  return `<div class="style-detail">
      <h3 style="font-family:'Source Serif 4',serif; font-size:17px; margin:0; color:${STYLE_COLOR[f.dim]}">${escapeHtml(f.nombre)} (${escapeHtml(f.color)})</h3>
      <p style="color:var(--ink-soft); font-size:13.5px; margin:8px 0 0;">${escapeHtml(f.descripcion)}</p>
      ${f.para_comunicarte_con_ella ? `<h4>Para comunicarte con esta persona</h4><p style="font-size:13px; margin:2px 0 0;">${escapeHtml(f.para_comunicarte_con_ella)}</p>` : ''}
      ${f.si_te_identificas ? `<h4>Si te identificas con este estilo</h4><p style="font-size:13px; margin:2px 0 0;">${escapeHtml(f.si_te_identificas)}</p>` : ''}
    </div>`;
}

function construirDetalleHtml(folio, datos) {
  const { candidato, bruto, resultado, interpretacion } = datos;

  const filas = bruto.filas || [];
  const rawBlocks = filas
    .map((f) => {
      const rows = f.palabras
        .map(
          (p) => `<tr>
            <td class="rb-word" style="border-left:3px solid ${STYLE_COLOR[p.escala]}">${escapeHtml(p.palabra)}</td>
            <td class="rb-mark${p.esMas ? ' mas-on' : ''}">${p.esMas ? '+' : ''}</td>
            <td class="rb-mark${p.esMenos ? ' menos-on' : ''}">${p.esMenos ? '−' : ''}</td>
          </tr>`
        )
        .join('');
      return `<div class="rb-block">
        <table class="rb-table">
          <thead><tr><th class="rb-num">${f.id}</th><th>+</th><th>−</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`;
    })
    .join('');

  const rawSection = `
    <div class="section-kicker">1. Respuestas en bruto</div>
    <div class="section-title">Formato de la hoja DISC (28 grupos de 4 palabras)</div>
    <p class="rb-hint">Cada grupo conserva el orden de las palabras de la hoja original. Se marca una palabra como MÁS (+) y una como MENOS (−). Las puntuaciones solo se muestran aquí, en el panel del evaluador.</p>
    <div class="rb-grid">${rawBlocks}</div>`;

  const total = (obj) => ['D', 'I', 'S', 'C'].reduce((a, l) => a + (obj[l] || 0), 0);
  const calcRow = (l) => {
    const neto = resultado.neto[l];
    return `<tr>
      <td class="rb-sum-label" style="border-left:4px solid ${STYLE_COLOR[l]}; text-align:left;"><b>${l}</b> · ${NOMBRE_ESCALA[l]} <span style="color:var(--ink-soft)">(${COLOR_ESCALA[l]})</span></td>
      <td class="rb-sum-mas" style="color:var(--s)">${resultado.positivos[l]}</td>
      <td class="rb-sum-menos" style="color:var(--d)">${resultado.negativos[l]}</td>
      <td class="rb-sum-total">${neto > 0 ? '+' + neto : neto}</td>
    </tr>`;
  };
  const correctionSection = `
    <div class="section-kicker">2. Calificación</div>
    <div class="section-title">Suma de + y − por dimensión</div>
    <p class="rb-hint">Por cada dimensión se cuentan los positivos (+) y los negativos (−). El <b>neto</b> = (# de +) − (# de −).</p>
    <table class="detail-table rb-sum-table">
      <thead><tr><th>Dimensión</th><th>Positivos (+)</th><th>Negativos (−)</th><th>Neto</th></tr></thead>
      <tbody>
        ${['D', 'I', 'S', 'C'].map(calcRow).join('')}
        <tr>
          <td class="rb-sum-label"><b>TOTAL</b></td>
          <td class="rb-sum-total">${total(resultado.positivos)}</td>
          <td class="rb-sum-total">${total(resultado.negativos)}</td>
          <td class="rb-sum-total">${total(resultado.neto)}</td>
        </tr>
      </tbody>
    </table>
    <div class="pattern-card">
      <div class="kicker">Personalidad predominante · máximo positivo</div>
      <div class="num">${escapeHtml(resultado.maxPositivo.nombres.join(' / ')) || '—'}</div>
      <div class="desc">Es la dimensión con más respuestas positivas (+): tu estilo de comportamiento predominante.</div>
    </div>
    <div class="pattern-card">
      <div class="kicker">Personalidad que evita / repele · máximo negativo</div>
      <div class="num">${escapeHtml(resultado.maxNegativo.nombres.join(' / ')) || '—'}</div>
      <div class="desc">Es la dimensión con más respuestas negativas (−): el estilo que la persona evita o rechaza.</div>
    </div>`;

  const interpretationSection = `
    <div class="section-kicker">3. Interpretación</div>
    <div class="section-title">Personalidad predominante</div>
    ${interpretacion.predominante.map(fichaColorHtml).join('')}
    <div class="section-title" style="margin-top:20px;">Personalidad que evita / repele</div>
    ${interpretacion.repelida.map(fichaColorHtml).join('')}`;

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