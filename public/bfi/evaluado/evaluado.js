'use strict';

const STORAGE_KEY = 'bfi_pradeva_sesion';
const PANELS = ['panel-0', 'panel-1', 'panel-2', 'panel-3'];
const ETIQUETAS = ['Muy en desacuerdo', 'Algo en desacuerdo', 'Neutral', 'Algo de acuerdo', 'Muy de acuerdo'];

let currentPanel = 0;
let sesion = null; // { folio, token }
let PREGUNTAS = [];
let TOTAL = 15;
let respuestas = {}; // { id: 1..5 }

function goTo(idx) {
  document.querySelectorAll('.panel').forEach((p) => p.classList.remove('active'));
  document.getElementById(PANELS[idx]).classList.add('active');
  currentPanel = idx;
  renderStepper();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function renderStepper() {
  const rail = document.getElementById('stepper');
  rail.innerHTML = '';
  for (let i = 0; i < 4; i++) {
    const seg = document.createElement('div');
    seg.className = 'step-seg' + (i <= currentPanel ? ' done' : '');
    seg.innerHTML = '<span></span>';
    rail.appendChild(seg);
  }
}

function guardarSesionLocal() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sesion));
}
function limpiarSesionLocal() {
  localStorage.removeItem(STORAGE_KEY);
}

async function api(path, options = {}) {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Error de red.');
  return data;
}

function escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function renderForm() {
  const wrap = document.getElementById('itemsWrap');
  wrap.innerHTML = PREGUNTAS.map((p) => {
    const opciones = [1, 2, 3, 4, 5]
      .map(
        (v) => `<label class="likert-opt" data-id="${p.id}" data-valor="${v}">
          <input type="radio" name="q${p.id}" value="${v}">
          <span class="num">${v}</span>
          <span class="lbl">${ETIQUETAS[v - 1]}</span>
        </label>`
      )
      .join('');
    return `<div class="q-block" id="q-${p.id}">
      <div class="q-head">
        <div class="q-index">${p.id}</div>
        <div class="q-text">${escapeHtml(p.texto)}</div>
      </div>
      <div class="likert">${opciones}</div>
    </div>`;
  }).join('');

  wrap.querySelectorAll('.likert-opt').forEach((label) => {
    label.addEventListener('click', () => elegir(Number(label.dataset.id), Number(label.dataset.valor)));
  });

  aplicarSeleccionesGuardadas();
  updateProgress();
}

function aplicarSeleccionesGuardadas() {
  Object.entries(respuestas).forEach(([id, valor]) => {
    marcarSeleccion(Number(id), Number(valor));
  });
}

function marcarSeleccion(id, valor) {
  const bloque = document.getElementById(`q-${id}`);
  if (!bloque) return;
  bloque.classList.remove('pendiente');
  bloque.querySelectorAll('.likert-opt').forEach((o) => {
    const activa = Number(o.dataset.valor) === valor;
    o.classList.toggle('selected', activa);
    const input = o.querySelector('input');
    if (input) input.checked = activa;
  });
}

let autosaveTimer = null;
function marcarAutosave(estado) {
  const tag = document.getElementById('autosaveTag');
  clearTimeout(autosaveTimer);
  if (estado === 'guardando') {
    tag.textContent = 'Guardando…';
    tag.className = 'autosave-tag';
  } else if (estado === 'ok') {
    tag.textContent = 'Guardado';
    tag.className = 'autosave-tag ok';
    autosaveTimer = setTimeout(() => (tag.textContent = ''), 1500);
  } else if (estado === 'error') {
    tag.textContent = 'No se pudo guardar. Reintenta.';
    tag.className = 'autosave-tag err';
  }
}

