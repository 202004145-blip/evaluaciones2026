import React, { useState, useEffect, useCallback } from "react";
import * as XLSX from "xlsx";
import { BLOQUES, GRUPOS, FACTORES, NOMBRE_FACTOR } from "./datos-test.js";
import { INTERPRETACION_RAPIDA, MOTIVACION, LIMITACIONES } from "./interpretacion.js";
import {
  calcularAnalisis,
  fmt,
  formatearFecha,
  storage,
  PASSWORD_EVALUADOR,
} from "./calificacion.js";

const cx = (...c) => c.filter(Boolean).join(" ");

/* ============================================================
   HOJA DE RESPUESTAS (formato tradicional del Excel)
   ============================================================ */

function HojaRespuestas({ sesion, onResponder, soloLectura = false }) {
  const marcar = (grupoNum, factor, tipo) => {
    if (soloLectura) return;
    const actual = sesion.respuestas[grupoNum] || {};
    const nueva = { ...actual, [tipo]: factor };
    // No puede ser la misma palabra en M y en L
    if (tipo === "M" && nueva.L === factor) delete nueva.L;
    if (tipo === "L" && nueva.M === factor) delete nueva.M;
    onResponder(grupoNum, nueva);
  };

  const filaBloque = (bloque, filaIdx) => (
    <tr key={filaIdx}>
      {bloque.map((grupo, colIdx) => {
        const factor = FACTORES[filaIdx];
        const palabra = grupo.palabras[factor];
        const r = sesion.respuestas[grupo.g] || {};
        const esM = r.M === factor;
        const esL = r.L === factor;
        return (
          <React.Fragment key={colIdx}>
            <td className="border border-slate-400 px-2 py-1.5 text-sm bg-white">
              <span className="text-slate-500 text-xs mr-1">{grupo.g}.</span>
              {palabra}
            </td>
            <td className="border border-slate-400 p-0 w-11 text-center bg-white">
              <button
                onClick={() => marcar(grupo.g, factor, "M")}
                disabled={soloLectura}
                className={cx(
                  "w-full h-9 text-sm font-bold transition-colors",
                  esM ? "bg-slate-800 text-white" : "hover:bg-slate-100 text-slate-300",
                  soloLectura && "cursor-default"
                )}
                aria-label={`Marcar MÁS: ${palabra}`}
              >
                {esM ? "X" : ""}
              </button>
            </td>
            <td className="border border-slate-400 p-0 w-11 text-center bg-white">
              <button
                onClick={() => marcar(grupo.g, factor, "L")}
                disabled={soloLectura}
                className={cx(
                  "w-full h-9 text-sm font-bold transition-colors",
                  esL ? "bg-amber-500 text-white" : "hover:bg-slate-100 text-slate-300",
                  soloLectura && "cursor-default"
                )}
                aria-label={`Marcar MENOS: ${palabra}`}
              >
                {esL ? "X" : ""}
              </button>
            </td>
          </React.Fragment>
        );
      })}
    </tr>
  );

  return (
    <div className="overflow-x-auto">
      {BLOQUES.map((bloque, i) => (
        <table
          key={i}
          className="w-full border-collapse mb-6 min-w-[720px]"
          style={{ tableLayout: "fixed" }}
        >
          <thead>
            <tr>
              {bloque.map((_, j) => (
                <React.Fragment key={j}>
                  <th className="border border-slate-400 bg-slate-100 py-1"></th>
                  <th className="border border-slate-400 bg-slate-100 py-1 text-xs font-bold w-11">MÁS</th>
                  <th className="border border-slate-400 bg-slate-100 py-1 text-xs font-bold w-11">MENOS</th>
                </React.Fragment>
              ))}
            </tr>
          </thead>
          <tbody>{FACTORES.map((_, filaIdx) => filaBloque(bloque, filaIdx))}</tbody>
        </table>
      ))}
    </div>
  );
}

/* ============================================================
   COMPONENTES BÁSICOS
   ============================================================ */

const Boton = ({ children, onClick, disabled, variante = "primario", className }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={cx(
      "px-5 py-2.5 rounded-md text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500 disabled:opacity-40 disabled:cursor-not-allowed",
      variante === "primario" && "bg-slate-800 text-white hover:bg-slate-700",
      variante === "secundario" && "bg-white text-slate-700 border border-slate-300 hover:bg-slate-50",
      variante === "sutil" && "text-slate-500 hover:text-slate-800",
      className
    )}
  >
    {children}
  </button>
);

const Tarjeta = ({ children, className }) => (
  <div className={cx("bg-white border border-slate-200 rounded-lg shadow-sm", className)}>
    {children}
  </div>
);

const Etiqueta = ({ children, tono = "gris" }) => (
  <span
    className={cx(
      "inline-block px-2 py-0.5 rounded text-xs font-semibold tracking-wide",
      tono === "alto" && "bg-emerald-50 text-emerald-700 border border-emerald-200",
      tono === "bajo" && "bg-amber-50 text-amber-700 border border-amber-200",
      tono === "gris" && "bg-slate-100 text-slate-600 border border-slate-200"
    )}
  >
    {children}
  </span>
);

