// Generador de reporte Excel para DISC (CSV compatible)
function generarReporteExcel(datos) {
    const { nombre, cargo, fecha, respuestas, puntuaciones } = datos;
    const mapeo = window.MAPEO_ESCALAS || {};

    let csv = 'DISC - Perfil de Personalidad\n';
    csv += `Postulante,${nombre || ''}\n`;
    csv += `Cargo,${cargo || ''}\n`;
    csv += `Fecha,${fecha || ''}\n\n`;

    // Cabecera de respuestas
    csv += 'Grupo,MÁS,MENOS\n';
    Object.keys(respuestas).sort((a,b) => parseInt(a)-parseInt(b)).forEach(key => {
        const r = respuestas[key];
        csv += `${parseInt(key)+1},${r.mas || ''},${r.menos || ''}\n`;
    });

    // Puntuaciones
    csv += '\nPuntuaciones por escala\n';
    csv += 'Escala,Puntuación,Nivel\n';
    const totales = { D: 0, I: 0, S: 0, C: 0 };
    Object.keys(respuestas).forEach(key => {
        const r = respuestas[key];
        if (r.mas && mapeo[r.mas]) totales[mapeo[r.mas]] += 1;
        if (r.menos && mapeo[r.menos]) totales[mapeo[r.menos]] -= 1;
    });

    ['D','I','S','C'].forEach(escala => {
        const nivel = totales[escala] >= 5 ? 'Alto' : totales[escala] >= 2 ? 'Medio' : 'Bajo';
        csv += `${escala},${totales[escala]},${nivel}\n`;
    });

    return csv;
}