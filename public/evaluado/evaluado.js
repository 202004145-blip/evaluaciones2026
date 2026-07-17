'use strict';

const STORAGE_KEY = 'disc_pradeva_sesion';
const PANELS = ['panel-0', 'panel-1', 'panel-2', 'panel-3'];

let currentPanel = 0;
let sesion = null; // { folio, token }
let ITEMS = [];
let formAnswers = {};

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

function renderForm() {
  const wrap = document.getElementById('itemsWrap');
  const order = ['D', 'I', 'S', 'C'];
  wrap.innerHTML = ITEMS.map((item, idx) => {
    const rows = order
      .map((letter) => {
        const word = item.palabras[letter];
        return `<div class="opt-row">
          <div class="opt-text">${word}</div>
          <button type="button" class="pick-btn" id="it-${item.id}-mas-${letter}" data-item="${item.id}" data-letter="${letter}" data-kind="mas">M</button>
          <button type="button" class="pick-btn" id="it-${item.id}-menos-${letter}" data-item="${item.id}" data-letter="${letter}" data-kind="menos">m</button>
        </div>`;
      })
      .join('');
    return `<div class="block" id="block-${item.id}">
      <div class="block-num">Grupo ${idx + 1} de ${ITEMS.length}</div>
      <div class="col-headers"><span></span><span class="col-caption">Más</span><span class="col-caption">Menos</span></div>
      ${rows}
    </div>`;
  }).join('');

  wrap.querySelectorAll('.pick-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      pick(Number(btn.dataset.item), btn.dataset.letter, btn.dataset.kind);
    });
  });

  aplicarSeleccionesGuardadas();
  updateProgress();
}

function aplicarSeleccionesGuardadas() {
  Object.entries(formAnswers).forEach(([itemId, entry]) => {
    ['D', 'I', 'S', 'C'].forEach((l) => {
      const btnMas = document.getElementById(`it-${itemId}-mas-${l}`);
      const btnMenos = document.getElementById(`it-${itemId}-menos-${l}`);
      if (btnMas) btnMas.classList.toggle('mas-on', entry.mas === l);
      if (btnMenos) btnMenos.classList.toggle('menos-on', entry.menos === l);
    });
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

async function pick(itemId, letter, kind) {
  if (!formAnswers[itemId]) formAnswers[itemId] = { mas: null, menos: null };
  const entry = formAnswers[itemId];
  const otro = kind === 'mas' ? 'menos' : 'mas';
  if (entry[otro] === letter) return; // no se puede elegir la misma palabra para MÁS y MENOS
  entry[kind] = entry[kind] === letter ? null : letter;

  ['D', 'I', 'S', 'C'].forEach((l) => {
    document.getElementById(`it-${itemId}-mas-${l}`).classList.toggle('mas-on', entry.mas === l);
    document.getElementById(`it-${itemId}-menos-${l}`).classList.toggle('menos-on', entry.menos === l);
  });
  document.getElementById('formWarn').textContent = '';
  updateProgress();

  marcarAutosave('guardando');
  try {
    await api(`/api/sesiones/${sesion.folio}/respuestas/${itemId}`, {
      method: 'PUT',
      body: JSON.stringify({ token: sesion.token, mas: entry.mas, menos: entry.menos }),
    });
    marcarAutosave('ok');
  } catch (err) {
    marcarAutosave('error');
  }
}

function updateProgress() {
  const completos = Object.values(formAnswers).filter((e) => e && e.mas && e.menos).length;
  document.getElementById('progCount').textContent = `${completos}/${ITEMS.length} respondidos`;
  document.getElementById('progBar').style.width = `${(completos / ITEMS.length) * 100}%`;
}

async function trySubmit() {
  const incompletos = ITEMS.filter((it) => {
    const e = formAnswers[it.id];
    return !e || !e.mas || !e.menos;
  });
  if (incompletos.length) {
    document.getElementById('formWarn').textContent =
      `Faltan ${incompletos.length} grupo(s) por completar: ${incompletos.slice(0, 8).map((i) => i.id).join(', ')}${incompletos.length > 8 ? '…' : ''}.`;
    document.getElementById(`block-${incompletos[0].id}`).scrollIntoView({ behavior: 'smooth', block: 'center' });
    return;
  }
  const btn = document.getElementById('btnFinalizar');
  btn.disabled = true;
  try {
    const nombre = document.getElementById('candName').value.trim();
    const cargo = document.getElementById('candPos').value.trim();
    const fecha = document.getElementById('candDate').value;
    const data = await api(`/api/sesiones/${sesion.folio}/finalizar`, {
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
  const data = await api('/api/sesiones', {
    method: 'POST',
    body: JSON.stringify({ nombre, cargo, fecha }),
  });
  sesion = { folio: data.folio, token: data.token };
  ITEMS = data.items;
  guardarSesionLocal();
  formAnswers = {};
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
    const data = await api(`/api/sesiones/${guardado.folio}?token=${encodeURIComponent(guardado.token)}`);
    if (data.estado !== 'en_progreso') {
      limpiarSesionLocal();
      return false;
    }
    sesion = { folio: guardado.folio, token: guardado.token };
    ITEMS = data.items;
    document.getElementById('candName').value = data.nombre || '';
    document.getElementById('candPos').value = data.cargo || '';
    document.getElementById('candDate').value = data.fecha || '';
    formAnswers = {};
    Object.entries(data.respuestas).forEach(([itemId, r]) => {
      formAnswers[itemId] = { mas: r.mas, menos: r.menos };
    });
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
document.getElementById('btnComenzarTest').addEventListener('click', () => {
  iniciarSesionNueva().catch((err) => {
    document.getElementById('datosWarn').textContent = err.message;
  });
});
document.getElementById('btnFinalizar').addEventListener('click', trySubmit);

intentarReanudar().then((reanudado) => {
  if (!reanudado) goTo(0);
});
