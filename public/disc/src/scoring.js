// Motor de calificación del DISC
function calcularPuntuaciones(respuestas, mapeo) {
    const puntuaciones = { D: 0, I: 0, S: 0, C: 0 };

    Object.keys(respuestas).forEach(key => {
        const r = respuestas[key];
        if (r.mas && mapeo[r.mas]) {
            puntuaciones[mapeo[r.mas]] += 1;
        }
        if (r.menos && mapeo[r.menos]) {
            puntuaciones[mapeo[r.menos]] -= 1;
        }
    });

    return puntuaciones;
}

function estiloPredominante(puntuaciones) {
    const max = Math.max(...Object.values(puntuaciones));
    return Object.keys(puntuaciones).filter(k => puntuaciones[k] === max);
}

function obtenerEstilo(puntuaciones) {
    const pred = estiloPredominante(puntuaciones);
    return pred.length === 1 ? pred[0] : 'Mixto';
}

function getEstiloDescripcion(estilo) {
    const descripciones = {
        'D': 'Dominante · Orientado a resultados',
        'I': 'Influyente · Orientado a personas',
        'S': 'Estable · Orientado a la cooperación',
        'C': 'Concienzudo · Orientado a la precisión',
        'Mixto': 'Perfil combinado · Sin estilo claramente predominante'
    };
    return descripciones[estilo] || 'No determinado';
}