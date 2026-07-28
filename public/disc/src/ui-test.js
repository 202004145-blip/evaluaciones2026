// Lógica del test DISC
document.addEventListener('DOMContentLoaded', () => {
    const PREGUNTAS = window.PREGUNTAS || [];
    const MAPEO = window.MAPEO_ESCALAS || {};

    let respuestas = {};

    function renderizarPreguntas(container) {
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
    }

    function guardarRespuesta(e) {
        const input = e.target;
        const idx = parseInt(input.dataset.idx);
        const tipo = input.dataset.tipo;
        const valor = input.value;

        if (!respuestas[idx]) respuestas[idx] = {};
        respuestas[idx][tipo] = valor;
    }

    function calcularPuntuaciones() {
        const puntuaciones = { D: 0, I: 0, S: 0, C: 0 };
        Object.keys(respuestas).forEach(key => {
            const r = respuestas[key];
            if (r.mas && MAPEO[r.mas]) puntuaciones[MAPEO[r.mas]] += 1;
            if (r.menos && MAPEO[r.menos]) puntuaciones[MAPEO[r.menos]] -= 1;
        });
        return puntuaciones;
    }

    // Exponer funciones globalmente
    window.disc = { renderizarPreguntas, guardarRespuesta, calcularPuntuaciones, respuestas };
});