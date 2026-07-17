/**
 * src/reports/helpers.js
 * Utilidades compartidas por los generadores de informe HTML/Word/Excel.
 *
 *   slugNombre(nombre)     — normaliza un nombre para usarlo como filename
 *   nombreArchivo(ext)     — construye el filename del informe
 *   descargarBlob(blob,fn) — dispara la descarga de un Blob
 *   escapeHTML(str)        — escapa caracteres especiales para HTML
 *   armarDatosInforme()    — construye el objeto {postulante, respuestas,
 *                            correccion, interpretacion, ...} usado por los
 *                            tres generadores.
 *   escalaDeItem(n)        — devuelve el nombre de la escala a la que pertenece
 *                            la pregunta n.
 *
 * Requiere: evalData, PREGUNTAS, ESCALAS, MAPEO_ESCALAS, calcularPuntuaciones,
 *           nivelDecatipo, formatFecha
 */

function slugNombre(nombre) {
  return (nombre || "sin_nombre")
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40);
}

function nombreArchivo(ext) {
  const nombre = slugNombre(evalData.postulante && evalData.postulante.nombre);
  const fecha = (evalData.postulante && evalData.postulante.fecha) || new Date().toISOString().slice(0,10);
  return `IPV_${nombre}_${fecha}.${ext}`;
}

function descargarBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 100);
}

/* -------- Datos comunes a los tres formatos -------- */

function armarDatosInforme() {
  const { pd, dec } = calcularPuntuaciones();
  const post = evalData.postulante || {};
  const nResp = Object.keys(evalData.respuestas).length;

  // Respuestas en bruto
  const respuestas = PREGUNTAS.map(p => {
    const r = evalData.respuestas[p.n] || "";
    const acierto = r === p.k;
    return {
      n: p.n,
      texto: p.t,
      opciones: p.o,
      clave: p.k,
      respuesta: r,
      acierto,
      escala: escalaDeItem(p.n)
    };
  });

  // Corrección (tabla de PDs)
  const orden = ["DGV", "R", "A", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX"];
  const correccion = orden.map(k => {
    const nivel = nivelDecatipo(dec[k]);
    return {
      escala: ESCALAS[k].nombre,
      corta: k,
      pd: pd[k],
      max: ESCALAS[k].max,
      decatipo: dec[k],
      nivel: nivel.label
    };
  });

  // Interpretación
  const interpretacion = orden.map(k => {
    const nivel = nivelDecatipo(dec[k]);
    return {
      escala: ESCALAS[k].nombre,
      corta: k,
      pd: pd[k],
      max: ESCALAS[k].max,
      decatipo: dec[k],
      nivel: nivel.label,
      descripcion: ESCALAS[k]["desc_" + nivel.cat]
    };
  });

  return {
    postulante: post,
    respondidas: nResp,
    respuestas,
    correccion,
    interpretacion,
    fechaInforme: new Date().toLocaleString("es-ES")
  };
}

function escalaDeItem(n) {
  for (const [esc, items] of Object.entries(MAPEO_ESCALAS)) {
    if (items.includes(n)) return esc;
  }
  return "";
}

/* -------- Escape de HTML para inserción segura en templates -------- */

function escapeHTML(str) {
  if (str == null) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
