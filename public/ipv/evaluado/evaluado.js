'use strict';

const STORAGE_KEY = 'ipv_pradeva_sesion';
const PANELS = ['panel-0', 'panel-1', 'panel-2', 'panel-3'];

let currentPanel = 0;
let sesion = null; // { folio, token }
let PREGUNTAS = [];
let TOTAL = 87;
let respuestas = {}; // { n: 'A'|'B'|'C' }

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
    const opciones = Object.entries(p.opciones)
      .map(
        ([letra, texto]) => `<label class="q-option" data-n="${p.n}" data-letra="${letra}">
          <input type="radio" name="q${p.n}" value="${letra}">
          <span class="letter">${letra}.</span>
          <span class="opt-text">${escapeHtml(texto)}</span>
        </label>`
      )
      .join('');
    return `<div class="q-block" id="q-${p.n}">
      <div class="q-num">Pregunta ${p.n} de ${TOTAL}</div>
      <div class="q-text">${escapeHtml(p.texto)}</div>
      <div class="q-options">${opciones}</div>
    </div>`;
  }).join('');

  wrap.querySelectorAll('.q-option').forEach((label) => {
    label.addEventListener('click', () => elegir(Number(label.dataset.n), label.dataset.letra));
  });

  aplicarSeleccionesGuardadas();
  updateProgress();
}

function aplicarSeleccionesGuardadas() {
  Object.entries(respuestas).forEach(([n, letra]) => {
    marcarSeleccion(Number(n), letra);
  });
}

function marcarSeleccion(n, letra) {
  const bloque = document.getElementById(`q-${n}`);
  if (!bloque) return;
  bloque.classList.remove('pendiente');
  bloque.querySelectorAll('.q-option').forEach((o) => {
    const activa = o.dataset.letra === letra;
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

async function elegir(n, letra) {
  respuestas[n] = letra;
  marcarSeleccion(n, letra);
  document.getElementById('formWarn').textContent = '';
  updateProgress();

  marcarAutosave('guardando');
  try {
    await api(`/api/ipv/sesiones/${sesion.folio}/respuestas/${n}`, {
      method: 'PUT',
      body: JSON.stringify({ token: sesion.token, opcion: letra }),
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
  const faltantes = PREGUNTAS.filter((p) => !respuestas[p.n]);
  if (faltantes.length) {
    PREGUNTAS.forEach((p) => {
      const bloque = document.getElementById(`q-${p.n}`);
      if (bloque) bloque.classList.toggle('pendiente', !respuestas[p.n]);
    });
    document.getElementById('formWarn').textContent =
      `Faltan ${faltantes.length} pregunta(s) por responder (marcadas en rojo). Comenzando por la pregunta ${faltantes[0].n}.`;
    document.getElementById(`q-${faltantes[0].n}`).scrollIntoView({ behavior: 'smooth', block: 'center' });
    return;
  }
  const btn = document.getElementById('btnFinalizar');
  btn.disabled = true;
  try {
    const nombre = document.getElementById('candName').value.trim();
    const cargo = document.getElementById('candPos').value.trim();
    const fecha = document.getElementById('candDate').value;
    const data = await api(`/api/ipv/sesiones/${sesion.folio}/finalizar`, {
      method: 'POST',
      body: JSON.stringify({ token: sesion.token, nombre, cargo, fecha }),
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
  if (!nombre) {
    document.getElementById('datosWarn').textContent = 'Ingrese el nombre completo del postulante.';
    return;
  }
  if (!fecha) {
    document.getElementById('datosWarn').textContent = 'Ingrese la fecha de aplicación.';
    return;
  }
  const data = await api('/api/ipv/sesiones', {
    method: 'POST',
    body: JSON.stringify({ nombre, cargo, fecha }),
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
    const data = await api(`/api/ipv/sesiones/${guardado.folio}?token=${encodeURIComponent(guardado.token)}`);
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
