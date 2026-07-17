// server/ipv/export/toExcel.js
const XLSX = require('xlsx');

function generarExcel(datos) {
    const { nombre, cargo, fecha, respuestas, puntuaciones } = datos;
    
    // Crear libro de Excel
    const wb = XLSX.utils.book_new();
    
    // Hoja 1: Datos del postulante
    const datosPostulante = [
        ['Informe IPV'],
        [''],
        ['Postulante', nombre],
        ['Cargo', cargo || 'No especificado'],
        ['Fecha', fecha],
        ['']
    ];
    
    // Hoja 2: Puntuaciones
    const puntuacionesData = [
        ['Escala', 'Puntuación']
    ];
    Object.entries(puntuaciones).forEach(([key, val]) => {
        puntuacionesData.push([key, val]);
    });
    
    // Hoja 3: Respuestas (si existen)
    let respuestasData = [['Pregunta', 'Respuesta']];
    if (respuestas && respuestas.length > 0) {
        respuestas.forEach((r, i) => {
            respuestasData.push([`Pregunta ${i+1}`, r]);
        });
    }
    
    // Agregar hojas al libro
    const ws1 = XLSX.utils.aoa_to_sheet(datosPostulante);
    XLSX.utils.book_append_sheet(wb, ws1, 'Postulante');
    
    const ws2 = XLSX.utils.aoa_to_sheet(puntuacionesData);
    XLSX.utils.book_append_sheet(wb, ws2, 'Puntuaciones');
    
    if (respuestas && respuestas.length > 0) {
        const ws3 = XLSX.utils.aoa_to_sheet(respuestasData);
        XLSX.utils.book_append_sheet(wb, ws3, 'Respuestas');
    }
    
    return XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' });
}

module.exports = { generarExcel };