function GraficaPerfil({ M, L, T }) {
  const series = [
    { titulo: "M", datos: M, min: 0, max: 24 },
    { titulo: "L", datos: L, min: 0, max: 24 },
    { titulo: "T = M − L", datos: T, min: -24, max: 24, lineaMedia: 0 },
  ];
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {series.map((s) => {
        const alto = 140;
        const escala = (v) => alto - ((v - s.min) / (s.max - s.min)) * alto;
        const puntos = FACTORES.map((f, i) => ({
          x: 20 + i * 40, y: escala(s.datos[f]), v: s.datos[f], f,
        }));
        return (
          <div key={s.titulo} className="border border-slate-200 rounded-md p-3">
            <div className="text-xs font-semibold text-slate-500 mb-2">{s.titulo}</div>
            <svg viewBox="0 0 180 160" className="w-full">
              {s.lineaMedia !== undefined && (
                <line x1="0" x2="180" y1={escala(0)} y2={escala(0)}
                  stroke="#94a3b8" strokeDasharray="4 3" strokeWidth="1" />
              )}
              <polyline points={puntos.map((p) => `${p.x},${p.y}`).join(" ")}
                fill="none" stroke="#334155" strokeWidth="2" />
              {puntos.map((p) => (
                <g key={p.f}>
                  <circle cx={p.x} cy={p.y} r="4" fill="#334155" />
                  <text x={p.x} y={155} textAnchor="middle" fontSize="11" fill="#64748b">{p.f}</text>
                  <text x={p.x} y={p.y - 8} textAnchor="middle" fontSize="10" fill="#0f172a">{p.v}</text>
                </g>
              ))}
            </svg>
          </div>
        );
      })}
    </div>
  );
}

/* ============================================================
   ENCABEZADO — solo el nombre del test
   ============================================================ */

function EncabezadoHoja() {
  return (
    <div className="mb-6 border-b-2 border-slate-800 pb-4">
      <h1 className="text-4xl font-bold tracking-widest text-slate-800">TEST DE CLEAVER</h1>
    </div>
  );
}

/* ============================================================
   VISTA DEL EVALUADO
   ============================================================ */

