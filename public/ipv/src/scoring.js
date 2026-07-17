/**
 * src/scoring.js
 * Cálculo de puntuaciones directas (PD) y decatipos para todas las escalas.
 *
 * Lógica:
 *   1. Cada respuesta del postulante que coincide con la clave
 *      suma 1 punto en la escala correspondiente (MAPEO_ESCALAS).
 *   2. Las respuestas que coinciden con la clave en los 21 items DGV
 *      suman también al índice DGV.
 *   3. R = I + II + III + IV       (dimensión Receptividad)
 *   4. A = V + VI + VII + VIII     (dimensión Agresividad)
 *   5. Cada PD se convierte a decatipo con los baremos mexicanos.
 *
 * Requiere: MAPEO_ESCALAS, ITEMS_DGV, PREGUNTAS, DECATIPOS (globales)
 * Requiere: evalData (para leer las respuestas a puntuar)
 *
 * Expone: calcularPuntuaciones() → { pd: {escala: N}, dec: {escala: 1-10} }
 */

/* =========================================================
   CORRECCIÓN — cómputo de PD, decatipos y niveles
   ========================================================= */
function calcularPuntuaciones() {
  const pd = { I:0, II:0, III:0, IV:0, V:0, VI:0, VII:0, VIII:0, IX:0, DGV:0 };

  // PD por escala: 1 punto por cada match con la clave
  for (const [escala, items] of Object.entries(MAPEO_ESCALAS)) {
    items.forEach(n => {
      const preg = PREGUNTAS.find(p => p.n === n);
      if (preg && evalData.respuestas[n] === preg.k) pd[escala]++;
    });
  }

  // PD DGV: matches en los ítems DGV
  ITEMS_DGV.forEach(n => {
    const preg = PREGUNTAS.find(p => p.n === n);
    if (preg && evalData.respuestas[n] === preg.k) pd.DGV++;
  });

  // R = I + II + III + IV
  pd.R = pd.I + pd.II + pd.III + pd.IV;
  // A = V + VI + VII + VIII
  pd.A = pd.V + pd.VI + pd.VII + pd.VIII;

  // Decatipos
  const dec = {};
  for (const escala of ["DGV","R","A","I","II","III","IV","V","VI","VII","VIII","IX"]) {
    dec[escala] = decatipo(escala, pd[escala]);
  }
  return { pd, dec };
}
