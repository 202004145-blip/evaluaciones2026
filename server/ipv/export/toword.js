// server/ipv/export/toWord.js
function generarWord(datos) {
    const { nombre, cargo, fecha, respuestas, puntuaciones } = datos;
    
    let html = `
        <html xmlns:o='urn:schemas-microsoft-com:office:office' 
              xmlns:w='urn:schemas-microsoft-com:office:word' 
              xmlns='http://www.w3.org/TR/REC-html40'>
        <head>
            <meta charset="UTF-8">
            <title>Informe IPV</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 40px; }
                h1 { color: #2B579A; }
                .header { border-bottom: 2px solid #2B579A; padding-bottom: 10px; }
                .section { margin-top: 20px; }
                .puntuacion { background: #f5f5f5; padding: 10px; }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>Informe IPV - Inventario de Personalidad para Vendedores</h1>
                <p><strong>Postulante:</strong> ${nombre}</p>
                <p><strong>Cargo:</strong> ${cargo || 'No especificado'}</p>
                <p><strong>Fecha:</strong> ${fecha}</p>
            </div>
            <div class="section">
                <h2>Puntuaciones</h2>
                <div class="puntuacion">
                    ${Object.entries(puntuaciones).map(([key, val]) => 
                        `<p><strong>${key}:</strong> ${val}</p>`
                    ).join('')}
                </div>
            </div>
            <div class="section">
                <h2>Interpretación</h2>
                <p>${puntuaciones.interpretacion || 'No disponible'}</p>
            </div>
        </body>
        </html>
    `;
    
    return html;
}

module.exports = { generarWord };