/**
 * src/ui-evaluator.js
 * Panel de evaluador — pantalla 4.
 *
 * Login:
 *   - #btn-unlock verifica la contraseña contra PASSWORD.
 *
 * Selector de sesión:
 *   - Muestra sesiones completadas + sesión en curso (si existe).
 *   - Al cambiar la selección, actualiza `evalData` y re-renderiza.
 *
 * Pestañas (renderizadas al cambiar de sesión):
 *   - Preguntas + respuestas (raw): #panel-raw
 *   - Corrección (PD y decatipos): #panel-scoring
 *   - Interpretación (por escala): #panel-interpretation
 *
 * Herramientas de storage:
 *   - Exportar/importar JSON del histórico
 *   - Eliminar sesión mostrada
 */

/* =========================================================
   PANEL EVALUADOR — Login
   ========================================================= */
$("#btn-unlock").addEventListener("click", tryUnlock);
$("#password").addEventListener("keydown", (e) => { if (e.key === "Enter") tryUnlock(); });
$("#btn-back-from-login").addEventListener("click", () => {
  $("#password").value = "";
  $("#warn-password").classList.remove("show");
  showScreen(Object.keys(state.respuestas).length === 87 ? "screen-done" : "screen-intro");
});

function tryUnlock() {
  const pw = $("#password").value;
  if (pw === PASSWORD) {
    $("#warn-password").classList.remove("show");
    $("#password").value = "";
    $("#eval-login").classList.add("hidden");
    $("#eval-content").classList.remove("hidden");
    renderEvaluator();
  } else {
    $("#warn-password").classList.add("show");
    $("#password").focus();
    $("#password").select();
  }
}

$("#btn-logout").addEventListener("click", () => {
  $("#eval-content").classList.add("hidden");
  $("#eval-login").classList.remove("hidden");
  showScreen("screen-intro");
});

/* Tabs del panel evaluador */
$$(".tab").forEach(tab => {
  tab.addEventListener("click", () => {
    $$(".tab").forEach(t => t.classList.remove("active"));
    $$(".tab-panel").forEach(p => p.classList.remove("active"));
    tab.classList.add("active");
    $("#panel-" + tab.dataset.tab).classList.add("active");
  });
});

/* =========================================================
   RENDER EVALUADOR — con selector de sesiones
   ========================================================= */
// Datos activos que ve el evaluador (copia — no muta state)
let evalData = { postulante: { nombre: "", cargo: "", fecha: "" }, respuestas: {} };

async function renderEvaluator() {
  await populateSessionSelector();
}

async function populateSessionSelector() {
  const select = $("#session-select");
  const completed = await getCompleted();
  // Ordenar por fecha desc
  completed.sort((a, b) => (b.completedAt || "").localeCompare(a.completedAt || ""));

  const inProgress = await loadCurrent();
  const options = [];

  if (completed.length === 0 && !inProgress) {
    select.innerHTML = '<option value="">— No hay sesiones registradas —</option>';
    select.disabled = true;
    evalData = { postulante: { nombre: "", cargo: "", fecha: "" }, respuestas: {} };
    currentEvalSessionId = null;
    $("#session-summary").textContent = "Aún no se ha completado ningún cuestionario en este dispositivo.";
    renderEvalPanels();
    return;
  }

  select.disabled = false;

  if (inProgress && Object.keys(inProgress.respuestas || {}).length > 0) {
    const n = Object.keys(inProgress.respuestas).length;
    const nombre = (inProgress.postulante && inProgress.postulante.nombre) || "(sin nombre)";
    options.push(`<option value="__current__">⏳ EN CURSO — ${nombre} (${n}/87)</option>`);
  }

  completed.forEach(s => {
    const nombre = (s.postulante && s.postulante.nombre) || "(sin nombre)";
    const fechaApp = formatFecha(s.postulante && s.postulante.fecha) || "s/f";
    const fechaCompl = s.completedAt ? new Date(s.completedAt).toLocaleDateString("es-ES") : "";
    options.push(`<option value="${s.id}">✓ ${nombre} — aplicación ${fechaApp} · finalizado ${fechaCompl}</option>`);
  });

  select.innerHTML = options.join("");
  select.value = currentEvalSessionId && [...select.options].some(o => o.value === currentEvalSessionId)
    ? currentEvalSessionId
    : select.options[0].value;
  currentEvalSessionId = select.value;

  await loadEvalSession();
}

