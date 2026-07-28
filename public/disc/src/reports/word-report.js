// Generador de reporte Word para DISC (HTML con formato Word)
function generarReporteWord(datos) {
    const { nombre, cargo, fecha, respuestas, puntuaciones } = datos;
    const mapeo = window.MAPEO_ESCALAS || {};

    const totales = { D: 0, I: 0, S: 0, C: 0 };
    Object.keys(respuestas).forEach(key => {
        const r = respuestas[key];
        if (r.mas && mapeo[r.mas]) totales[mapeo[r.mas]] += 1;
        if (r.menos && mapeo[r.menos]) totales[mapeo[r.menos]] -= 1;
    });

    const max = Math.max(...Object.values(totales));
    const predominante = Object.keys(totales).filter(k => totales[k] === max)[0] || 'Mixto';

    return `
<html xmlns:o='urn:schemas-microsoft-com:office:office'
      xmlns:w='urn:schemas-microsoft-com:office:word'
      xmlns='http://www.w3.org/TR/REC-html40'>
<head>
    <meta charset="UTF-8">
    <title>Reporte DISC</title>
    <style>
        body { font-family: Arial, sans-serif; font-size: 11pt; padding: 40px; }
        h1 { color: #0f172a; border-bottom: 2px solid #0f172a; }
        table { border-collapse: collapse; width: 100%; margin: 12px 0; }
        th { background: #f1f5f9; border: 1px solid #ccc; padding: 6px; }
        td { border: 1px solid #ccc; padding: 6px; }
        .mas { color: #16a34a; }
        .menos { color: #dc2626; }
        .destacado { background: #f0fdf4; padding: 8px; border: 2px solid #86efac; }
    </style>
</head>
<body>
    <h1>📊 DISC · Perfil de Personalidad</h1>
    <p><strong>Postulante:</strong> ${nombre || 'No especificado'}</p>
    <p><strong>Cargo:</strong> ${cargo || 'No especificado'}</p>
    <p><strong>Fecha:</strong> ${fecha || 'No especificada'}</p>

    <h2>Resultados por escala</h2>
    <table>
        <tr><th>Escala</th><th>Puntuación</th><th>Nivel</th></tr>
        ${['D','I','S','C'].map(escala => `
            <tr><td>${escala}</td><td>${totales[escala]}</td><td>${totales[escala] >= 5 ? 'Alto' : totales[escala] >= 2 ? 'Medio' : 'Bajo'}</td></tr>
        `).join('')}
    </table>

    <div class="destacado">
        <p><strong>Estilo predominante:</strong> ${getEstiloNombre(predominante)} (${predominante})</p>
    </div>

    <h2>Respuestas en bruto</h2>
    ${Object.keys(respuestas).sort((a,b) => parseInt(a)-parseInt(b)).map(key => {
        const r = respuestas[key];
        return `
            <p><strong>Grupo ${parseInt(key)+1}</strong> - MÁS: <span class="mas">${r.mas || '-'}</span> | MENOS: <span class="menos">${r.menos || '-'}</span></p>
        `;
    }).join('')}
</body>
</html>
    `;
}