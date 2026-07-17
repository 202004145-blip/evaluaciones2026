/**
 * src/ui-intro.js
 * Lógica de la pantalla 1: datos del postulante + instrucciones + banner
 * de reanudación de sesión en curso.
 *
 * Al iniciar la app:
 *   1. Rellena la fecha de aplicación con la fecha de hoy.
 *   2. Consulta el storage por una sesión en curso.
 *   3. Si existe, muestra el banner de "Sesión sin finalizar detectada".
 *
 * Botones:
 *   #btn-start     — validar datos y pasar al test
 *   #btn-resume    — recuperar sesión guardada
 *   #btn-discard   — borrar sesión guardada
 *   #link-evaluator* — atajo al panel de evaluador desde intro/done
 */

/* =========================================================
   PANTALLA 1: INTRO — Validación y arranque
   ========================================================= */
$("#btn-start").addEventListener("click", () => {
  const nombre = $("#nombre").value.trim();
  const fecha = $("#fecha").value;
  const cargo = $("#cargo").value.trim();

  if (!nombre) { $("#nombre").focus(); alert("Ingrese el nombre completo del postulante."); return; }
  if (!fecha) { $("#fecha").focus(); alert("Ingrese la fecha de aplicación."); return; }

  state.postulante = { nombre, cargo, fecha };
  renderQuestions();
  showScreen("screen-test");
});

$("#link-evaluator").addEventListener("click", (e) => { e.preventDefault(); showScreen("screen-evaluator"); });
$("#link-evaluator-done").addEventListener("click", (e) => { e.preventDefault(); showScreen("screen-evaluator"); });

/* Autoguardado de los inputs del postulante */
["nombre", "cargo", "fecha"].forEach(id => {
  const el = $("#" + id);
  el.addEventListener("input", () => {
    state.postulante.nombre = $("#nombre").value.trim();
    state.postulante.cargo = $("#cargo").value.trim();
    state.postulante.fecha = $("#fecha").value;
    saveCurrent();
  });
});

/* Botones de reanudación */
$("#btn-resume").addEventListener("click", async () => {
  const saved = await loadCurrent();
  if (!saved) return;
  state.postulante = saved.postulante || { nombre: "", cargo: "", fecha: "" };
  state.respuestas = saved.respuestas || {};
  $("#nombre").value = state.postulante.nombre || "";
  $("#cargo").value = state.postulante.cargo || "";
  $("#fecha").value = state.postulante.fecha || "";
  if (!state.postulante.nombre || !state.postulante.fecha) {
    // Falta info del postulante — quedarse en la intro
    $("#resume-banner").classList.add("hidden");
    return;
  }
  renderQuestions();
  // Restaurar las respuestas visualmente
  Object.entries(state.respuestas).forEach(([n, letra]) => {
    const inp = document.querySelector(`input[name="q${n}"][value="${letra}"]`);
    if (inp) {
      inp.checked = true;
      const div = $("#q-" + n);
      if (div) {
        div.classList.remove("unanswered", "flag");
        div.querySelectorAll(".option").forEach(o => o.classList.remove("selected"));
        inp.closest(".option").classList.add("selected");
      }
    }
  });
  updateProgress();
  showScreen("screen-test");
});

$("#btn-discard").addEventListener("click", async () => {
  if (!confirm("¿Descartar la sesión guardada? Se perderá todo el progreso.")) return;
  await clearCurrent();
  state.respuestas = {};
  state.postulante = { nombre: "", cargo: "", fecha: "" };
  $("#nombre").value = "";
  $("#cargo").value = "";
  const hoy = new Date().toISOString().split("T")[0];
  $("#fecha").value = hoy;
  $("#resume-banner").classList.add("hidden");
});

// Inicialización DOM
document.addEventListener("DOMContentLoaded", async () => {
  const hoy = new Date().toISOString().split("T")[0];
  $("#fecha").value = hoy;

  // Detectar sesión pendiente
  const saved = await loadCurrent();
  if (saved && (Object.keys(saved.respuestas || {}).length > 0 || (saved.postulante && saved.postulante.nombre))) {
    const n = Object.keys(saved.respuestas || {}).length;
    $("#resume-nombre").textContent = (saved.postulante && saved.postulante.nombre) || "(sin nombre registrado)";
    $("#resume-progreso").textContent = `${n} de 87 preguntas respondidas`;
    try {
      const d = new Date(saved.lastUpdate);
      $("#resume-fecha").textContent = d.toLocaleString("es-ES", {
        day: "2-digit", month: "2-digit", year: "numeric",
        hour: "2-digit", minute: "2-digit"
      });
    } catch (e) { $("#resume-fecha").textContent = "—"; }
    $("#resume-banner").classList.remove("hidden");
  }

  // Aviso si no hay storage disponible
  if (!HAS_STORAGE) {
    const warn = document.createElement("div");
    warn.style.cssText = "background:#FDF2ED; border:1px solid #E8B8A5; color:#A44A2E; padding:12px 16px; margin-bottom:16px; font-size:13px; border-radius:3px;";
    warn.innerHTML = "<strong>Aviso:</strong> Su navegador no permite almacenamiento local. Las respuestas no se autoguardarán y se perderán si cierra la ventana.";
    $("#screen-intro").insertBefore(warn, $("#screen-intro").firstChild.nextSibling);
  } else {
    // Info discreta sobre qué API se está usando
    const info = document.createElement("div");
    info.style.cssText = "background:#E8EEF4; border-left:3px solid #23405C; padding:8px 14px; margin-bottom:12px; font-size:12px; color:#4A4A52; border-radius:0 3px 3px 0;";
    info.innerHTML = USE_WINDOW_STORAGE
      ? "✓ Almacenamiento persistente activo (API de artefactos Claude). Las respuestas se guardan automáticamente."
      : "✓ Almacenamiento local activo (localStorage). Las respuestas se guardan automáticamente en este navegador.";
    $("#screen-intro").insertBefore(info, $("#screen-intro").firstChild.nextSibling);
  }
});