async function loadEvalSession() {
  const id = $("#session-select").value;
  currentEvalSessionId = id;

  if (id === "__current__") {
    const cur = await loadCurrent();
    if (cur) {
      evalData = { postulante: cur.postulante || {}, respuestas: cur.respuestas || {} };
      $("#session-summary").textContent = "Sesión en curso (sin finalizar). Los resultados son parciales.";
    }
  } else if (id) {
    const list = await getCompleted();
    const s = list.find(x => x.id === id);
    if (s) {
      evalData = { postulante: s.postulante, respuestas: s.respuestas };
      const compl = s.completedAt ? new Date(s.completedAt).toLocaleString("es-ES") : "—";
      $("#session-summary").textContent = `ID de sesión: ${s.id} · Finalizado: ${compl}`;
    }
  } else {
    evalData = { postulante: {}, respuestas: {} };
  }

  renderEvalPanels();
}

function renderEvalPanels() {
  $("#meta-nombre").textContent = evalData.postulante.nombre || "— sin registrar —";
  $("#meta-cargo").textContent = evalData.postulante.cargo || "—";
  $("#meta-fecha").textContent = formatFecha(evalData.postulante.fecha) || "—";
  const nResp = Object.keys(evalData.respuestas).length;
  $("#meta-count").textContent = `${nResp} de 87`;

  renderRawList();
  renderAnswersGrid();
  renderScoring();
  renderInterpretation();
}

