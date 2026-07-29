'use strict';

async function api(path, options = {}) {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Error de red.');
  return data;
}

function mostrarVista(nombre) {
  ['loginView', 'listView', 'detailView'].forEach((id) => {
    document.getElementById(id).classList.toggle('active', id === nombre);
  });
  window.scrollTo({ top: 0 });
}

async function login() {
  const usuario = document.getElementById('loginUser').value.trim();
  const password = document.getElementById('loginPass').value;
  const errorEl = document.getElementById('loginError');
  errorEl.textContent = '';
  if (!usuario || !password) {
    errorEl.textContent = 'Completa usuario y contraseña.';
    return;
  }
  try {
    const data = await api('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ usuario, password }),
    });
    document.getElementById('usuarioActual').textContent = data.evaluador.usuario;
    await window.cargarListaResultados();
    mostrarVista('listView');
  } catch (err) {
    errorEl.textContent = err.message;
  }
}

async function logout() {
  await api('/api/auth/logout', { method: 'POST' }).catch(() => {});
  document.getElementById('loginPass').value = '';
  mostrarVista('loginView');
}

document.getElementById('btnLogin').addEventListener('click', login);
document.getElementById('loginPass').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') login();
});
document.getElementById('btnLogout').addEventListener('click', logout);
document.getElementById('btnLogout2').addEventListener('click', logout);

(async function init() {
  try {
    const data = await api('/api/auth/me');
    document.getElementById('usuarioActual').textContent = data.evaluador.usuario;
    await window.cargarListaResultados();
    mostrarVista('listView');
  } catch {
    mostrarVista('loginView');
  }
})();
