// Botones de descarga para el panel del evaluador DISC
document.addEventListener('DOMContentLoaded', () => {
    // Esperar a que los botones existan (se crean dinámicamente)
    const observer = new MutationObserver(() => {
        configurarBotones();
    });
    observer.observe(document.getElementById('resultados') || document.body, {
        childList: true,
        subtree: true
    });
    configurarBotones();
});

function configurarBotones() {
    // Buscar botones de descarga en el panel
    const btnHTML = document.getElementById('btn-download-html');
    const btnWord = document.getElementById('btn-download-word');
    const btnExcel = document.getElementById('btn-download-excel');

    if (btnHTML) {
        btnHTML.removeEventListener('click', downloadHTML);
        btnHTML.addEventListener('click', downloadHTML);
    }
    if (btnWord) {
        btnWord.removeEventListener('click', downloadWord);
        btnWord.addEventListener('click', downloadWord);
    }
    if (btnExcel) {
        btnExcel.removeEventListener('click', downloadExcel);
        btnExcel.addEventListener('click', downloadExcel);
    }
}

// Obtener datos de la sesión actual
function getDatosSesion() {
    try {
        // Buscar en el DOM los datos de la sesión mostrada
        const sesion = document.querySelector('.sesion');
        if (!sesion) return null;

        const nombre = sesion.querySelector('h3')?.textContent || 'Anónimo';
        const cargo = sesion.querySelector('p:nth-of-type(1)')?.textContent?.replace('Cargo:', '').trim() || '';
        const fecha = sesion.querySelector('p:nth-of-type(2)')?.textContent?.replace('Fecha:', '').trim() || '';

        // Extraer respuestas de la tabla
        const respuestas = {};
        const filas = sesion.querySelectorAll('table tr');
        filas.forEach((fila, idx) => {
            if (idx === 0) return; // Saltar cabecera
            const celdas = fila.querySelectorAll('td');
            if (celdas.length >= 3) {
                const num = parseInt(celdas[0].textContent) - 1;
                const mas = celdas[1].textContent.trim();
                const menos = celdas[2].textContent.trim();
                if (!isNaN(num) && mas && menos) {
                    respuestas[num] = { mas, menos };
                }
            }
        });

        // Extraer puntuaciones
        const puntuaciones = {};
        const puntSpans = sesion.querySelectorAll('.puntuaciones span');
        puntSpans.forEach(span => {
            const texto = span.textContent;
            const match = texto.match(/([DISCC]):\s*(\d+)/);
            if (match) {
                puntuaciones[match[1]] = parseInt(match[2]);
            }
        });

        return { nombre, cargo, fecha, respuestas, puntuaciones };
    } catch (e) {
        console.error('Error obteniendo datos:', e);
        return null;
    }
}

// Descargar HTML
function downloadHTML() {
    const datos = getDatosSesion();
    if (!datos) {
        alert('No se encontraron datos para exportar.');
        return;
    }

    const html = generarReporteHTML(datos);
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `DISC_${datos.nombre.replace(/\s+/g, '_')}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Descargar Word
function downloadWord() {
    const datos = getDatosSesion();
    if (!datos) {
        alert('No se encontraron datos para exportar.');
        return;
    }

    const html = generarReporteWord(datos);
    const blob = new Blob(['\ufeff' + html], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `DISC_${datos.nombre.replace(/\s+/g, '_')}.doc`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Descargar Excel (CSV)
function downloadExcel() {
    const datos = getDatosSesion();
    if (!datos) {
        alert('No se encontraron datos para exportar.');
        return;
    }

    const csv = generarReporteExcel(datos);
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `DISC_${datos.nombre.replace(/\s+/g, '_')}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}