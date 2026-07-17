/**
 * src/state.js
 * Estado global de la aplicación.
 *
 *   state       — sesión actual del postulante que responde el test
 *   evalData    — sesión que se está viendo/evaluando en el panel evaluador
 *                 (puede ser distinta de `state`; es una copia inmutable
 *                 de una sesión completada o en curso, cargada del storage)
 *   currentEvalSessionId — ID de la sesión mostrada al evaluador
 */

/* =========================================================
   ESTADO DE LA APLICACIÓN
   ========================================================= */
const state = {
  postulante: { nombre: "", cargo: "", fecha: "" },
  respuestas: {},   // { 1: "A", 2: "B", ... }
};
// Sesión completada actualmente mostrada al evaluador (id)
let currentEvalSessionId = null;

// evalData se define en ui-evaluator.js pero lo declaramos aquí para
// mantener el estado global centralizado. Ver src/ui-evaluator.js
let evalData = { postulante: { nombre: "", cargo: "", fecha: "" }, respuestas: {} };
