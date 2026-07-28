// Estado global de la aplicación
const state = {
    // Datos del test
    preguntas: window.PREGUNTAS || [],
    escalas: window.ESCALAS || {},
    mapeo: window.MAPEO_ESCALAS || {},

    // Respuestas del evaluado
    respuestas: {},
    nombre: '',
    cargo: '',
    fecha: '',

    // Sesión actual
    sessionId: null,

    // Resultados del evaluador
    resultados: [],
    resultadoActual: null,

    // UI
    pantallaActual: 'inicio'
};

// Función para reiniciar el estado
function resetState() {
    state.respuestas = {};
    state.nombre = '';
    state.cargo = '';
    state.fecha = '';
    state.sessionId = null;
    state.resultadoActual = null;
}