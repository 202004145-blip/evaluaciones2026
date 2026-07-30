// Cliente de la API del servidor (Express + SQLite). Reemplaza al antiguo
// almacenamiento en localStorage: ahora las respuestas y los resultados viven
// en el servidor, así el evaluador los ve desde cualquier dispositivo.

async function req(path, { method = "GET", body, auth = false } = {}) {
  const opts = { method, headers: {} };
  if (body !== undefined) {
    opts.headers["Content-Type"] = "application/json";
    opts.body = JSON.stringify(body);
  }
  // Las rutas protegidas del evaluador usan la cookie de sesión del servidor.
  if (auth) opts.credentials = "include";
  const res = await fetch(path, opts);
  let data = null;
  try {
    data = await res.json();
  } catch {
    /* respuesta sin cuerpo JSON */
  }
  if (!res.ok) {
    const err = new Error((data && data.error) || `Error ${res.status}`);
    err.status = res.status;
    err.code = data && data.code;
    throw err;
  }
  return data;
}

/* ===================== Evaluado (público) ===================== */

export const apiEvaluado = {
  crearSesion(datos) {
    return req("/api/cleaver/sesiones", { method: "POST", body: datos });
  },
  cargarSesion(folio, token) {
    return req(`/api/cleaver/sesiones/${folio}?token=${encodeURIComponent(token)}`);
  },
  guardarRespuesta(folio, token, grupo, { mas = null, menos = null }) {
    return req(`/api/cleaver/sesiones/${folio}/respuestas/${grupo}`, {
      method: "PUT",
      body: { token, mas, menos },
    });
  },
  finalizar(folio, token, datos) {
    return req(`/api/cleaver/sesiones/${folio}/finalizar`, {
      method: "POST",
      body: { token, ...datos },
    });
  },
};

/* ===================== Evaluador (protegido) ===================== */

export const apiEvaluador = {
  login(usuario, password) {
    return req("/api/auth/login", { method: "POST", body: { usuario, password }, auth: true });
  },
  logout() {
    return req("/api/auth/logout", { method: "POST", auth: true });
  },
  sesionActual() {
    return req("/api/auth/me", { auth: true });
  },
  listar() {
    return req("/api/cleaver/resultados", { auth: true });
  },
  reporte(folio) {
    return req(`/api/cleaver/resultados/${folio}`, { auth: true });
  },
  eliminar(folio) {
    return req(`/api/cleaver/resultados/${folio}`, { method: "DELETE", auth: true });
  },
  recalificarTodo() {
    return req("/api/cleaver/resultados/recalificar-todo", { method: "POST", auth: true });
  },
};

/* ===================== Sesión activa del evaluado ===================== */
// Solo guardamos localmente el puntero (folio + token) para poder reanudar si
// se recarga la página. Las respuestas viven en el servidor.

const KEY_ACTIVA = "cleaver-sesion-activa";

export const sesionActiva = {
  get() {
    try {
      const raw = localStorage.getItem(KEY_ACTIVA);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },
  set(folio, token) {
    localStorage.setItem(KEY_ACTIVA, JSON.stringify({ folio, token }));
  },
  clear() {
    localStorage.removeItem(KEY_ACTIVA);
  },
};

/* ===================== Utilidades de formato ===================== */

export function fmt(n) {
  return n > 0 ? `+${n}` : `${n}`;
}

export function formatearFecha(iso) {
  if (!iso) return "No registrada";
  const [a, m, d] = String(iso).split("-");
  return d && m && a ? `${d}/${m}/${a}` : String(iso);
}
