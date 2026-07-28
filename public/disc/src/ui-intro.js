// Pantalla de introducción del DISC
document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('app');
    if (!container) return;

    // Si el contenedor está vacío, mostrar la intro
    if (container.children.length === 0) {
        container.innerHTML = `
            <div class="container">
                <h1>📊 DISC · Perfil de Personalidad</h1>
                <p>Selecciona <strong>1 MÁS</strong> y <strong>1 MENOS</strong> por grupo.</p>
                <hr>
                <div style="background: #f0fdf4; border: 1px solid #86efac; border-radius: 8px; padding: 16px; margin: 16px 0; font-size: 14px; line-height: 1.6;">
                    <h3 style="margin: 0 0 8px;">📝 Instrucciones</h3>
                    <p style="margin: 0 0 8px;">
                        En el presente Test, se presentan <strong>28 Items</strong> de forma horizontal con <strong>4 palabras</strong> cada uno, 
                        de los cuales debe elegir primeramente aquella palabra que <strong>más</strong> lo represente o lo describa.
                    </p>
                    <p style="margin: 0;">
                        A continuación, en el mismo Item debe escoger entre las palabras restantes aquella que por el contrario <strong>menos</strong> lo represente o describa.
                    </p>
                    <p style="margin: 8px 0 0; font-style: italic; color: #166534;">
                        Ejemplo: <strong>ENTUSIASTA +</strong> &nbsp; APACIBLE −
                    </p>
                </div>
                <div style="margin:16px 0;">
                    <label><strong>Nombre:</strong></label>
                    <input type="text" id="nombre" placeholder="Nombre completo">
                </div>
                <div style="margin:16px 0;">
                    <label><strong>Cargo (opcional):</strong></label>
                    <input type="text" id="cargo" placeholder="Ej. Ejecutivo comercial">
                </div>
                <div style="margin:16px 0;">
                    <label><strong>Fecha de aplicación:</strong></label>
                    <input type="date" id="fecha">
                </div>
                <button class="btn" id="btnIniciar">Comenzar test →</button>
                <div style="margin-top:16px;"><a href="/" style="color:#64748b;">← Volver al menú</a></div>
            </div>
        `;
    }
});