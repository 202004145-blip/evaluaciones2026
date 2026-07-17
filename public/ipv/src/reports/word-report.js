/**
 * src/reports/word-report.js
 * Genera un archivo .doc que MS Word puede abrir nativamente.
 *
 * Estrategia:
 *   - Reutilizamos el HTML del informe.
 *   - Lo envolvemos con un encabezado MIME multipart/related que Word
 *     reconoce como formato "Word HTML".
 *   - El archivo se guarda con extensión .doc y MIME application/msword.
 *
 * Al abrirlo con Word:
 *   - Se muestra formateado con los estilos inline del HTML.
 *   - Es editable como cualquier documento .doc.
 *
 * Requiere: generarHTML
 * Expone: generarWord(datos) → string
 */

/* -------- Word (.doc) — HTML con MIME de Word -------- */

function generarWord(datos) {
  // Word abre HTML nativamente si viene con MIME application/msword
  const html = generarHTML(datos);
  // Envolvemos con el header MSO para que Word lo respete al abrir
  const header = `MIME-Version: 1.0
Content-Type: multipart/related; boundary="---=_NextPart_IPV"
X-MimeOLE: Produced By IPV Tool

-----=_NextPart_IPV
Content-Location: file:///informe.htm
Content-Transfer-Encoding: quoted-printable
Content-Type: text/html; charset="utf-8"

`;
  return header + html + "\n-----=_NextPart_IPV--";
}
