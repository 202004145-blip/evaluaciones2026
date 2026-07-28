// Utilidades generales
function $(selector, context = document) {
    return context.querySelector(selector);
}

function $$(selector, context = document) {
    return Array.from(context.querySelectorAll(selector));
}

function showScreen(screenId) {
    $$('.screen').forEach(el => el.classList.add('oculto'));
    const screen = document.getElementById(screenId);
    if (screen) screen.classList.remove('oculto');
}

function formatFecha(fecha) {
    if (!fecha) return '';
    const d = new Date(fecha);
    return d.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
}

function decatipo(pd, tabla) {
    if (!tabla || !tabla.length) return 5;
    for (const [valor, dec] of tabla) {
        if (pd <= valor) return dec;
    }
    return tabla[tabla.length - 1][1];
}

function nivelDecatipo(dec) {
    if (dec <= 3) return 'Bajo';
    if (dec <= 7) return 'Medio';
    return 'Alto';
}