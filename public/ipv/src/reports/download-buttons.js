/**
 * src/reports/download-buttons.js
 * Conecta los botones del panel evaluador con los generadores de informe.
 *
 * Botones (en el HTML):
 *   #btn-download-html  — descarga informe.html
 *   #btn-download-word  — descarga informe.doc
 *   #btn-download-excel — descarga informe.xlsx
 *
 * Cada handler:
 *   1. Verifica que haya una sesión seleccionada (validarSesionParaDescarga).
 *   2. Construye los datos del informe (armarDatosInforme).
 *   3. Genera el contenido en el formato apropiado.
 *   4. Dispara la descarga (descargarBlob).
 */

/* -------- Botones -------- */

document.addEventListener("DOMContentLoaded", () => {
  $("#btn-download-html").addEventListener("click", () => {
    if (!validarSesionParaDescarga()) return;
    const datos = armarDatosInforme();
    const html = generarHTML(datos);
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    descargarBlob(blob, nombreArchivo("html"));
  });

  $("#btn-download-word").addEventListener("click", () => {
    if (!validarSesionParaDescarga()) return;
    const datos = armarDatosInforme();
    const contenido = generarWord(datos);
    const blob = new Blob([contenido], { type: "application/msword;charset=utf-8" });
    descargarBlob(blob, nombreArchivo("doc"));
  });

  $("#btn-download-excel").addEventListener("click", () => {
    if (!validarSesionParaDescarga()) return;
    const datos = armarDatosInforme();
    const buffer = generarExcel(datos);
    if (!buffer) return;
    const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    descargarBlob(blob, nombreArchivo("xlsx"));
  });
});

function validarSesionParaDescarga() {
  if (!evalData || !evalData.postulante || !evalData.postulante.nombre) {
    alert("No hay una sesión seleccionada para descargar. Elija una sesión en el selector de arriba.");
    return false;
  }
  return true;
}
