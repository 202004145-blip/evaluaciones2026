// Generador de reporte HTML para DISC
function generarReporteHTML(datos) {
    const { nombre, cargo, fecha, respuestas, puntuaciones } = datos;
    const mapeo = window.MAPEO_ESCALAS || {};

    // Calcular totales
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

    // Encontrar estilo predominante
    const max = Math.max(...Object.values(totales));
    const predominante = Object.keys(totales).filter(k => totales[k] === max)[0] || 'Mixto';

    // HTML
    return `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reporte DISC - ${nombre}</title>
    <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; max-width: 1100px; margin: 40px auto; padding: 20px; background: #f8fafc; }
        .container { background: white; border-radius: 16px; padding: 40px; box-shadow: 0 4px 20px rgba(0,0,0,0.06); }
        h1 { color: #0f172a; border-bottom: 3px solid #0f172a; padding-bottom: 12px; }
        .header { margin-bottom: 24px; }
        .header p { color: #64748b; margin: 4px 0; }
        .seccion { margin: 24px 0; }
        .seccion h2 { font-size: 18px; color: #0f172a; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; }
        table { width: 100%; border-collapse: collapse; margin: 12px 0; }
        th { background: #f1f5f9; text-align: left; padding: 10px; font-weight: 600; }
        td { padding: 10px; border-bottom: 1px solid #e2e8f0; }
        .grupo { border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; margin-bottom: 8px; }
        .palabras { display: flex; flex-wrap: wrap; gap: 8px; }
        .palabra { padding: 4px 12px; border-radius: 4px; background: #f1f5f9; }
        .mas { color: #16a34a; font-weight: 600; }
        .menos { color: #dc2626; font-weight: 600; }
        .predominante { background: #f0fdf4; border: 2px solid #86efac; border-radius: 8px; padding: 16px; margin: 16px 0; }
        .predominante h3 { color: #166534; margin: 0; }
    </style>
</head>
<body>
    <div class="container">
        <h1>📊 DISC · Perfil de Personalidad</h1>
        <div class="header">
            <p><strong>Postulante:</strong> ${nombre || 'No especificado'}</p>
            <p><strong>Cargo:</strong> ${cargo || 'No especificado'}</p>
            <p><strong>Fecha:</strong> ${fecha || 'No especificada'}</p>
        </div>

        <div class="seccion">
            <h2>📋 Resultados por escala</h2>
            <table>
                <tr><th>Escala</th><th>Puntuación</th><th>Nivel</th></tr>
                ${['D','I','S','C'].map(escala => `
                    <tr>
                        <td><strong>${escala}</strong> - ${getEstiloNombre(escala)}</td>
                        <td>${totales[escala]}</td>
                        <td>${totales[escala] >= 5 ? 'Alto' : totales[escala] >= 2 ? 'Medio' : 'Bajo'}</td>
                    </tr>
                `).join('')}
            </table>
        </div>

        <div class="predominante">
            <h3>🎯 Estilo predominante: ${getEstiloNombre(predominante)} (${predominante})</h3>
            <p>${getEstiloDescripcion(predominante)}</p>
        </div>

        <div class="seccion">
            <h2>📝 Respuestas en bruto</h2>
            ${Object.keys(respuestas).sort((a,b) => parseInt(a)-parseInt(b)).map(key => {
                const r = respuestas[key];
                return `
                    <div class="grupo">
                        <strong>Grupo ${parseInt(key)+1}</strong>
                        <div class="palabras">
                            ${Object.keys(r).map(tipo => 
                                `<span class="${tipo === 'mas' ? 'mas' : 'menos'}">${tipo === 'mas' ? 'MÁS' : 'MENOS'}: ${r[tipo]}</span>`
                            ).join(' ')}
                        </div>
                    </div>
                `;
            }).join('')}
        </div>
    </div>
</body>
</html>
    `;
}