import { GRUPOS, FACTORES } from "./datos-test.js";
import { INTERPRETACION_RAPIDA } from "./interpretacion.js";

export const PASSWORD_EVALUADOR = "RRhHcl3veR26";

/* ============================================================
   CALIFICACIÓN (misma lógica del artefacto original)
   ============================================================ */

export function calcularAnalisis(respuestas) {
  const M = { D: 0, I: 0, S: 0, C: 0 };
  const L = { D: 0, I: 0, S: 0, C: 0 };
  const detalle = [];
  GRUPOS.forEach((gr) => {
    const r = respuestas[gr.g] || {};
    if (r.M) M[r.M] += 1;
    if (r.L) L[r.L] += 1;
    detalle.push({
      g: gr.g,
      M: r.M || null,
      L: r.L || null,
      palabraM: r.M ? gr.palabras[r.M] : "—",
      palabraL: r.L ? gr.palabras[r.L] : "—",
    });
  });
  const T = {};
  FACTORES.forEach((f) => (T[f] = M[f] - L[f]));
  const estado = {};
  FACTORES.forEach(
    (f) => (estado[f] = T[f] > 0 ? "ALTO" : T[f] < 0 ? "BAJO" : "LÍNEA MEDIA")
  );

  const orden = [...FACTORES].sort((a, b) => T[b] - T[a]);
  const dominante = orden[0];
  const secundario = orden[1];
  const inferior = orden[3];

  const claves = [];
  if (T[dominante] > 0)
    claves.push({
      clave: `${dominante}+`,
      motivo: `Factor con T más alto (${dominante} = ${fmt(T[dominante])}), por encima de la línea media.`,
    });
  if (dominante !== secundario && T[dominante] !== T[secundario]) {
    const combo = `${dominante}/${secundario}`;
    if (INTERPRETACION_RAPIDA[combo])
      claves.push({
        clave: combo,
        motivo: `Combinación básica: factor más alto (${dominante} = ${fmt(T[dominante])}) sobre el segundo más alto (${secundario} = ${fmt(T[secundario])}).`,
      });
  }
  if (T[inferior] < 0)
    claves.push({
      clave: `${inferior}-`,
      motivo: `Factor con T más bajo (${inferior} = ${fmt(T[inferior])}), por debajo de la línea media.`,
    });
  if (T.D === T.C) {
    if (T.D > 0)
      claves.push({
        clave: "D=C+",
        motivo: `T(D) = T(C) = ${fmt(T.D)}, ambos por encima de la línea media.`,
      });
    else if (T.D < 0)
      claves.push({
        clave: "D=C-",
        motivo: `T(D) = T(C) = ${fmt(T.D)}, ambos por debajo de la línea media.`,
      });
  }

  return {
    M,
    L,
    T,
    estado,
    orden,
    dominante,
    secundario,
    inferior,
    claves,
    detalle,
  };
}

export function fmt(n) {
  return n > 0 ? `+${n}` : `${n}`;
}

export function formatearFecha(iso) {
  if (!iso) return "No registrada";
  const [a, m, d] = String(iso).split("-");
  return d && m && a ? `${d}/${m}/${a}` : String(iso);
}

/* ============================================================
   ALMACENAMIENTO — localStorage (patrón índice + registros)
   ============================================================ */

const KEY_INDEX = "cleaver-index";
const keySesion = (id) => `cleaver-sesion-${id}`;

export const storage = {
  getIndex() {
    try {
      const raw = localStorage.getItem(KEY_INDEX);
      return raw ? JSON.parse(raw) : { sesiones: [] };
    } catch {
      return { sesiones: [] };
    }
  },
  setIndex(idx) {
    localStorage.setItem(KEY_INDEX, JSON.stringify(idx));
  },
  getSesion(id) {
    try {
      const raw = localStorage.getItem(keySesion(id));
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },
  setSesion(id, sesion) {
    localStorage.setItem(keySesion(id), JSON.stringify(sesion));
  },
  deleteSesion(id) {
    localStorage.removeItem(keySesion(id));
    const idx = this.getIndex();
    idx.sesiones = idx.sesiones.filter((s) => s.id !== id);
    this.setIndex(idx);
  },
};
