'use strict';

const ORDEN_DIM = ['E', 'A', 'R', 'EN', 'AM'];

function escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function nivelClass(cat) {
  return 'lvl ' + cat;
}

async function cargarListaResultados() {
  const cont = document.getElementById('listaResultados');
  cont.innerHTML = '<div class="admin-empty">Cargando…</div>';
  try {
    const lista = await api('/api/bfi/resultados');
    if (!lista.length) {
      cont.innerHTML =
        '<div class="admin-empty">Todavía no hay resultados guardados. Aparecerán aquí apenas alguien complete el cuestionario.</div>';
      return;
    }
    cont.innerHTML = lista
      .map((r) => {
        const completada = r.estado === 'completada';
        let chips = '';
        if (completada && r.dimensiones) {
          chips = `<div class="dim-chips">${ORDEN_DIM.filter((d) => r.dimensiones[d])
            .map(
              (d) =>
                `<span class="dim-chip ${r.dimensiones[d].nivel.cat}" title="${escapeHtml(d)} · ${escapeHtml(
                  r.dimensiones[d].nivel.label
                )}">${d} ${r.dimensiones[d].promedio.toFixed(1)}</span>`
            )
            .join('')}</div>`;
        } else {
          chips = `<span class="badge en-progreso">en progreso</span>`;
        }
        return `<div class="admin-row">
          <div style="flex:1; cursor:${completada ? 'pointer' : 'default'};" data-folio="${r.folio}" data-accion="${completada ? 'abrir' : ''}">
            <div class="name">${escapeHtml(r.nombre)}</div>
            <div class="meta">${r.cargo ? escapeHtml(r.cargo) + ' · ' : ''}${escapeHtml(r.fecha || '')} · folio ${r.folio}</div>
          </div>
          ${chips}
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
    await api(`/api/bfi/resultados/${folio}`, { method: 'DELETE' });
  } catch (err) {
    console.error('Error al borrar:', err);
  }
  cargarListaResultados();
}

function datosSectionHtml(candidato, resumen) {
  return `
    <div class="section-kicker">1. Datos del evaluado</div>
    <div class="section-title">Ficha del postulante</div>
    <table class="kv-table">
      <tr><th>Nombre completo</th><td>${escapeHtml(candidato.nombre)}</td></tr>
      <tr><th>Cargo al que se postula</th><td>${escapeHtml(candidato.cargo || '–')}</td></tr>
      <tr><th>Fecha de aplicación</th><td>${escapeHtml(candidato.fecha || '–')}</td></tr>
      <tr><th>Cédula / DNI</th><td>${escapeHtml(candidato.ci || '–')}</td></tr>
      <tr><th>Folio</th><td>${escapeHtml(candidato.folio)}</td></tr>
      <tr><th>Ítems respondidos</th><td>${resumen.respondidas}/${resumen.total}</td></tr>
    </table>`;
}

function brutoSectionHtml(detalle) {
  const rows = detalle
    .map(
      (d) => `<tr>
        <td class="n">${d.id}</td>
        <td>${escapeHtml(d.texto)}</td>
        <td>${escapeHtml(d.dimNombre)}${d.inv ? ' <span class="rev">(R)</span>' : ''}</td>
        <td class="num"><b>${d.respuesta}</b></td>
      </tr>`
    )
    .join('');
  return `
    <div class="section-kicker">2. Respuestas en bruto</div>
    <div class="section-title">Respuestas originales del evaluado</div>
    <table class="detail-table">
      <thead><tr><th>#</th><th>Ítem</th><th>Dimensión</th><th class="num">Resp. (1-5)</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
}

function scoringSectionHtml(detalle) {
  const rows = detalle
    .map(
      (d) => `<tr>
        <td class="n">${d.id}</td>
        <td>${escapeHtml(d.dimNombre)}</td>
        <td class="num">${d.respuesta}</td>
        <td class="num">${d.inv ? '✓' : '–'}</td>
        <td class="num"><b>${d.usado}</b></td>
      </tr>`
    )
    .join('');
  return `
    <div class="section-kicker">3. Cálculo con ítems invertidos</div>
    <div class="section-title">Recodificación</div>
    <p style="font-size:12.5px; color:var(--ink-soft); margin:0 0 10px;">Los ítems inversos (✓) se recodifican con la fórmula <b>valor usado = 6 − respuesta original</b>.</p>
    <table class="detail-table">
      <thead><tr><th>Ítem</th><th>Dimensión</th><th class="num">Resp. original</th><th class="num">Inverso</th><th class="num">Valor usado</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
}

