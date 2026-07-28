// Mapeo de palabras a escalas D/I/S/C
// Este archivo relaciona cada palabra con su escala correspondiente
// para la corrección automática del DISC

const MAPEO_ESCALAS = {
    // Escala D (Dominante)
    "entusiasta": "D",
    "rápido/a": "D",
    "atrevido/a": "D",
    "dominante": "D",
    "decisivo/a": "D",
    "valeroso/a": "D",
    "osado/a": "D",
    "competitivo/a": "D",
    "audaz": "D",
    "resuelto/a": "D",
    "agresivo/a": "D",
    "enérgico/a": "D",
    "pionero": "D",

    // Escala I (Influyente)
    "elocuente": "I",
    "comunicativo/a": "I",
    "encantador/a": "I",
    "alegre": "I",
    "estimulante": "I",
    "popular": "I",
    "sociable": "I",
    "vivaz": "I",
    "animado/a": "I",
    "cautivador/a": "I",
    "desenvuelto/a": "I",
    "espontáneo/a": "I",

    // Escala S (Estable)
    "apacible": "S",
    "bondadoso/a": "S",
    "tranquilo/a": "S",
    "tolerante": "S",
    "moderado/a": "S",
    "sensible": "S",
    "constante": "S",
    "pacífico": "S",
    "gentil": "S",
    "considerado/a": "S",
    "calmado/a": "S",
    "paciente": "S",
    "amistoso/a": "S",
    "comprensivo/a": "S",
    "generoso/a": "S",

    // Escala C (Concienzudo)
    "lógico/a": "C",
    "cauteloso/a": "C",
    "preciso/a": "C",
    "controlado/a": "C",
    "concienzudo/a": "C",
    "cuidadoso/a": "C",
    "precavido/a": "C",
    "discreto/a": "C",
    "perfeccionista": "C",
    "atento/a": "C",
    "perceptivo/a": "C",
    "reflexivo/a": "C",
    "analítico/a": "C",
    "meticuloso/a": "C",
    "sistemático/a": "C",
    "metódico/a": "C"
};

// Exportar para usar en otros archivos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MAPEO_ESCALAS;
}