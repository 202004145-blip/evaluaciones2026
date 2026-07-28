// Panel del evaluador DISC
document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('app');
    if (!container) return;

    // Verificar si ya está autenticado
    fetch('/api/auth/me')
        .then(res => res.json())
        .then(data => {
            if (data.evaluador) {
                mostrarPanel(data.evaluador.usuario);
            } else {
                mostrarLogin();
            }
        })
        .catch(() => mostrarLogin());

    function mostrarLogin() {
        container.innerHTML = `
            <div class="container">
                <h1>📊 DISC · Panel del Evaluador</h1>
                <hr>
                <div class="login">
                    <h2>Iniciar sesión</h2>
                    <input type="text" id="loginUser" placeholder="Usuario">
                    <input type="password" id="loginPass" placeholder="Contraseña">
                    <button class="btn" id="btnLogin">Entrar</button>
                    <div class="error" id="loginError"></div>
                </div>
            </div>
        `;

        document.getElementById('btnLogin').addEventListener('click', async () => {
            const usuario = document.getElementById('loginUser').value.trim();
            const password = document.getElementById('loginPass').value.trim();
            const errorEl = document.getElementById('loginError');
            errorEl.textContent = '';

            if (!usuario || !password) {
                errorEl.textContent = 'Completa usuario y contraseña.';
                return;
            }

            try {
                const res = await fetch('/api/auth/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ usuario, password })
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || 'Error de login');
                mostrarPanel(usuario);
            } catch (err) {
                errorEl.textContent = err.message;
            }
        });
    }

    function mostrarPanel(usuario) {
        container.innerHTML = `
            <div class="container">
                <h1>📊 DISC · Panel del Evaluador</h1>
                <hr>
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
                    <span>👤 ${usuario}</span>
                    <button class="btn secundario" id="btnLogout">Cerrar sesión</button>
                </div>
                <div id="resultados"></div>
            </div>
        `;

        document.getElementById('btnLogout').addEventListener('click', () => {
            fetch('/api/auth/logout', { method: 'POST' })
                .then(() => mostrarLogin())
                .catch(() => mostrarLogin());
        });

        cargarResultados();
    }

    async function cargarResultados() {
        try {
            if (!window.storage) {
                document.getElementById('resultados').innerHTML = '<p style="color:red;">Error: Storage no disponible.</p>';
                return;
            }

            const keys = await window.storage.list('disc_resultado:', true);
            const items = keys && keys.keys ? keys.keys : [];

            if (!items.length) {
                document.getElementById('resultados').innerHTML = '<p>No hay sesiones registradas aún.</p>';
                return;
            }

            let html = '';
            for (const key of items) {
                try {
                    const item = await window.storage.get(key, true);
                    if (item && item.value) {
                        const data = JSON.parse(item.value);
                        const punt = data.puntuaciones || {};
                        html += `
                            <div class="sesion">
                                <h3>${data.nombre || 'Anónimo'}</h3>
                                <p><strong>Cargo:</strong> ${data.cargo || 'No especificado'}</p>
                                <p><strong>Fecha:</strong> ${data.fecha || '—'}</p>
                                <div class="puntuaciones">
                                    ${Object.entries(punt).map(([k,v]) =>
                                        `<span><strong>${k}:</strong> ${v}</span>`
                                    ).join('')}
                                </div>
                                <details>
                                    <summary style="cursor:pointer;font-weight:600;">📋 Ver respuestas</summary>
                                    <table>
                                        <tr><th>#</th><th>MÁS</th><th>MENOS</th></tr>
                                        ${Object.keys(data.respuestas || {}).sort((a,b)=>parseInt(a)-parseInt(b)).map(key => {
                                            const r = data.respuestas[key];
                                            return `<tr><td>${parseInt(key)+1}</td><td style="color:#16a34a;">${r.mas || '-'}</td><td style="color:#dc2626;">${r.menos || '-'}</td></tr>`;
                                        }).join('')}
                                    </table>
                                </details>
                            </div>
                        `;
                    }
                } catch (e) { /* omitir */ }
            }
            document.getElementById('resultados').innerHTML = html || '<p>No hay datos válidos.</p>';
        } catch (err) {
            document.getElementById('resultados').innerHTML = `<p style="color:red;">Error: ${err.message}</p>`;
        }
    }
});