function resultadosSectionHtml(filas) {
  const cards = filas
    .map(
      (f) => `<div class="stat-card">
        <div class="stat-label">${escapeHtml(f.nombre)}</div>
        <div class="stat-value">${f.promedio.toFixed(2)}</div>
        <div class="bar"><span style="width:${Math.max(0, Math.min(100, f.pct)).toFixed(1)}%; background:${f.color || 'var(--ink)'}"></span></div>
        <span class="${nivelClass(f.nivel.cat)}">${escapeHtml(f.nivel.label)}</span>
      </div>`
    )
    .join('');
  return `
    <div class="section-kicker">4. Resultados por dimensión</div>
    <div class="section-title">Promedios y niveles</div>
    <div class="stat-grid">${cards}</div>`;
}

function interpSectionHtml(filas) {
  const cards = filas
    .map(
      (f) => `<div class="interp-card" style="border-left-color:${f.color || 'var(--c)'}">
      <div class="head">
        <div class="scale-label">${escapeHtml(f.nombre)}</div>
        <div class="metrics">Promedio ${f.promedio.toFixed(2)}/5 · <span class="${nivelClass(f.nivel.cat)}">${escapeHtml(f.nivel.label)}</span></div>
      </div>
      <p class="desc">${escapeHtml(f.interpretacion)}</p>
    </div>`
    )
    .join('');
  return `
    <div class="section-kicker">5. Interpretación del perfil</div>
    <div class="section-title">Lectura por dimensión</div>
    ${cards}
    <div class="notice-note"><b>Nota metodológica.</b> El BFI-2-XS mide los cinco dominios generales con 3 ítems cada uno; no permite interpretar facetas específicas. Las categorías son rangos descriptivos basados en el promedio de la escala, no baremos normativos oficiales. Complemente con entrevista, observación u otras pruebas.</div>`;
}

function construirDetalleHtml(folio, datos) {
  const { candidato, resumen, bruto, filas } = datos;

  const header = `
    <div class="cand-head">
      <b>${escapeHtml(candidato.nombre)}</b>
      <span>${escapeHtml([candidato.cargo, candidato.fecha, 'Folio ' + candidato.folio].filter(Boolean).join(' · '))} · ${resumen.respondidas}/${resumen.total} respondidas</span>
    </div>`;

  const actions = `
    <div class="btn-row no-print" style="margin-top:26px;">
      <a class="btn ghost small" href="/api/bfi/exportar/${folio}/html" target="_blank" rel="noopener">Exportar página (HTML)</a>
      <a class="btn ghost small" href="/api/bfi/exportar/${folio}/docx">Descargar Word</a>
      <a class="btn ghost small" href="/api/bfi/exportar/${folio}/xlsx">Descargar Excel</a>
      <a class="btn ghost small" href="/api/bfi/exportar/${folio}/json">Descargar JSON</a>
      <span id="del-wrap-detail-${folio}" style="margin-left:auto;">
        <button class="btn ghost small" style="color:var(--d); border-color:var(--d);" data-accion="pedir-borrar-detalle">Borrar registro</button>
      </span>
    </div>`;

  return (
    header +
    datosSectionHtml(candidato, resumen) +
    brutoSectionHtml(bruto.detalle) +
    scoringSectionHtml(bruto.detalle) +
    resultadosSectionHtml(filas) +
    interpSectionHtml(filas) +
    actions
  );
}

async function abrirDetalle(folio) {
  mostrarVista('detailView');
  const cont = document.getElementById('detalleContenido');
  cont.innerHTML = '<div class="admin-empty">Cargando…</div>';
  try {
    const datos = await api(`/api/bfi/resultados/${folio}`);
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
      await api(`/api/bfi/resultados/${folio}`, { method: 'DELETE' });
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
