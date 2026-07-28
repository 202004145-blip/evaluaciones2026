// Panel del evaluador DISC
async function cargarResultados() {
    try {
        const keys = await window.storage.list('disc_resultado:', true);
        const items = keys && keys.keys ? keys.keys : [];
        const div = document.getElementById('resultados');
        if (!div) return;

        if (!items.length) {
            div.innerHTML = '<p>No hay sesiones registradas aún.</p>';
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
        div.innerHTML = html || '<p>No hay datos válidos.</p>';
    } catch (err) {
        document.getElementById('resultados').innerHTML = `<p style="color:red;">Error: ${err.message}</p>`;
    }
}

// Auto-login
document.addEventListener('DOMContentLoaded', () => {
    fetch('/api/auth/me').then(res => res.json()).then(data => {
        if (data.evaluador) {
            document.getElementById('login').classList.add('oculto');
            document.getElementById('panel').classList.remove('oculto');
            cargarResultados();
        }
    }).catch(() => {});
});

// Exponer función para login.js
window.cargarResultados = cargarResultados;