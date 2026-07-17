// server/ipv/export/toHtml.js
function generarHtml(datos) {
    const { nombre, cargo, fecha, respuestas, puntuaciones } = datos;
    
    return `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Informe IPV - ${nombre}</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 40px auto; padding: 20px; }
        h1 { color: #2B579A; border-bottom: 2px solid #2B579A; padding-bottom: 10px; }
        .info { background: #f5f5f5; padding: 15px; border-radius: 5px; }
        .puntuacion { margin: 10px 0; padding: 10px; background: #e8f0fe; }
        .respuesta { margin: 5px 0; padding: 5px; border-bottom: 1px solid #eee; }
    </style>
</head>
<body>
    <h1>Informe IPV</h1>
    <div class="info">
        <p><strong>Postulante:</strong> ${nombre}</p>
        <p><strong>Cargo:</strong> ${cargo || 'No especificado'}</p>
        <p><strong>Fecha:</strong> ${fecha}</p>
    </div>
    <h2>Puntuaciones</h2>
    ${Object.entries(puntuaciones).map(([key, val]) => 
        `<div class="puntuacion"><strong>${key}:</strong> ${val}</div>`
    ).join('')}
    <h2>Interpretación</h2>
    <p>${puntuaciones.interpretacion || 'No disponible'}</p>
</body>
</html>
    `;
}

module.exports = { generarHtml };