function VistaEvaluado({ onIrEvaluador }) {
  const [fase, setFase] = useState("inicio");
  const [datos, setDatos] = useState({
    nombre: "",
    puesto: "",
    fecha: new Date().toISOString().slice(0, 10),
  });
  const [sesion, setSesion] = useState(null);
  const [error, setError] = useState("");
  const [reanudable, setReanudable] = useState(null);

  const comenzar = () => {
    if (!datos.nombre.trim()) { setError("Escriba su nombre completo para comenzar."); return; }
    setError("");
    const idx = storage.getIndex();
    const pendiente = idx.sesiones.find(
      (s) => !s.completado && s.datos?.nombre?.trim().toLowerCase() === datos.nombre.trim().toLowerCase()
    );
    if (pendiente) { setReanudable(pendiente); return; }
    crearNueva();
  };

  const crearNueva = () => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const limpio = Object.fromEntries(
      Object.entries(datos).map(([k, v]) => [k, typeof v === "string" ? v.trim() : v])
    );
    const nueva = { id, datos: limpio, creado: new Date().toISOString(), respuestas: {}, completado: false };
    storage.setSesion(id, nueva);
    const idx = storage.getIndex();
    idx.sesiones.push({ id, datos: limpio, creado: nueva.creado, completado: false });
    storage.setIndex(idx);
    setSesion(nueva); setFase("test"); setReanudable(null);
  };

  const reanudar = () => {
    const d = storage.getSesion(reanudable.id);
    if (!d) { setReanudable(null); crearNueva(); return; }
    setSesion(d); setFase("test"); setReanudable(null);
  };

  const responder = (grupo, respuesta) => {
    const actualizada = { ...sesion, respuestas: { ...sesion.respuestas, [grupo]: respuesta } };
    setSesion(actualizada);
    try { storage.setSesion(sesion.id, actualizada); setError(""); }
    catch { setError("Advertencia: no se pudo guardar la última respuesta."); }
  };

  const finalizar = () => {
    const incompletos = GRUPOS.filter((gr) => {
      const r = sesion.respuestas[gr.g] || {};
      return !r.M || !r.L;
    });
    if (incompletos.length > 0) {
      setError(`Faltan por marcar ${incompletos.length} grupo(s). Debe seleccionar una palabra MÁS y una MENOS en cada uno de los 24 grupos.`);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    const final = { ...sesion, completado: true, finalizado: new Date().toISOString() };
    storage.setSesion(sesion.id, final);
    const idx = storage.getIndex();
    idx.sesiones = idx.sesiones.map((s) => (s.id === sesion.id ? { ...s, completado: true } : s));
    storage.setIndex(idx);
    setFase("fin");
  };

  if (fase === "fin") {
    return (
      <div className="max-w-lg mx-auto mt-24 text-center px-6">
        <div className="text-5xl mb-4 text-emerald-600">✓</div>
        <h1 className="text-2xl font-semibold text-slate-800 mb-3">Gracias por sus respuestas</h1>
        <p className="text-slate-500">Su cuestionario ha sido registrado correctamente. Puede cerrar esta ventana.</p>
      </div>
    );
  }

  if (fase === "test" && sesion) {
    const completos = GRUPOS.filter((gr) => {
      const r = sesion.respuestas[gr.g] || {};
      return r.M && r.L;
    }).length;
    return (
      <div className="max-w-5xl mx-auto px-4 py-8">
        <EncabezadoHoja />

        {/* Datos del postulante */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-4 text-sm">
          <div><span className="font-semibold">Nombre:</span> {sesion.datos.nombre}</div>
          <div><span className="font-semibold">Cargo al que postula:</span> {sesion.datos.puesto || "—"}</div>
          <div><span className="font-semibold">Fecha de administración:</span> {formatearFecha(sesion.datos.fecha)}</div>
        </div>

        {/* Instrucciones */}
        <div className="bg-slate-50 border border-slate-200 rounded p-4 mb-6">
          <div className="font-bold text-slate-800 mb-1">Instrucciones</div>
          <p className="text-sm text-slate-700">
            Las palabras descriptivas que verá a continuación se encuentran agrupadas en series de cuatro; examine las palabras de cada serie y marque una <strong>X</strong> bajo la columna <strong>MÁS</strong> en la palabra que mejor describa su forma de ser o de comportarse. Después marque una <strong>X</strong> bajo la columna <strong>MENOS</strong> en la palabra que menos lo describa o se acerque a su forma de ser.
          </p>
        </div>

        {/* Progreso */}
        <div className="mb-4 flex items-center justify-between">
          <div className="text-sm text-slate-500">{completos} / {GRUPOS.length} grupos completos</div>
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden flex-1 mx-4 max-w-xs">
            <div className="h-full bg-slate-700 transition-all" style={{ width: `${(completos / GRUPOS.length) * 100}%` }} />
          </div>
        </div>

        {error && <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded text-sm text-amber-800">{error}</div>}

        <HojaRespuestas sesion={sesion} onResponder={responder} />

        <div className="flex justify-end mt-6">
          <Boton onClick={finalizar}>Finalizar cuestionario</Boton>
        </div>
      </div>
    );
  }

  // Pantalla de inicio
  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <EncabezadoHoja />
      <Tarjeta className="p-6">
        <div className="font-bold text-slate-800 mb-3">Datos del postulante</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-slate-600 mb-1">Nombre completo *</label>
            <input value={datos.nombre} onChange={(e) => setDatos({ ...datos, nombre: e.target.value })}
              className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
              placeholder="Ej. María Pérez García" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Cargo al que postula</label>
            <input value={datos.puesto} onChange={(e) => setDatos({ ...datos, puesto: e.target.value })}
              className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Fecha de administración</label>
            <input type="date" value={datos.fecha} onChange={(e) => setDatos({ ...datos, fecha: e.target.value })}
              className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500" />
          </div>
        </div>
        {error && <p className="text-sm text-red-600 mt-3">{error}</p>}
        {reanudable ? (
          <div className="border border-slate-200 rounded p-4 bg-slate-50 mt-4">
            <p className="text-sm text-slate-700 mb-3">
              Se encontró un cuestionario sin terminar a nombre de <strong>{reanudable.datos?.nombre}</strong>. ¿Desea continuarlo?
            </p>
            <div className="flex gap-2">
              <Boton onClick={reanudar}>Continuar donde me quedé</Boton>
              <Boton variante="secundario" onClick={crearNueva}>Empezar de nuevo</Boton>
            </div>
          </div>
        ) : (
          <Boton onClick={comenzar} className="w-full mt-4">Comenzar</Boton>
        )}
      </Tarjeta>
      <div className="text-center mt-10">
        <button onClick={onIrEvaluador} className="text-xs text-slate-300 hover:text-slate-500 transition-colors">
          Acceso restringido
        </button>
      </div>
    </div>
  );
}

/* ============================================================
   PANEL EVALUADOR
   ============================================================ */

function PanelEvaluador({ onSalir }) {
  const [autenticado, setAutenticado] = useState(false);
  const [pass, setPass] = useState("");
  const [errorPass, setErrorPass] = useState("");
  const [lista, setLista] = useState(null);
  const [sesionSel, setSesionSel] = useState(null);
  const [tab, setTab] = useState("respuestas");
  const [confirmarBorrado, setConfirmarBorrado] = useState(null);

  const cargarLista = useCallback(() => {
    const idx = storage.getIndex();
    setLista(idx.sesiones.slice().reverse());
  }, []);

  useEffect(() => { if (autenticado) cargarLista(); }, [autenticado, cargarLista]);

  const abrirSesion = (meta) => {
    const d = storage.getSesion(meta.id);
    if (d) { setSesionSel(d); setTab("respuestas"); }
  };

  const eliminarSesion = (id) => {
    storage.deleteSesion(id);
    setConfirmarBorrado(null);
    if (sesionSel && sesionSel.id === id) setSesionSel(null);
    cargarLista();
  };

  if (!autenticado) {
    const intentar = () =>
      pass === PASSWORD_EVALUADOR ? setAutenticado(true) : setErrorPass("Contraseña incorrecta.");
    return (
      <div className="max-w-sm mx-auto px-4 pt-28">
        <Tarjeta className="p-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-1">Sección confidencial</h2>
          <p className="text-sm text-slate-500 mb-4">Acceso exclusivo para el evaluador.</p>
          <input type="password" value={pass} onChange={(e) => setPass(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && intentar()}
            className="w-full border border-slate-300 rounded-md px-3 py-2 mb-3 focus:outline-none focus:ring-2 focus:ring-slate-500"
            placeholder="Contraseña" />
          {errorPass && <p className="text-sm text-red-600 mb-3">{errorPass}</p>}
          <div className="flex gap-2">
            <Boton onClick={intentar}>Entrar</Boton>
            <Boton variante="secundario" onClick={onSalir}>Volver</Boton>
          </div>
        </Tarjeta>
      </div>
    );
  }

  if (sesionSel) {
    const an = calcularAnalisis(sesionSel.respuestas || {});
    return (
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-start justify-between mb-6 gap-4 flex-wrap no-print">
          <div>
            <button onClick={() => { setSesionSel(null); cargarLista(); }}
              className="text-sm text-slate-500 hover:text-slate-800 mb-1">← Volver al listado</button>
            <h2 className="text-2xl font-semibold text-slate-800">{sesionSel.datos?.nombre}</h2>
            <p className="text-sm text-slate-600">
              {sesionSel.datos?.puesto && <>Cargo al que postula: <strong>{sesionSel.datos.puesto}</strong> · </>}
              Fecha de administración: <strong>{formatearFecha(sesionSel.datos?.fecha)}</strong>
            </p>
            <p className="text-sm text-slate-500">
              Inició: {new Date(sesionSel.creado).toLocaleString()} · {sesionSel.completado ? `Finalizó: ${new Date(sesionSel.finalizado).toLocaleString()}` : "Cuestionario incompleto"}
            </p>
          </div>
          <div className="flex flex-wrap gap-2 justify-end">
            <Boton variante="secundario" onClick={() => descargarHTML(sesionSel, an)}>Exportar HTML</Boton>
            <Boton variante="secundario" onClick={() => descargarXLSX(sesionSel, an)}>Exportar Excel</Boton>
            <Boton variante="secundario" onClick={() => descargarDOC(sesionSel, an)}>Exportar Word</Boton>
            <Boton variante="sutil" onClick={() => window.print()}>Imprimir</Boton>
            {confirmarBorrado === sesionSel.id ? (
              <span className="flex items-center gap-2 border border-red-200 bg-red-50 rounded-md px-3 py-1.5">
                <span className="text-xs text-red-700 font-medium">¿Eliminar definitivamente?</span>
                <button onClick={() => eliminarSesion(sesionSel.id)} className="text-xs font-semibold text-red-700 hover:text-red-900">Sí, eliminar</button>
                <button onClick={() => setConfirmarBorrado(null)} className="text-xs text-slate-500 hover:text-slate-700">Cancelar</button>
              </span>
            ) : (
              <button onClick={() => setConfirmarBorrado(sesionSel.id)}
                className="px-4 py-2.5 rounded-md text-sm font-medium text-red-600 border border-red-200 hover:bg-red-50 transition-colors">
                Eliminar respuestas
              </button>
            )}
          </div>
        </div>

        <div className="flex gap-1 border-b border-slate-200 mb-6 overflow-x-auto no-print">
          {[
            ["respuestas", "1 · Hoja de respuestas"],
            ["precalificacion", "2 · Precalificación"],
            ["calificacion", "3 · Calificación"],
            ["interpretacion", "4 · Interpretación"],
          ].map(([k, t]) => (
            <button key={k} onClick={() => setTab(k)}
              className={cx(
                "px-4 py-2 text-sm font-medium -mb-px border-b-2 transition-colors whitespace-nowrap",
                tab === k ? "border-slate-800 text-slate-900" : "border-transparent text-slate-400 hover:text-slate-600"
              )}>{t}</button>
          ))}
        </div>

        {tab === "respuestas" && (
          <Tarjeta className="p-5">
            <EncabezadoHoja />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-4 text-sm">
              <div><span className="font-semibold">Nombre:</span> {sesionSel.datos?.nombre}</div>
              <div><span className="font-semibold">Cargo al que postula:</span> {sesionSel.datos?.puesto || "—"}</div>
              <div><span className="font-semibold">Fecha de administración:</span> {formatearFecha(sesionSel.datos?.fecha)}</div>
            </div>
            <HojaRespuestas sesion={sesionSel} soloLectura />
            {!sesionSel.completado && (
              <p className="mt-3 text-xs text-amber-700">Este cuestionario aún no ha sido finalizado por el evaluado.</p>
            )}
          </Tarjeta>
        )}

        {tab === "precalificacion" && (
          <Tarjeta className="p-5">
            <p className="text-sm text-slate-600 mb-4">
              Aplicación de la clave de corrección: cada marca <strong>MÁS</strong> suma 1 al conteo M del factor de la palabra elegida; cada marca <strong>MENOS</strong> suma 1 al conteo L. Máximo 24 marcas por columna.
            </p>
            <table className="w-full text-sm max-w-lg">
              <thead>
                <tr className="text-left text-slate-500 border-b border-slate-200">
                  <th className="py-2 pr-4">Factor</th>
                  <th className="py-2 pr-4 text-center">M</th>
                  <th className="py-2 text-center">L</th>
                </tr>
              </thead>
              <tbody>
                {FACTORES.map((f) => (
                  <tr key={f} className="border-b border-slate-100">
                    <td className="py-2 pr-4 text-slate-800">{f} — {NOMBRE_FACTOR[f]}</td>
                    <td className="py-2 pr-4 text-center font-semibold">{an.M[f]}</td>
                    <td className="py-2 text-center font-semibold">{an.L[f]}</td>
                  </tr>
                ))}
                <tr>
                  <td className="py-2 pr-4 text-slate-500">Suma de verificación</td>
                  <td className="py-2 pr-4 text-center text-slate-500">{FACTORES.reduce((a, f) => a + an.M[f], 0)} / 24</td>
                  <td className="py-2 text-center text-slate-500">{FACTORES.reduce((a, f) => a + an.L[f], 0)} / 24</td>
                </tr>
              </tbody>
            </table>
          </Tarjeta>
        )}

        {tab === "calificacion" && (
          <Tarjeta className="p-5">
            <p className="text-sm text-slate-600 mb-4">
              Puntaje bruto por factor: <strong>T = M − L</strong>. La línea media es T = 0.
            </p>
            <table className="w-full text-sm max-w-2xl mb-6">
              <thead>
                <tr className="text-left text-slate-500 border-b border-slate-200">
                  <th className="py-2 pr-4">Factor</th>
                  <th className="py-2 pr-4 text-center">M</th>
                  <th className="py-2 pr-4 text-center">L</th>
                  <th className="py-2 pr-4 text-center">T</th>
                  <th className="py-2">Lectura</th>
                </tr>
              </thead>
              <tbody>
                {FACTORES.map((f) => (
                  <tr key={f} className="border-b border-slate-100">
                    <td className="py-2 pr-4">{f} — {NOMBRE_FACTOR[f]}</td>
                    <td className="py-2 pr-4 text-center">{an.M[f]}</td>
                    <td className="py-2 pr-4 text-center">{an.L[f]}</td>
                    <td className="py-2 pr-4 text-center font-semibold">{fmt(an.T[f])}</td>
                    <td className="py-2">
                      <Etiqueta tono={an.estado[f] === "ALTO" ? "alto" : an.estado[f] === "BAJO" ? "bajo" : "gris"}>
                        {an.estado[f]}
                      </Etiqueta>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <GraficaPerfil M={an.M} L={an.L} T={an.T} />
          </Tarjeta>
        )}

        {tab === "interpretacion" && (
          <div className="space-y-5">
            <Tarjeta className="p-5">
              <h3 className="font-semibold text-slate-800 mb-2">Claves aplicadas</h3>
              <ul className="text-sm text-slate-600 space-y-1 mb-2">
                {an.claves.map((c) => (
                  <li key={c.clave}>
                    <strong className="text-slate-800">{c.clave}</strong> ({INTERPRETACION_RAPIDA[c.clave]?.corto}) — {c.motivo}
                  </li>
                ))}
              </ul>
              <p className="text-xs text-slate-400">
                Orden de factores por T: {an.orden.map((f) => `${f} (${fmt(an.T[f])})`).join(" › ")}
              </p>
            </Tarjeta>

            {an.claves.map((c) => (
              <Tarjeta key={c.clave} className="p-5">
                <div className="flex items-baseline gap-3 mb-2">
                  <span className="text-lg font-semibold text-slate-800">{c.clave}</span>
                  <span className="text-sm font-medium text-slate-500 uppercase tracking-wide">
                    {INTERPRETACION_RAPIDA[c.clave]?.corto}
                  </span>
                </div>
                <p className="text-sm text-slate-700 whitespace-pre-line leading-relaxed">
                  {INTERPRETACION_RAPIDA[c.clave]?.texto}
                </p>
              </Tarjeta>
            ))}

            <Tarjeta className="p-5">
              <h3 className="font-semibold text-slate-800 mb-3">Claves de motivación</h3>
              <div className="grid md:grid-cols-2 gap-5">
                {FACTORES.filter((f) => an.estado[f] !== "LÍNEA MEDIA").map((f) => {
                  const nivel = an.estado[f] === "ALTO" ? "alto" : "bajo";
                  const m = MOTIVACION[f][nivel];
                  return (
                    <div key={f} className="border border-slate-200 rounded-md p-4">
                      <div className="text-sm font-semibold text-slate-800 mb-2">
                        {f} {an.estado[f]} — {NOMBRE_FACTOR[f]}
                      </div>
                      <div className="text-xs font-semibold text-slate-500 uppercase mb-1">Desea</div>
                      <ul className="text-sm text-slate-600 list-disc pl-5 mb-3">
                        {m.quiere.map((x) => <li key={x}>{x}</li>)}
                      </ul>
                      <div className="text-xs font-semibold text-slate-500 uppercase mb-1">Necesita</div>
                      <ul className="text-sm text-slate-600 list-disc pl-5">
                        {m.necesita.map((x) => <li key={x}>{x}</li>)}
                      </ul>
                    </div>
                  );
                })}
              </div>
            </Tarjeta>

            <Tarjeta className="p-5">
              <h3 className="font-semibold text-slate-800 mb-3">Posibles limitaciones bajo presión</h3>
              <div className="grid md:grid-cols-2 gap-5">
                {FACTORES.filter((f) => an.estado[f] !== "LÍNEA MEDIA").map((f) => {
                  const nivel = an.estado[f] === "ALTO" ? "alto" : "bajo";
                  return (
                    <div key={f} className="border border-slate-200 rounded-md p-4">
                      <div className="text-sm font-semibold text-slate-800 mb-2">
                        {f} {an.estado[f]} — tiende a:
                      </div>
                      <ul className="text-sm text-slate-600 list-disc pl-5">
                        {LIMITACIONES[f][nivel].map((x) => <li key={x}>{x}</li>)}
                      </ul>
                    </div>
                  );
                })}
              </div>
            </Tarjeta>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-semibold text-slate-800">Panel del evaluador</h2>
          <p className="text-sm text-slate-500">Información confidencial.</p>
        </div>
        <div className="flex gap-2">
          <Boton variante="secundario" onClick={cargarLista}>Actualizar</Boton>
          <Boton variante="secundario" onClick={onSalir}>Salir</Boton>
        </div>
      </div>
      <Tarjeta>
        {lista && lista.length === 0 && (
          <p className="p-6 text-sm text-slate-500">Aún no hay evaluados registrados.</p>
        )}
        {lista && lista.map((s) => (
          <div key={s.id} className="flex items-center justify-between px-5 py-4 border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors">
            <button onClick={() => abrirSesion(s)} className="flex-1 text-left">
              <div className="font-medium text-slate-800">{s.datos?.nombre}</div>
              <div className="text-xs text-slate-500">{s.datos?.puesto || "Sin cargo especificado"} · Administración: {formatearFecha(s.datos?.fecha)}</div>
              <div className="text-xs text-slate-400">Registro: {new Date(s.creado).toLocaleString()}</div>
            </button>
            <div className="flex items-center gap-3 ml-3">
              <Etiqueta tono={s.completado ? "alto" : "bajo"}>{s.completado ? "Completado" : "En curso"}</Etiqueta>
              {confirmarBorrado === s.id ? (
                <span className="flex items-center gap-2 border border-red-200 bg-red-50 rounded-md px-2 py-1">
                  <span className="text-xs text-red-700">¿Eliminar?</span>
                  <button onClick={() => eliminarSesion(s.id)} className="text-xs font-semibold text-red-700 hover:text-red-900">Sí</button>
                  <button onClick={() => setConfirmarBorrado(null)} className="text-xs text-slate-500 hover:text-slate-700">No</button>
                </span>
              ) : (
                <button onClick={() => setConfirmarBorrado(s.id)}
                  className="text-xs text-red-500 hover:text-red-700 border border-transparent hover:border-red-200 rounded px-2 py-1 transition-colors">
                  Eliminar
                </button>
              )}
            </div>
          </div>
        ))}
      </Tarjeta>
    </div>
  );
}

/* ============================================================
   EXPORTACIONES
   ============================================================ */

function descargar(nombre, contenido, mime) {
  const blob = new Blob([contenido], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = nombre;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function nombreArchivo(sesion) {
  return `cleaver_${(sesion.datos?.nombre || "evaluado").replace(/\s+/g, "_")}`;
}

function descargarXLSX(sesion, an) {
  const wb = XLSX.utils.book_new();

  // Hoja 1: Respuestas en bruto
  const filas = [
    ["TEST DE CLEAVER — HOJA DE RESPUESTAS"],
    [],
    ["Nombre:", sesion.datos?.nombre || ""],
    ["Cargo al que postula:", sesion.datos?.puesto || ""],
    ["Fecha de administración:", formatearFecha(sesion.datos?.fecha)],
    [],
    ["Grupo", "Palabra D", "Palabra I", "Palabra S", "Palabra C", "MÁS (palabra)", "Factor M", "MENOS (palabra)", "Factor L"],
  ];
  GRUPOS.forEach((gr) => {
    const r = sesion.respuestas[gr.g] || {};
    filas.push([gr.g, gr.palabras.D, gr.palabras.I, gr.palabras.S, gr.palabras.C,
      r.M ? gr.palabras[r.M] : "", r.M || "", r.L ? gr.palabras[r.L] : "", r.L || ""]);
  });
  const ws1 = XLSX.utils.aoa_to_sheet(filas);
  ws1["!cols"] = [{ wch: 6 }, { wch: 22 }, { wch: 22 }, { wch: 22 }, { wch: 22 }, { wch: 22 }, { wch: 9 }, { wch: 22 }, { wch: 9 }];
  XLSX.utils.book_append_sheet(wb, ws1, "Respuestas");

  // Hoja 2: Calificación
  const cal = [
    ["PRECALIFICACIÓN Y CALIFICACIÓN"], [],
    ["Factor", "Nombre", "M", "L", "T = M − L", "Lectura"],
  ];
  FACTORES.forEach((f) => cal.push([f, NOMBRE_FACTOR[f], an.M[f], an.L[f], an.T[f], an.estado[f]]));
  cal.push([]);
  cal.push(["Verificación totales", "", FACTORES.reduce((a, f) => a + an.M[f], 0), FACTORES.reduce((a, f) => a + an.L[f], 0), "de 24 esperados"]);
  const ws2 = XLSX.utils.aoa_to_sheet(cal);
  ws2["!cols"] = [{ wch: 10 }, { wch: 28 }, { wch: 8 }, { wch: 8 }, { wch: 12 }, { wch: 16 }];
  XLSX.utils.book_append_sheet(wb, ws2, "Calificación");

  // Hoja 3: Interpretación
  const inte = [["INTERPRETACIÓN"], []];
  inte.push(["Orden de factores por T:", an.orden.map((f) => `${f} (${fmt(an.T[f])})`).join(" > ")]);
  inte.push([]);
  inte.push(["Clave", "Nombre", "Criterio", "Texto"]);
  an.claves.forEach((c) => {
    const info = INTERPRETACION_RAPIDA[c.clave];
    inte.push([c.clave, info?.corto || "", c.motivo, info?.texto || ""]);
  });
  const ws3 = XLSX.utils.aoa_to_sheet(inte);
  ws3["!cols"] = [{ wch: 10 }, { wch: 24 }, { wch: 60 }, { wch: 100 }];
  XLSX.utils.book_append_sheet(wb, ws3, "Interpretación");

  XLSX.writeFile(wb, `${nombreArchivo(sesion)}.xlsx`);
}

function descargarDOC(sesion, an) {
  const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  const filasHoja = BLOQUES.map((bloque) => {
    return FACTORES.map((factor, fIdx) => {
      const celdas = bloque.map((grupo) => {
        const r = sesion.respuestas[grupo.g] || {};
        const marcaM = r.M === factor ? "X" : "";
        const marcaL = r.L === factor ? "X" : "";
        return `<td>${grupo.g}. ${esc(grupo.palabras[factor])}</td><td style="text-align:center;font-weight:bold">${marcaM}</td><td style="text-align:center;font-weight:bold">${marcaL}</td>`;
      }).join("");
      return `<tr>${celdas}</tr>`;
    }).join("");
  }).map((filas, i) =>
    `<table><tr>${Array(4).fill('<th></th><th style="background:#e5e7eb">MÁS</th><th style="background:#e5e7eb">MENOS</th>').join("")}</tr>${filas}</table><br/>`
  ).join("");

  const filasCal = FACTORES.map((f) =>
    `<tr><td>${f}</td><td>${esc(NOMBRE_FACTOR[f])}</td><td style="text-align:center">${an.M[f]}</td><td style="text-align:center">${an.L[f]}</td><td style="text-align:center"><b>${fmt(an.T[f])}</b></td><td>${an.estado[f]}</td></tr>`
  ).join("");

  const bloquesClaves = an.claves.map((c) => {
    const info = INTERPRETACION_RAPIDA[c.clave];
    return `<h3>${esc(c.clave)} — ${esc(info?.corto || "")}</h3>
      <p style="color:#666;font-size:10pt"><i>Criterio: ${esc(c.motivo)}</i></p>
      <p>${esc(info?.texto || "").replace(/\n/g, "<br/>")}</p>`;
  }).join("");

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Reporte Cleaver</title>
    <style>
      body { font-family: Calibri, Arial, sans-serif; font-size: 11pt; color: #1a1a1a; }
      h1 { font-size: 22pt; letter-spacing: 6pt; text-align: center; border-bottom: 3px double #333; padding-bottom: 6pt; }
      h2 { font-size: 14pt; margin-top: 18pt; color: #1f2937; border-bottom: 1px solid #999; padding-bottom: 2pt; }
      h3 { font-size: 12pt; margin-top: 14pt; }
      table { border-collapse: collapse; width: 100%; margin: 8pt 0; }
      th, td { border: 1px solid #999; padding: 4pt 6pt; font-size: 10pt; }
      th { background: #e5e7eb; }
      .meta td { border: none; padding: 1pt 6pt 1pt 0; }
    </style></head><body>
    <h1>TEST DE CLEAVER</h1>
    <table class="meta">
      <tr><td><b>Nombre:</b></td><td>${esc(sesion.datos?.nombre || "")}</td></tr>
      <tr><td><b>Cargo al que postula:</b></td><td>${esc(sesion.datos?.puesto || "—")}</td></tr>
      <tr><td><b>Fecha de administración:</b></td><td>${formatearFecha(sesion.datos?.fecha)}</td></tr>
    </table>

    <h2>1. Hoja de respuestas</h2>
    ${filasHoja}

    <h2>2. Precalificación y calificación</h2>
    <table>
      <tr><th>Factor</th><th>Nombre</th><th>M</th><th>L</th><th>T = M − L</th><th>Lectura</th></tr>
      ${filasCal}
    </table>

    <h2>3. Interpretación</h2>
    <p><b>Orden por T:</b> ${an.orden.map((f) => `${f} (${fmt(an.T[f])})`).join(" › ")}</p>
    ${bloquesClaves}

    <p style="color:#666;font-size:9pt;margin-top:24pt">Documento confidencial de uso exclusivo del evaluador. Generado el ${new Date().toLocaleString()}.</p>
    </body></html>`;

  descargar(`${nombreArchivo(sesion)}.doc`, "\ufeff" + html, "application/msword;charset=utf-8");
}

function descargarHTML(sesion, an) {
  const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  // Reutilizamos la estética del DOC pero como página web autocontenida.
  const filasHoja = BLOQUES.map((bloque) => {
    const encabezados = bloque.map(() => '<th></th><th style="background:#e5e7eb;padding:4px">MÁS</th><th style="background:#e5e7eb;padding:4px">MENOS</th>').join("");
    const filas = FACTORES.map((factor) => {
      const celdas = bloque.map((grupo) => {
        const r = sesion.respuestas[grupo.g] || {};
        const marcaM = r.M === factor ? "X" : "";
        const marcaL = r.L === factor ? "X" : "";
        return `<td style="border:1px solid #64748b;padding:4px 8px">${grupo.g}. ${esc(grupo.palabras[factor])}</td><td style="border:1px solid #64748b;text-align:center;font-weight:bold;width:40px;${r.M === factor ? "background:#1e293b;color:#fff" : ""}">${marcaM}</td><td style="border:1px solid #64748b;text-align:center;font-weight:bold;width:40px;${r.L === factor ? "background:#f59e0b;color:#fff" : ""}">${marcaL}</td>`;
      }).join("");
      return `<tr>${celdas}</tr>`;
    }).join("");
    return `<table style="border-collapse:collapse;width:100%;margin-bottom:16px;font-size:13px"><tr>${encabezados}</tr>${filas}</table>`;
  }).join("");

  const filasCal = FACTORES.map((f) => {
    const tono = an.estado[f] === "ALTO" ? "background:#ecfdf5;color:#047857" : an.estado[f] === "BAJO" ? "background:#fffbeb;color:#b45309" : "background:#f1f5f9;color:#475569";
    return `<tr>
      <td style="padding:8px 12px;border-bottom:1px solid #f1f5f9">${f} — ${esc(NOMBRE_FACTOR[f])}</td>
      <td style="padding:8px 12px;text-align:center;border-bottom:1px solid #f1f5f9">${an.M[f]}</td>
      <td style="padding:8px 12px;text-align:center;border-bottom:1px solid #f1f5f9">${an.L[f]}</td>
      <td style="padding:8px 12px;text-align:center;font-weight:600;border-bottom:1px solid #f1f5f9">${fmt(an.T[f])}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #f1f5f9"><span style="display:inline-block;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:600;${tono}">${an.estado[f]}</span></td>
    </tr>`;
  }).join("");

  const bloquesClaves = an.claves.map((c) => {
    const info = INTERPRETACION_RAPIDA[c.clave];
    return `<div style="background:#fff;border:1px solid #e2e8f0;border-radius:8px;padding:20px;margin-bottom:20px">
      <div style="margin-bottom:8px"><span style="font-size:17px;font-weight:600">${esc(c.clave)}</span>
      <span style="font-size:13px;font-weight:500;color:#64748b;text-transform:uppercase;letter-spacing:.5px;margin-left:10px">${esc(info?.corto || "")}</span></div>
      <p style="font-size:12px;color:#94a3b8;margin:0 0 10px"><i>Criterio: ${esc(c.motivo)}</i></p>
      <p style="font-size:14px;color:#334155;line-height:1.6;white-space:pre-line;margin:0">${esc(info?.texto || "")}</p>
    </div>`;
  }).join("");

  const html = `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8">
  <title>Resultados Cleaver — ${esc(sesion.datos?.nombre || "")}</title>
  <style>
    body { margin:0; background:#f8fafc; font-family:'Segoe UI',system-ui,sans-serif; color:#0f172a; }
    .contenedor { max-width: 920px; margin: 0 auto; padding: 32px 20px 60px; }
    h1 { font-size: 32pt; letter-spacing: 8pt; text-align:center; margin: 8pt 0; }
    h2 { font-size:15px; font-weight:600; margin:26px 0 12px; padding-bottom:6px; border-bottom:1px solid #e2e8f0 }
    @media print { body { background:#fff } .contenedor { padding:0 } }
  </style></head><body><div class="contenedor">
  <h1>TEST DE CLEAVER</h1>

  <table style="width:100%;font-size:13px;margin:16px 0"><tbody>
    <tr><td><b>Nombre:</b> ${esc(sesion.datos?.nombre || "")}</td></tr>
    <tr><td><b>Cargo al que postula:</b> ${esc(sesion.datos?.puesto || "—")}</td></tr>
    <tr><td><b>Fecha de administración:</b> ${formatearFecha(sesion.datos?.fecha)}</td></tr>
  </tbody></table>

  <h2>1 · Hoja de respuestas</h2>
  <div style="background:#fff;border:1px solid #e2e8f0;border-radius:8px;padding:20px;margin-bottom:20px">${filasHoja}</div>

  <h2>2 · Precalificación y calificación</h2>
  <div style="background:#fff;border:1px solid #e2e8f0;border-radius:8px;padding:20px;margin-bottom:20px">
    <table style="width:100%;border-collapse:collapse;font-size:13px">
      <tr><th style="text-align:left;padding:8px 12px;border-bottom:1px solid #e2e8f0;color:#64748b">Factor</th><th style="text-align:center;padding:8px 12px;border-bottom:1px solid #e2e8f0;color:#64748b">M</th><th style="text-align:center;padding:8px 12px;border-bottom:1px solid #e2e8f0;color:#64748b">L</th><th style="text-align:center;padding:8px 12px;border-bottom:1px solid #e2e8f0;color:#64748b">T = M − L</th><th style="text-align:left;padding:8px 12px;border-bottom:1px solid #e2e8f0;color:#64748b">Lectura</th></tr>
      ${filasCal}
    </table>
  </div>

  <h2>3 · Interpretación</h2>
  <div style="background:#fff;border:1px solid #e2e8f0;border-radius:8px;padding:20px;margin-bottom:20px">
    <p style="font-size:13px;color:#475569;margin:0 0 8px"><b>Orden por T:</b> ${an.orden.map((f) => `${f} (${fmt(an.T[f])})`).join(" › ")}</p>
    <ul style="margin:0;padding-left:18px;font-size:13px;color:#475569;line-height:1.6">
    ${an.claves.map((c) => `<li><b>${esc(c.clave)}</b> (${esc(INTERPRETACION_RAPIDA[c.clave]?.corto || "")}) — ${esc(c.motivo)}</li>`).join("")}
    </ul>
  </div>
  ${bloquesClaves}

  <p style="font-size:11px;color:#94a3b8;text-align:center;margin-top:30px">Documento confidencial · Generado el ${new Date().toLocaleString()}</p>
  </div></body></html>`;

  descargar(`${nombreArchivo(sesion)}_pagina.html`, html, "text/html;charset=utf-8");
}

/* ============================================================
   RAÍZ
   ============================================================ */

export default function App() {
  const [vista, setVista] = useState("evaluado");
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      {vista === "evaluado"
        ? <VistaEvaluado onIrEvaluador={() => setVista("evaluador")} />
        : <PanelEvaluador onSalir={() => setVista("evaluado")} />}
    </div>
  );
}
