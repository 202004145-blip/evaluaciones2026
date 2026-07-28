// Helpers para exportación de reportes DISC
function getEstiloNombre(escala) {
    const nombres = {
        'D': 'Dominante',
        'I': 'Influyente',
        'S': 'Estable',
        'C': 'Concienzudo'
    };
    return nombres[escala] || escala;
}

function getEstiloColor(escala) {
    const colores = {
        'D': '#B23A2E',
        'I': '#D9A441',
        'S': '#3E7C59',
        'C': '#2F4858'
    };
    return colores[escala] || '#333';
}

function getEstiloDescripcion(escala) {
    const descripciones = {
        'D': 'Orientado a resultados, directo, decidido',
        'I': 'Sociable, entusiasta, persuasivo',
        'S': 'Paciente, estable, cooperativo',
        'C': 'Analítico, preciso, metódico'
    };
    return descripciones[escala] || '';
}

function formatearFecha(fecha) {
    if (!fecha) return 'No especificada';
    try {
        const d = new Date(fecha);
        return d.toLocaleDateString('es-ES', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    } catch (e) {
        return fecha;
    }
}

function calcularTotales(respuestas, mapeo) {
    const totales = { D: 0, I: 0, S: 0, C: 0 };
    const mas = { D: 0, I: 0, S: 0, C: 0 };
    const menos = { D: 0, I: 0, S: 0, C: 0 };

    Object.keys(respuestas).forEach(key => {
        const r = respuestas[key];
        if (r.mas && mapeo[r.mas]) {
            mas[mapeo[r.mas]] += 1;
            totales[mapeo[r.mas]] += 1;
        }
        if (r.menos && mapeo[r.menos]) {
            menos[mapeo[r.menos]] += 1;
            totales[mapeo[r.menos]] -= 1;
        }
    });

    return { mas, menos, total: totales };
}