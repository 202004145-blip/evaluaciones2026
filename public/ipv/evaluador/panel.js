'use strict';

let listaActual = [];

function escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

async function cargarListaResultados() {
  const cont = document.getElementById('listaResultados');
  cont.innerHTML = '<div class="admin-empty">Cargando…</div>';
  try {
    const lista = await api('/api/ipv/resultados');
    listaActual = lista;
    if (!lista.length) {
      cont.innerHTML =
        '<div class="admin-empty">Todavía no hay resultados guardados. Aparecerán aquí apenas alguien complete el test.</div>';
      return;
    }
    cont.innerHTML = lista
      .map((r) => {
        const completada = r.estado === 'completada';
        const derecha = completada
          ? `<div class="meta" data-folio="${r.folio}" data-accion="abrir" style="cursor:pointer;">DGV: <b>${r.dgv_decatipo ?? '—'}/10</b> ${r.dgv_nivel ? '· ' + r.dgv_nivel : ''}</div>`
          : `<span class="badge en-progreso">en progreso</span>`;
        return `<div class="admin-row">
          <div style="flex:1; cursor:${completada ? 'pointer' : 'default'};" data-folio="${r.folio}" data-accion="${completada ? 'abrir' : ''}">
            <div class="name">${escapeHtml(r.nombre)}</div>
            <div class="meta">${r.cargo ? escapeHtml(r.cargo) + ' · ' : ''}${escapeHtml(r.fecha || '')} · folio ${r.folio}</div>
          </div>
          ${derecha}
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
    cont.innerHTML = `<div class="admin-empty">No se pudieron cargar los resultados. (${escapeHtml(err.message)})</div>`;
  }
}
window.cargarListaResultados = cargarListaResultados;

function pedirBorrado(folio) {
  const wrap = document.getElementById(`del-wrap-${folio}`);
  if (!wrap) return;
  wrap.innerHTML = `
    <span style="font-family:'IBM Plex Mono',monospace; font-size:10.5px; color:var(--d); margin-right:6px;">¿Borrar definitivamente?</span>
    <button class="btn small" style="background:var(--d); border-color:var(--d);" data-accion="confirmar">Sí, borrar</button>
    <button class="btn ghost small" data-accion="cancelar">Cancelar</button>`;
  wrap.querySelector('[data-accion="confirmar"]').addEventListener('click', (e) => {
    e.stopPropagation();
    confirmarBorrado(folio);
  });
  wrap.querySelector('[data-accion="cancelar"]').addEventListener('click', (e) => {
    e.stopPropagation();
    cargarListaResultados();
  });
}

async function confirmarBorrado(folio) {
  const wrap = document.getElementById(`del-wrap-${folio}`);
  if (wrap)
    wrap.innerHTML = `<span style="font-family:'IBM Plex Mono',monospace; font-size:10.5px; color:var(--ink-soft);">Borrando…</span>`;
  try {
    await api(`/api/ipv/resultados/${folio}`, { method: 'DELETE' });
  } catch (err) {
    console.error('Error al borrar:', err);
  }
  cargarListaResultados();
}

function decaMeterHtml(decatipo, cat) {
  let segs = '';
  for (let n = 1; n <= 10; n++) segs += `<div class="deca-seg ${n <= decatipo ? 'on ' + cat : ''}"></div>`;
  return `<div class="deca-meter" title="Decatipo ${decatipo}/10">${segs}</div>`;
}

function rawSectionHtml(detalle) {
  const rows = detalle
    .map((d) => {
      const opciones = Object.entries(d.opciones)
        .map(([l, t]) =>
          l === d.clave
            ? `<span class="key-tag">${l}</span> ${escapeHtml(t)}`
            : `<b>${l}.</b> ${escapeHtml(t)}`
        )
        .join('<br>');
      let pill;
      if (!d.respuesta) pill = `<span class="ans-pill none">sin responder</span>`;
      else if (d.acierto) pill = `<span class="ans-pill hit">${d.respuesta} · puntúa</span>`;
      else pill = `<span class="ans-pill miss">${d.respuesta} · no puntúa</span>`;
      return `<tr>
        <td class="n">${d.n}</td>
        <td>${escapeHtml(d.texto)}<div style="margin-top:6px; color:var(--ink-soft); font-size:11.5px; line-height:1.6;">${opciones}</div></td>
        <td>${pill}</td>
      </tr>`;
    })
    .join('');
  return `
    <div class="section-kicker">1. Preguntas y respuestas</div>
    <div class="section-title">Corrección contra la clave (87 ítems)</div>
    <p style="font-size:12.5px; color:var(--ink-soft); margin:0 0 10px;">La opción resaltada en <span class="key-tag">amarillo</span> es la que puntúa según la clave del manual.</p>
    <table class="detail-table">
      <thead><tr><th>#</th><th>Enunciado y opciones</th><th>Respuesta</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
}

function scoreSectionHtml(filas) {
  const rows = filas
    .map((f) => {
      const sub = f.nombre.split('—').slice(1).join('—').trim();
      return `<tr class="${f.esGlobal ? 'global' : ''}">
        <td><span class="scale-name">${f.corta}</span> <span style="color:var(--ink-soft); font-size:11px;">${escapeHtml(sub)}</span></td>
        <td class="num">${f.pd}</td>
        <td class="num" style="color:var(--ink-soft);">${f.max ?? '—'}</td>
        <td class="num"><span class="deca ${f.nivel.cat === 'bajo' ? '' : ''}">${f.decatipo}</span></td>
        <td>${decaMeterHtml(f.decatipo, f.nivel.cat)}</td>
        <td><span class="lvl ${f.nivel.cat}">${f.nivel.label}</span></td>
      </tr>`;
    })
    .join('');
  return `
    <div class="section-kicker">2. Puntuaciones directas y decatipos</div>
    <div class="section-title">Baremos y niveles</div>
    <table class="score-table">
      <thead><tr><th>Escala</th><th class="num">PD</th><th class="num">Máx.</th><th class="num">Decatipo</th><th>Perfil</th><th>Nivel</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <p style="font-style:italic; font-size:12px; color:var(--ink-soft); margin-top:12px;">
      <b>PD</b> = puntuación directa · <b>Decatipo</b> = valor tipificado 1–10 (media 5.5). Bajo: 1–3 · Medio: 4–7 · Alto: 8–10.
    </p>`;
}

function interpSectionHtml(filas) {
  const cards = filas
    .map(
      (f) => `<div class="interp-card ${f.esGlobal ? 'global' : ''}">
      <div class="head">
        <div class="scale-label">${escapeHtml(f.nombre)}</div>
        <div class="metrics">PD ${f.pd}${f.max != null ? '/' + f.max : ''} · Decatipo ${f.decatipo}/10 · <span class="lvl ${f.nivel.cat}">${f.nivel.label}</span></div>
      </div>
      <p class="desc">${escapeHtml(f.descripcion)}</p>
    </div>`
    )
    .join('');
  return `
    <div class="section-kicker">3. Interpretación del perfil</div>
    <div class="section-title">Lectura por escala</div>
    <p style="font-size:12.5px; color:var(--ink-soft); margin:0 0 14px;">Se recomienda comenzar por las dimensiones más generales (DGV, R y A) antes de las escalas específicas. La interpretación debe complementarse con el análisis del puesto, el equipo de ventas y el producto.</p>
    ${cards}
    <div class="notice-note"><b>Nota metodológica.</b> La corrección automática utiliza los baremos mexicanos del manual del IPV (n = 300) y una asignación pregunta-escala basada en el análisis de contenidos del manual. La escala IX (Sociabilidad) coincide con la clave del manual de corrección. Para uso de alta consecuencia, contraste la asignación pregunta-escala con la plantilla oficial del editor.</div>`;
}

function construirDetalleHtml(folio, datos) {
  const { candidato, resumen, bruto, filas } = datos;

  const header = `
    <div class="cand-head">
      <b>${escapeHtml(candidato.nombre)}</b>
      <span>${escapeHtml([candidato.cargo, candidato.fecha, 'Folio ' + candidato.folio].filter(Boolean).join(' · '))} · ${resumen.respondidas}/${resumen.total} respondidas · ${resumen.aciertos} aciertos</span>
    </div>`;

  const actions = `
    <div class="btn-row no-print" style="margin-top:26px;">
      <a class="btn ghost small" href="/api/ipv/exportar/${folio}/html" target="_blank" rel="noopener">Exportar página (HTML)</a>
      <a class="btn ghost small" href="/api/ipv/exportar/${folio}/docx">Descargar Word</a>
      <a class="btn ghost small" href="/api/ipv/exportar/${folio}/xlsx">Descargar Excel</a>
      <a class="btn ghost small" href="/api/ipv/exportar/${folio}/json">Descargar JSON</a>
      <span id="del-wrap-detail-${folio}" style="margin-left:auto;">
        <button class="btn ghost small" style="color:var(--d); border-color:var(--d);" data-accion="pedir-borrar-detalle">Borrar registro</button>
      </span>
    </div>`;

  return (
    header +
    rawSectionHtml(bruto.detalle) +
    scoreSectionHtml(filas) +
    interpSectionHtml(filas) +
    actions
  );
}

async function abrirDetalle(folio) {
  mostrarVista('detailView');
  const cont = document.getElementById('detalleContenido');
  cont.innerHTML = '<div class="admin-empty">Cargando…</div>';
  try {
    const datos = await api(`/api/ipv/resultados/${folio}`);
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
      await api(`/api/ipv/resultados/${folio}`, { method: 'DELETE' });
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
