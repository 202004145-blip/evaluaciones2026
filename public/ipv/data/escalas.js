/**
 * data/escalas.js
 * Definición de las escalas del IPV con sus descripciones interpretativas
 * (bajo/medio/alto) y las tablas de decatipos según baremos mexicanos (n=300).
 *
 * Escalas:
 *   DGV — Disposición General para la Venta (índice global)
 *   R   — Receptividad (I + II + III + IV)
 *   A   — Agresividad (V + VI + VII + VIII)
 *   I   — Comprensión
 *   II  — Adaptabilidad
 *   III — Control de sí mismo
 *   IV  — Tolerancia a la frustración
 *   V   — Combatividad
 *   VI  — Dominio
 *   VII — Seguridad
 *   VIII— Actividad
 *   IX  — Sociabilidad
 *
 * Expone: window.IPV_ESCALAS, window.IPV_DECATIPOS
 */

/* =========================================================
   ESCALAS: descripciones + tabla de decatipos (baremos MX)
   ========================================================= */
const ESCALAS = {
  DGV: {
    nombre: "DGV — Disposición General para la Venta",
    corta: "DGV",
    desc_alto: "Perfil global orientado a la venta: facilidad para establecer relaciones, combatividad moderada por buen control de sí mismo. Rasgos acordes con actividades comerciales exigentes.",
    desc_medio: "Perfil equilibrado. Presenta rasgos comerciales medianamente desarrollados. Puede desenvolverse en tareas de venta que no requieran altos niveles de agresividad comercial.",
    desc_bajo: "Perfil poco orientado a la venta. Las cualidades comerciales están por debajo del promedio; será conveniente evaluar la adecuación al puesto y necesidades de formación.",
    max: 21
  },
  R: {
    nombre: "R — Receptividad",
    corta: "R",
    desc_alto: "Excelentes cualidades empáticas: sabe ponerse en el lugar del otro, escucha, adapta su discurso, controla sus emociones y digiere los fracasos. Corresponde al tipo receptivo de venta (asesor, consultor, cliente ya interesado).",
    desc_medio: "Capacidad receptiva media. Puede empatizar y adaptarse, pero no es su fortaleza distintiva. Adecuado para venta que combina escucha y proactividad.",
    desc_bajo: "Baja receptividad. Le cuesta escuchar y adaptarse al cliente. Perfil menos indicado para venta consultiva o de relación larga.",
    max: 38
  },
  A: {
    nombre: "A — Agresividad",
    corta: "A",
    desc_alto: "Fuerte capacidad para soportar y provocar situaciones conflictivas con clara voluntad de ganar: dominio, seguridad, dinamismo. Corresponde al tipo agresivo de venta (prospección, cierre, venta fría).",
    desc_medio: "Nivel medio de agresividad comercial. Puede sostener negociaciones sin buscarlas activamente.",
    desc_bajo: "Baja agresividad comercial. Le cuesta insistir, presionar o sostener un desacuerdo. Perfil poco apto para venta de captación o cierre agresivo.",
    max: 38
  },
  I: {
    nombre: "I — Comprensión",
    corta: "I",
    desc_alto: "Empático y objetivo en relaciones humanas. Intuitivo, integrador, sabe leer al cliente y adaptarse a él.",
    desc_medio: "Comprensión y empatía a nivel promedio.",
    desc_bajo: "Poca sensibilidad a los estados del otro; interpretaciones más superficiales. Puede necesitar entrenamiento en escucha activa.",
    max: 11
  },
  II: {
    nombre: "II — Adaptabilidad",
    corta: "II",
    desc_alto: "Fácil y rápida adaptación al entorno. Flexible, capaz de asumir el papel que la situación requiere, buen mimetismo social.",
    desc_medio: "Adaptación adecuada al contexto habitual.",
    desc_bajo: "Rigidez ante cambios y situaciones nuevas. Prefiere rutinas y guiones definidos.",
    max: 11
  },
  III: {
    nombre: "III — Control de sí mismo",
    corta: "III",
    desc_alto: "Persona controlada, dueña de sí misma, organizada y perseverante. Hábil para no dejar traslucir sus sentimientos.",
    desc_medio: "Autocontrol dentro del promedio.",
    desc_bajo: "Impulsivo, poco perseverante; deja traslucir sus emociones. Puede reaccionar en caliente ante clientes difíciles.",
    max: 11
  },
  IV: {
    nombre: "IV — Tolerancia a la frustración",
    corta: "IV",
    desc_alto: "Soporta adecuadamente situaciones frustrantes. Comprende sus fracasos y no los personaliza; dosifica su implicación emocional.",
    desc_medio: "Tolerancia media a la frustración.",
    desc_bajo: "Poca tolerancia al fracaso. Tiende a personalizar los rechazos, lo que en venta puede desgastarlo rápidamente.",
    max: 11
  },
  V: {
    nombre: "V — Combatividad",
    corta: "V",
    desc_alto: "Entra en conflicto y sostiene desacuerdos sin dificultad. Persona porfiada y polémica; buena agresividad comercial.",
    desc_medio: "Combatividad promedio.",
    desc_bajo: "Le cuesta sostener desacuerdos; carece de agresividad comercial suficiente. Perfil poco reivindicativo.",
    max: 11
  },
  VI: {
    nombre: "VI — Dominio",
    corta: "VI",
    desc_alto: "Voluntad de dominio y persuasión, ascendencia natural, capacidad de cautivar. Cualidad característica de personas de alta jerarquía.",
    desc_medio: "Ascendencia moderada sobre los demás.",
    desc_bajo: "Poca ascendencia; le cuesta influir sobre otros o ejercer autoridad.",
    max: 11
  },
  VII: {
    nombre: "VII — Seguridad",
    corta: "VII",
    desc_alto: "Seguro de sí mismo, disfruta situaciones nuevas e inesperadas, capaz de enfrentar riesgos con confianza.",
    desc_medio: "Nivel de seguridad promedio.",
    desc_bajo: "Insegura, incómoda ante lo nuevo; difícilmente enfrenta riesgos. Necesita marcos claros y familiares.",
    max: 8
  },
  VIII: {
    nombre: "VIII — Actividad",
    corta: "VIII",
    desc_alto: "Persona activa y dinámica físicamente, enérgica; no soporta la pasividad.",
    desc_medio: "Nivel de actividad promedio.",
    desc_bajo: "Poco dinámica físicamente; tolera bien la pasividad. Perfil menos indicado para venta con alta itinerancia o exigencia física.",
    max: 8
  },
  IX: {
    nombre: "IX — Sociabilidad",
    corta: "IX",
    desc_alto: "Extravertido, capaz de crear nuevos contactos, prefiere la compañía a la soledad. Rasgo importante para la venta relacional.",
    desc_medio: "Sociabilidad promedio.",
    desc_bajo: "Reservado, prefiere la soledad o círculos pequeños. Le cuesta iniciar contactos nuevos.",
    max: 8
  }
};