async function elegir(id, valor) {
  respuestas[id] = valor;
  marcarSeleccion(id, valor);
  document.getElementById('formWarn').textContent = '';
  updateProgress();

  marcarAutosave('guardando');
  try {
    await api(`/api/bfi/sesiones/${sesion.folio}/respuestas/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ token: sesion.token, valor }),
    });
    marcarAutosave('ok');
  } catch (err) {
    marcarAutosave('error');
  }
}

function updateProgress() {
  const n = Object.keys(respuestas).length;
  document.getElementById('progCount').textContent = `${n}/${TOTAL} respondidas`;
  document.getElementById('progBar').style.width = `${(n / TOTAL) * 100}%`;
}

async function trySubmit() {
  const faltantes = PREGUNTAS.filter((p) => !respuestas[p.id]);
  if (faltantes.length) {
    PREGUNTAS.forEach((p) => {
      const bloque = document.getElementById(`q-${p.id}`);
      if (bloque) bloque.classList.toggle('pendiente', !respuestas[p.id]);
    });
    document.getElementById('formWarn').textContent =
      `Faltan ${faltantes.length} afirmación(es) por responder (marcadas en rojo). Comenzando por la N.º ${faltantes[0].id}.`;
    document.getElementById(`q-${faltantes[0].id}`).scrollIntoView({ behavior: 'smooth', block: 'center' });
    return;
  }
  const btn = document.getElementById('btnFinalizar');
  btn.disabled = true;
  try {
    const nombre = document.getElementById('candName').value.trim();
    const cargo = document.getElementById('candPos').value.trim();
    const fecha = document.getElementById('candDate').value;
    const ci = document.getElementById('candCI').value.trim();
    const data = await api(`/api/bfi/sesiones/${sesion.folio}/finalizar`, {
      method: 'POST',
      body: JSON.stringify({ token: sesion.token, nombre, cargo, fecha, ci }),
    });
    document.getElementById('thanksFolio').textContent = 'Folio: ' + data.folio;
    limpiarSesionLocal();
    goTo(3);
  } catch (err) {
    document.getElementById('formWarn').textContent = err.message;
    btn.disabled = false;
  }
}

async function iniciarSesionNueva() {
  const nombre = document.getElementById('candName').value.trim();
  const cargo = document.getElementById('candPos').value.trim();
  const fecha = document.getElementById('candDate').value;
  const ci = document.getElementById('candCI').value.trim();
  if (!nombre) {
    document.getElementById('datosWarn').textContent = 'Ingrese los nombres y apellidos completos.';
    return;
  }
  if (!cargo) {
    document.getElementById('datosWarn').textContent = 'Ingrese el cargo al que se postula.';
    return;
  }
  if (!fecha) {
    document.getElementById('datosWarn').textContent = 'Ingrese la fecha de aplicación.';
    return;
  }
  const data = await api('/api/bfi/sesiones', {
    method: 'POST',
    body: JSON.stringify({ nombre, cargo, fecha, ci }),
  });
  sesion = { folio: data.folio, token: data.token };
  PREGUNTAS = data.preguntas;
  TOTAL = data.total;
  guardarSesionLocal();
  respuestas = {};
  renderForm();
  goTo(2);
}

async function intentarReanudar() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return false;
  let guardado;
  try {
    guardado = JSON.parse(raw);
  } catch {
    limpiarSesionLocal();
    return false;
  }
  try {
    const data = await api(`/api/bfi/sesiones/${guardado.folio}?token=${encodeURIComponent(guardado.token)}`);
    if (data.estado !== 'en_progreso') {
      limpiarSesionLocal();
      return false;
    }
    sesion = { folio: guardado.folio, token: guardado.token };
    PREGUNTAS = data.preguntas;
    TOTAL = data.total;
    document.getElementById('candName').value = data.nombre || '';
    document.getElementById('candPos').value = data.cargo || '';
    document.getElementById('candDate').value = data.fecha || '';
    document.getElementById('candCI').value = data.ci || '';
    respuestas = { ...data.respuestas };
    renderForm();
    goTo(2);
    return true;
  } catch {
    limpiarSesionLocal();
    return false;
  }
}

document.getElementById('btnComenzar').addEventListener('click', () => goTo(1));
document.getElementById('btnAtrasDatos').addEventListener('click', () => goTo(0));
document.getElementById('btnVolverDatos').addEventListener('click', () => goTo(1));
document.getElementById('btnComenzarTest').addEventListener('click', () => {
  document.getElementById('datosWarn').textContent = '';
  iniciarSesionNueva().catch((err) => {
    document.getElementById('datosWarn').textContent = err.message;
  });
});
document.getElementById('btnFinalizar').addEventListener('click', trySubmit);

(function initFecha() {
  const hoy = new Date().toISOString().split('T')[0];
  document.getElementById('candDate').value = hoy;
})();

intentarReanudar().then((reanudado) => {
  if (!reanudado) goTo(0);
});