// Listeners del selector y botones
document.addEventListener("DOMContentLoaded", () => {
  $("#session-select").addEventListener("change", loadEvalSession);

  $("#btn-delete-session").addEventListener("click", async () => {
    if (!currentEvalSessionId || currentEvalSessionId === "__current__") {
      alert("Sólo se pueden eliminar sesiones ya finalizadas.");
      return;
    }
    if (!confirm("¿Eliminar esta sesión del historial? Esta acción no puede deshacerse.")) return;
    await deleteCompleted(currentEvalSessionId);
    currentEvalSessionId = null;
    await populateSessionSelector();
  });

  $("#btn-export").addEventListener("click", async () => {
    const data = {
      exportedAt: new Date().toISOString(),
      version: 1,
      sessions: await getCompleted()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `IPV_sesiones_${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  });

  $("#btn-import").addEventListener("click", () => $("#file-import").click());

  $("#file-import").addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        const sessions = data.sessions || (Array.isArray(data) ? data : []);
        if (!sessions.length) { alert("El archivo no contiene sesiones válidas."); return; }
        const added = await importCompleted(sessions);
        alert(`Importación completada. Se agregaron ${added} sesión(es) nueva(s).`);
        await populateSessionSelector();
      } catch (err) {
        alert("No se pudo leer el archivo: " + err.message);
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  });
});

function renderRawList() {
  const cont = $("#raw-list");
  cont.innerHTML = "";
  PREGUNTAS.forEach(p => {
    const respuesta = evalData.respuestas[p.n] || null;
    const acierto = respuesta === p.k;

    let opts = "";
    for (const [letra, texto] of Object.entries(p.o)) {
      const esClave = letra === p.k;
      opts += `<div>${esClave
        ? `<span class="key-answer">${letra}.</span> ${texto}`
        : `<strong>${letra}.</strong> ${texto}`
      }</div>`;
    }

    let ansHTML = "";
    if (respuesta) {
      ansHTML = `<span class="postulant-ans">
        Respuesta del postulante: <strong>${respuesta}</strong>
        ${acierto ? '<span class="match">✓ coincide con clave</span>' : '<span class="nomatch">(no puntúa)</span>'}
      </span>`;
    } else {
      ansHTML = `<span class="postulant-ans" style="color:var(--warn)"><em>Sin responder</em></span>`;
    }

    const div = document.createElement("div");
    div.className = "raw-question";
    div.innerHTML = `
      <div><span class="num-tag">${p.n}</span><span style="font-weight:600">${p.t}</span></div>
      <div class="opts-inline" style="margin-top:6px;">${opts}</div>
      ${ansHTML}
    `;
    cont.appendChild(div);
  });
}

function renderAnswersGrid() {
  const cont = $("#answers-grid");
  cont.innerHTML = "";
  PREGUNTAS.forEach(p => {
    const r = evalData.respuestas[p.n];
    const cell = document.createElement("div");
    cell.className = "ans-cell" + (r ? "" : " empty");
    cell.innerHTML = `<span class="num">${p.n}</span><span class="letter-big">${r || "—"}</span>`;
    cont.appendChild(cell);
  });
}

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

function renderScoring() {
  const { pd, dec } = calcularPuntuaciones();
  const tbody = $("#scoring-tbody");
  tbody.innerHTML = "";

  const orden = [
    { k: "DGV", high: true },
    { k: "R", high: true },
    { k: "A", high: true },
    { k: "I" }, { k: "II" }, { k: "III" }, { k: "IV" },
    { k: "V" }, { k: "VI" }, { k: "VII" }, { k: "VIII" }, { k: "IX" }
  ];

  orden.forEach(({ k, high }) => {
    const esc = ESCALAS[k];
    const nivel = nivelDecatipo(dec[k]);
    const tr = document.createElement("tr");
    if (high) tr.className = "highlight-row";
    tr.innerHTML = `
      <td><span class="scale-name">${esc.corta}</span> <span class="text-mute" style="font-size:12px;">${esc.nombre.split("—")[1] || ""}</span></td>
      <td class="num">${pd[k]}</td>
      <td class="num text-mute">${esc.max}</td>
      <td class="decatipo-cell deca-${nivel.cls}">${dec[k]}</td>
      <td><span class="level-badge ${nivel.cls}">${nivel.label}</span></td>
    `;
    tbody.appendChild(tr);
  });
}

/* =========================================================
   INTERPRETACIÓN
   ========================================================= */
function renderInterpretation() {
  const { pd, dec } = calcularPuntuaciones();
  const cont = $("#interp-list");
  cont.innerHTML = "";

  const orden = ["DGV", "R", "A", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX"];

  orden.forEach(k => {
    const esc = ESCALAS[k];
    const nivel = nivelDecatipo(dec[k]);
    const descripcion = esc["desc_" + nivel.cat];

    const card = document.createElement("div");
    card.className = "interp-card";
    card.innerHTML = `
      <div class="card-head">
        <div>
          <div class="scale-label">${esc.nombre}</div>
          <span class="level-badge ${nivel.cls}">${nivel.label} · Decatipo ${dec[k]}</span>
        </div>
        <div class="metrics">
          <span>PD: <strong>${pd[k]}</strong>/${esc.max}</span>
          <span>Decatipo: <strong>${dec[k]}</strong>/10</span>
        </div>
      </div>
      <p class="desc">${descripcion}</p>
    `;
    cont.appendChild(card);
  });

  // Nota metodológica
  const nota = document.createElement("div");
  nota.style.cssText = "background: #FEF3C7; border-left: 3px solid #78350F; padding: 16px 20px; margin-top: 20px; border-radius: 3px; font-size: 13px; color: #78350F;";
  nota.innerHTML = `
    <strong>Nota metodológica —</strong> La corrección automática utiliza los baremos mexicanos del manual del IPV (n = 300) 
    y una asignación pregunta-escala basada en el análisis de contenidos del manual. La escala IX (Sociabilidad) coincide 
    con la clave del manual de corrección. Para uso clínico o de selección de alta consecuencia, se recomienda contrastar 
    la asignación pregunta-escala con la plantilla oficial del editor.
  `;
  cont.appendChild(nota);
}
