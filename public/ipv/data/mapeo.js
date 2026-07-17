/**
 * data/mapeo.js
 * Asignación de cada pregunta a una escala del IPV, más el subconjunto
 * de preguntas que contribuyen al índice DGV.
 *
 * Basado en el análisis de contenidos del manual del IPV.
 * IX confirmado por la hoja de corrección oficial (16, 17, 18, 35, 36, 53, 54, 72).
 * Las demás escalas están asignadas por afinidad temática — para uso clínico
 * o de selección de alta consecuencia, contrastar con la plantilla oficial.
 *
 * Cada pregunta pertenece a exactamente una escala. Total: 87 preguntas.
 *
 * Expone: window.IPV_MAPEO_ESCALAS, window.IPV_ITEMS_DGV
 */

const MAPEO_ESCALAS = {
  I:   [1, 2, 20, 29, 40, 46, 55, 73, 74, 75, 76],
  II:  [3, 4, 21, 22, 34, 39, 47, 48, 59, 77, 86],
  III: [5, 23, 24, 27, 41, 42, 44, 45, 49, 60, 65],
  IV:  [6, 8, 25, 26, 28, 61, 62, 64],
  V:   [9, 10, 30, 33, 37, 57, 58, 63, 81, 82, 87],
  VI:  [7, 11, 12, 19, 31, 32, 38, 51, 56, 66, 84],
  VII: [13, 14, 15, 50, 67, 68, 79, 85],
  VIII:[43, 52, 69, 70, 71, 78, 80, 83],
  IX:  [16, 17, 18, 35, 36, 53, 54, 72]
};

/* Preguntas que contribuyen a DGV (21 items representativos, en la
   plantilla oficial equivalen a la "zona sombreada").
   Distribución aproximada 2–3 por escala. */
const ITEMS_DGV = [1, 3, 5, 10, 14, 17, 19, 20, 24, 26, 30, 34, 38, 42, 52, 55, 62, 65, 68, 70, 77];

window.IPV_MAPEO_ESCALAS = MAPEO_ESCALAS;
window.IPV_ITEMS_DGV = ITEMS_DGV;