/* Tabla de decatipos — Baremos mexicanos (n=300).
   Cada valor indica el rango de PD que corresponde a cada decatipo. */
const DECATIPOS = {
  DGV: [[0,5],[6,7],[8,9],[10,10],[11,11],[12,12],[13,13],[14,14],[15,15],[16,21]],
  R:   [[0,12],[13,14],[15,16],[17,18],[19,20],[21,22],[23,24],[25,26],[27,28],[29,41]],
  A:   [[0,6],[7,8],[9,10],[11,12],[13,13],[14,15],[16,17],[18,19],[20,21],[22,38]],
  I:   [[0,1],[2,2],[3,3],[4,4],[5,5],[6,6],[7,7],[8,8],[9,9],[10,11]],
  II:  [[0,1],[2,2],[3,3],[4,4],[5,5],[6,6],[7,7],[8,8],[9,9],[10,11]],
  III: [[0,2],[3,3],[4,4],[5,5],[6,6],[7,7],[8,8],[9,9],[10,10],[11,11]],
  IV:  [[0,2],[3,3],[4,4],[5,5],[6,6],[7,7],[8,8],[9,9],[10,10],[11,11]],
  V:   [[0,2],[3,3],[4,4],[5,5],[6,6],[7,7],[8,8],[9,9],[10,10],[11,11]],
  VI:  [[0,2],[3,3],[4,4],[5,5],[6,6],[7,7],[8,8],[9,9],[10,10],[11,11]],
  VII: [[0,1],[2,2],[3,3],[4,4],[5,5],[6,6],[7,7],[8,8],[9,9],[10,11]],
  VIII:[[0,1],[2,2],[3,3],[4,4],[5,5],[6,6],[7,7],[8,8],[9,9],[10,11]],
  IX:  [[0,1],[2,2],[3,3],[4,4],[5,5],[6,6],[7,7],[8,8],[9,9],[10,11]]
};

window.IPV_ESCALAS = ESCALAS;
window.IPV_DECATIPOS = DECATIPOS;
