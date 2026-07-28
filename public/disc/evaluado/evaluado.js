// Lógica del test DISC para el evaluado
document.addEventListener('DOMContentLoaded', () => {
    // Obtener datos globales
    const PREGUNTAS = window.PREGUNTAS || [];
    const ESCALAS = window.ESCALAS || {};
    const MAPEO_ESCALAS = window.MAPEO_ESCALAS || {};

    let respuestas = {};
    let nombre = '';
    let cargo = '';

    function renderizarPreguntas() {
        const container = document.getElementById('preguntas');
        if (!container) return;
        container.innerHTML = '';
        PREGUNTAS.forEach((palabras, idx) => {
            const div = document.createElement('div');
            div.className = 'grupo';
            div.innerHTML = `
                <strong>${idx+1}.</strong>
                <div class="palabras">
                    ${palabras.map(p => `
                        <div class="palabra">
                            <span>${p}</span>
                            <input type="radio" name="mas_${idx}" value="${p}" data-idx="${idx}" data-tipo="mas">
                            <label>MÁS</label>
                            <input type="radio" name="menos_${idx}" value="${p}" data-idx="${idx}" data-tipo="menos">
                            <label>MENOS</label>
                        </div>
                    `).join('')}
                </div>
            `;
            container.appendChild(div);
        });
        document.querySelectorAll('input[type="radio"]').forEach(input => {
            input.addEventListener('change', guardarRespuesta);
        });
        actualizarProgreso();
    }

    function guardarRespuesta(e) {
        const input = e.target;
        const idx = parseInt(input.dataset.idx);
        const tipo = input.dataset.tipo;
        const valor = input.value;
        if (!respuestas[idx]) respuestas[idx] = {};
        respuestas[idx][tipo] = valor;
        actualizarProgreso();
    }

    function actualizarProgreso() {
        const respondidas = Object.keys(respuestas).filter(k => respuestas[k].mas && respuestas[k].menos).length;
        const progreso = document.getElementById('progreso');
        if (progreso) progreso.textContent = respondidas;
    }

    // Iniciar test
    const btnIniciar = document.getElementById('btnIniciar');
    if (btnIniciar) {
        btnIniciar.addEventListener('click', () => {
            nombre = document.getElementById('nombre').value.trim();
            if (!nombre) { alert('Ingresa tu nombre.'); return; }
            cargo = document.getElementById('cargo').value.trim();
            document.getElementById('inicio').classList.add('oculto');
            document.getElementById('test').classList.remove('oculto');
            renderizarPreguntas();
        });
    }

    // Enviar respuestas
    const btnEnviar = document.getElementById('btnEnviar');
    if (btnEnviar) {
        btnEnviar.addEventListener('click', async () => {
            const total = PREGUNTAS.length;
            const respondidas = Object.keys(respuestas).filter(k => respuestas[k].mas && respuestas[k].menos).length;
            if (respondidas < total) {
                document.getElementById('warn').style.display = 'block';
                return;
            }
            document.getElementById('warn').style.display = 'none';

            // Calcular puntuaciones
            const puntuaciones = { D: 0, I: 0, S: 0, C: 0 };
            Object.keys(respuestas).forEach(key => {
                const r = respuestas[key];
                if (r.mas && MAPEO_ESCALAS[r.mas]) {
                    puntuaciones[MAPEO_ESCALAS[r.mas]] += 1;
                }
                if (r.menos && MAPEO_ESCALAS[r.menos]) {
                    puntuaciones[MAPEO_ESCALAS[r.menos]] -= 1;
                }
            });

            try {
                const datos = {
                    nombre, cargo,
                    fecha: new Date().toISOString().split('T')[0],
                    respuestas, puntuaciones,
                    test: 'disc'
                };
                const result = await window.storage.set(
                    'disc_resultado:' + Date.now(),
                    JSON.stringify(datos),
                    true
                );
                if (result) {
                    document.getElementById('test').classList.add('oculto');
                    document.getElementById('gracias').classList.remove('oculto');
                } else {
                    alert('Error al guardar. Intenta de nuevo.');
                }
            } catch (err) {
                alert('Error: ' + err.message);
            }
        });
    }
});