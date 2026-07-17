# IPV — Inventario de Personalidad para Vendedores

Aplicación web autocontenida para administrar y corregir el test **IPV** (Inventario de Personalidad para Vendedores) con baremos mexicanos. Sin backend, sin build tools: se abre el archivo `index.html` en un navegador y funciona.

## Uso rápido

1. Abre `index.html` en cualquier navegador moderno (doble clic sobre el archivo).
2. El postulante completa sus datos y responde las 87 preguntas.
3. Al finalizar, se descarga automáticamente un informe `.html` con las respuestas, la corrección y la interpretación completa.
4. El evaluador puede entrar al panel restringido (link "Acceso para evaluador" al pie de la intro) con la contraseña `RRhH.26BPS` para ver todas las sesiones registradas y descargar informes en Word, Excel o HTML.

## Estructura del proyecto

```
ipv-test-project/
├── index.html                    Estructura HTML y orden de carga de scripts
├── styles/
│   └── main.css                  Todos los estilos
├── data/
│   ├── preguntas.js              Las 87 preguntas con opciones y clave
│   ├── escalas.js                Escalas + descripciones + baremos mexicanos
│   └── mapeo.js                  Asignación pregunta→escala + items DGV
├── src/
│   ├── storage.js                Capa persistente (window.storage / localStorage)
│   ├── state.js                  Estado global (state, evalData)
│   ├── utils.js                  DOM helpers, formato de fecha, decatipos
│   ├── scoring.js                Cálculo de PDs y decatipos por escala
│   ├── ui-intro.js               Pantalla 1: datos + instrucciones
│   ├── ui-test.js                Pantalla 2: renderizado de las 87 preguntas
│   ├── ui-evaluator.js           Pantalla 4: panel del evaluador
│   └── reports/
│       ├── helpers.js            armarDatosInforme, descargarBlob, escapeHTML
│       ├── html-report.js        Genera informe HTML autónomo
│       ├── word-report.js        Genera .doc (MIME Word HTML)
│       ├── excel-report.js       Genera .xlsx con SheetJS (4 hojas)
│       └── download-buttons.js   Conecta botones del panel con generadores
├── CLAUDE.md                     Notas para trabajar con Claude Code
└── README.md                     Este archivo
```

## Cómo funciona la corrección

- **Puntuación directa (PD):** cada respuesta del postulante que coincide con la clave suma 1 punto en la escala a la que pertenece la pregunta.
- **Escala IX (Sociabilidad):** las 8 preguntas están validadas contra el manual de corrección (16, 17, 18, 35, 36, 53, 54, 72).
- **Escalas I–VIII:** el mapeo pregunta→escala se hizo por análisis de contenidos del manual. Para uso clínico o de selección de alta consecuencia, contrastar con la plantilla oficial de TEA/El Manual Moderno.
- **DGV:** subconjunto de 21 preguntas representativas de todas las escalas.
- **R = I + II + III + IV** (dimensión Receptividad).
- **A = V + VI + VII + VIII** (dimensión Agresividad).
- Los PDs se convierten a **decatipos** con los baremos mexicanos (n=300).

## Modificaciones frecuentes

**Cambiar el mapeo de una pregunta a otra escala** → `data/mapeo.js`, mueve el número entre los arrays de `MAPEO_ESCALAS`.

**Ajustar la clave de una pregunta** → `data/preguntas.js`, cambia el campo `k` de la pregunta correspondiente.

**Cambiar la contraseña del panel evaluador** → `src/storage.js`, edita `const PASSWORD = "..."`.

**Usar los baremos españoles en lugar de los mexicanos** → `data/escalas.js`, reescribe la tabla `DECATIPOS` con los rangos deseados.

**Añadir un formato de descarga** → crea `src/reports/mi-formato.js` con una función `generarMiFormato(datos)`, añade el botón en `index.html` dentro de la sección de descargas del panel evaluador, y conecta el listener en `src/reports/download-buttons.js`.

## Persistencia

La app intenta guardar el estado en dos niveles:

1. **`window.storage`** — API de artefactos Claude (cuando se abre dentro de Claude.ai).
2. **`localStorage`** — fallback para uso local del archivo (navegador normal).

Si ninguna de las dos funciona (por ejemplo, en un iframe muy restrictivo), la app sigue operando pero sin autoguardado. Como respaldo, **al finalizar el test se descarga automáticamente el informe HTML completo**, así que el evaluador siempre tiene el archivo del postulante.

## Compatibilidad

- Navegadores modernos con soporte de `async/await` (Chrome 63+, Firefox 57+, Safari 11+, Edge 79+).
- Requiere conexión a internet la primera vez para cargar SheetJS (biblioteca de Excel) y las fuentes de Google. Después puede usarse offline si el navegador cachea esos recursos.

## Créditos

Fundamentación teórica y datos normativos:
- IPV — Editions du Centre de Psychologie Appliquée (París, 1977).
- Adaptación española: TEA Ediciones.
- Adaptación mexicana: Editorial El Manual Moderno.
