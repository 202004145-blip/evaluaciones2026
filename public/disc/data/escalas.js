// Escalas D/I/S/C con sus palabras clave
const ESCALAS = {
    D: ["entusiasta","rápido/a","atrevido/a","dominante","decisivo/a","valeroso/a","osado/a","competitivo/a","audaz","resuelto/a","agresivo/a","enérgico/a","pionero"],
    I: ["elocuente","comunicativo/a","encantador/a","alegre","estimulante","popular","sociable","vivaz","animado/a","cautivador/a","desenvuelto/a","espontáneo/a"],
    S: ["apacible","bondadoso/a","tranquilo/a","tolerante","moderado/a","sensible","constante","pacífico","gentil","considerado/a","calmado/a","paciente","amistoso/a","comprensivo/a","generoso/a"],
    C: ["lógico/a","cauteloso/a","preciso/a","controlado/a","concienzudo/a","cuidadoso/a","precavido/a","discreto/a","perfeccionista","atento/a","perceptivo/a","reflexivo/a","analítico/a","meticuloso/a","sistemático/a","metódico/a"]
};

// Mapeo de cada palabra a su escala (para corrección automática)
const MAPEO_ESCALAS = {};
Object.keys(ESCALAS).forEach(escala => {
    ESCALAS[escala].forEach(palabra => {
        MAPEO_ESCALAS[palabra] = escala;
    });
});

// Exponer al ámbito global
window.ESCALAS = ESCALAS;
window.MAPEO_ESCALAS = MAPEO_ESCALAS;