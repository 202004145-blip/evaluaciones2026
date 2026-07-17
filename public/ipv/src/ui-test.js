/**
 * src/ui-test.js
 * Lógica de la pantalla 2: renderizado dinámico de las 87 preguntas.
 *
 *   - renderQuestions(): construye el DOM de todas las preguntas.
 *   - Cada cambio de respuesta actualiza state.respuestas y llama saveCurrent().
 *   - updateProgress(): actualiza el contador y la barra de progreso.
 *   - #btn-back-intro: vuelve a la intro (con confirmación si hay respuestas).
 *   - #btn-submit: valida completitud, guarda sesión, descarga informe HTML
 *                  automáticamente y pasa a la pantalla de confirmación.
 */

/* =========================================================
   PANTALLA 2: RENDERIZADO DE PREGUNTAS
   ========================================================= */
function renderQuestions() {
  const cont = $("#questions-container");
  cont.innerHTML = "";
  PREGUNTAS.forEach(p => {
    const div = document.createElement("div");
    div.className = "question unanswered";
    div.id = "q-" + p.n;
    div.dataset.n = p.n;

    let opciones = "";
    for (const [letra, texto] of Object.entries(p.o)) {
      opciones += `
        <label class="option" data-letter="${letra}">
          <input type="radio" name="q${p.n}" value="${letra}" />
          <span class="letter">${letra}.</span>
          <span class="opt-text">${texto}</span>
        </label>`;
    }

    div.innerHTML = `
      <div class="q-number">Pregunta ${p.n} / 87</div>
      <div class="q-text">${p.t}</div>
      <div class="options">${opciones}</div>
    `;
    cont.appendChild(div);

    // Listeners
    div.querySelectorAll('input[type="radio"]').forEach(inp => {
      inp.addEventListener("change", (e) => {
        state.respuestas[p.n] = e.target.value;
        div.classList.remove("unanswered", "flag");
        div.querySelectorAll(".option").forEach(o => o.classList.remove("selected"));
        e.target.closest(".option").classList.add("selected");
        updateProgress();
        saveCurrent(); // autoguardado en cada respuesta
      });
    });
  });
  updateProgress();
}

function updateProgress() {
  const n = Object.keys(state.respuestas).length;
  $("#answered-count").textContent = n;
  $("#progress-fill").style.width = (n / 87 * 100) + "%";
}

$("#btn-back-intro").addEventListener("click", () => {
  if (Object.keys(state.respuestas).length > 0) {
    if (!confirm("¿Volver a la pantalla de datos? Se perderán las respuestas registradas.")) return;
  }
  state.respuestas = {};
  showScreen("screen-intro");
});

$("#btn-submit").addEventListener("click", async () => {
  const faltantes = [];
  PREGUNTAS.forEach(p => {
    const div = $("#q-" + p.n);
    if (!state.respuestas[p.n]) {
      div.classList.add("unanswered", "flag");
      faltantes.push(p.n);
    }
  });

  if (faltantes.length > 0) {
    $("#warn-incomplete").classList.add("show");
    $("#warn-incomplete").textContent =
      `Faltan ${faltantes.length} pregunta${faltantes.length === 1 ? "" : "s"} por responder (marcadas en rojo). ` +
      `Comenzando por la pregunta ${faltantes[0]}.`;
    const primeraFaltante = $("#q-" + faltantes[0]);
    if (primeraFaltante) primeraFaltante.scrollIntoView({ behavior: "smooth", block: "center" });
    return;
  }

  $("#warn-incomplete").classList.remove("show");

  // Esperar a que termine cualquier autoguardado pendiente antes de finalizar
  await saveChain;

  // Guardar la sesión completada en el histórico y limpiar la sesión en curso
  await pushCompleted({ postulante: state.postulante, respuestas: state.respuestas });
  await clearCurrent();

  // Descarga automática del informe completo (respaldo independiente del storage)
  try {
    const evalDataBackup = evalData;
    evalData = { postulante: state.postulante, respuestas: state.respuestas };
    const datos = armarDatosInforme();
    const html = generarHTML(datos);
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    descargarBlob(blob, nombreArchivo("html"));
    evalData = evalDataBackup;
  } catch (e) { console.warn("No se pudo generar la descarga automática:", e); }

  $("#done-summary").innerHTML =
    `Postulante: <strong>${state.postulante.nombre}</strong> · Fecha: ${formatFecha(state.postulante.fecha)}<br>` +
    `<span style="color:#059669; font-size:14px;">📥 Se descargó automáticamente el informe. Envíelo al evaluador.</span>`;
  showScreen("screen-done");

  // Reset del estado para permitir aplicar el test a otro postulante sin recargar
  setTimeout(() => {
    state.postulante = { nombre: "", cargo: "", fecha: "" };
    state.respuestas = {};
    $("#nombre").value = "";
    $("#cargo").value = "";
    const hoy = new Date().toISOString().split("T")[0];
    $("#fecha").value = hoy;
    $("#resume-banner").classList.add("hidden");
  }, 100);
});
