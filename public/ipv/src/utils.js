/**
 * src/utils.js
 * Utilidades transversales: selectores DOM, cambio de pantalla,
 * formato de fecha y conversión PD → decatipo.
 *
 * Expone globalmente: $, $$, showScreen, formatFecha, decatipo, nivelDecatipo
 */

/* =========================================================
   UTILIDADES
   ========================================================= */
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

function showScreen(id) {
  ["screen-intro", "screen-test", "screen-done", "screen-evaluator"].forEach(s => {
    $("#" + s).classList.toggle("hidden", s !== id);
  });
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function formatFecha(iso) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

function decatipo(escala, pd) {
  const tabla = DECATIPOS[escala];
  for (let i = 0; i < tabla.length; i++) {
    const [min, max] = tabla[i];
    if (pd >= min && pd <= max) return i + 1;
  }
  return pd < tabla[0][0] ? 1 : 10;
}

function nivelDecatipo(dec) {
  if (dec <= 3) return { label: "Bajo", cls: "bajo", cat: "bajo" };
  if (dec <= 7) return { label: "Medio", cls: "medio", cat: "medio" };
  return { label: "Alto", cls: "alto", cat: "alto" };
}
