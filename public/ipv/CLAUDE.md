# Notas para Claude Code

Este archivo da contexto sobre el proyecto para trabajar con Claude Code.

## Naturaleza del proyecto

Aplicación estática de un solo archivo `index.html` que carga JS y CSS separados. **No hay build tools, no hay npm install, no hay servidor.** Se abre el archivo directamente en el navegador y funciona. Esta simplicidad es un requisito de diseño, no una limitación pendiente.

Para probar cualquier cambio: abre `index.html` en un navegador. Para ver logs, abre la consola del devtools.

## Convenciones de código

- **Sin módulos ES6** (`type="module"`). Los archivos se cargan como scripts globales tradicionales. Cada archivo declara sus `const`/`let`/`function` en el scope global; el resto de archivos las consumen directamente por nombre.
- **Orden de carga** definido en `index.html`. Un archivo no puede usar símbolos de otro que se carga después. El orden actual es: data → storage/state/utils/scoring → ui → reports.
- **Async/await** para todo lo que toca `window.storage` (que es asíncrono). El resto es síncrono.
- **Eventos DOM** se conectan con `document.addEventListener("DOMContentLoaded", ...)`. Varios archivos registran su propio listener; todos se ejecutan.

## Símbolos globales importantes

| Símbolo | Definido en | Qué es |
|---|---|---|
| `PREGUNTAS` | `data/preguntas.js` | Array de 87 objetos `{n, t, o, k}` |
| `ESCALAS` | `data/escalas.js` | Objeto con descripciones interpretativas por escala |
| `DECATIPOS` | `data/escalas.js` | Tabla de conversión PD→decatipo (baremos MX) |
| `MAPEO_ESCALAS` | `data/mapeo.js` | Qué preguntas puntúan para cada escala |
| `ITEMS_DGV` | `data/mapeo.js` | Las 21 preguntas del índice DGV |
| `PASSWORD` | `src/storage.js` | Contraseña del panel evaluador (`RRhH.26BPS`) |
| `state` | `src/state.js` | Sesión activa del postulante en el test |
| `evalData` | `src/state.js` | Sesión que se muestra al evaluador |
| `saveCurrent`, `loadCurrent`, etc. | `src/storage.js` | API de almacenamiento (async) |
| `calcularPuntuaciones` | `src/scoring.js` | Devuelve `{pd, dec}` desde `evalData` |
| `generarHTML`, `generarWord`, `generarExcel` | `src/reports/*` | Generadores de informe |

## Detalles no obvios

**Storage bloqueado en iframes.** Cuando el HTML se abre dentro de un iframe con `srcdoc` (por ejemplo, Claude.ai al mostrar el artefacto), `localStorage` lanza `SecurityError`. La app detecta esto y usa `window.storage` (API de artefactos Claude) si está disponible; si no, degrada silenciosamente pero descarga el informe HTML al finalizar como respaldo garantizado.

**El mapeo pregunta→escala de I-VIII es aproximado.** La escala IX está confirmada contra el manual de corrección (items 16, 17, 18, 35, 36, 53, 54, 72). Las demás fueron asignadas por análisis de contenido. Los totales cuadran: 11+11+11+8+11+11+8+8+8 = 87. Si se dispone de la plantilla oficial de TEA/El Manual Moderno, ajustar `MAPEO_ESCALAS` en `data/mapeo.js` y `ITEMS_DGV` para los 21 items del DGV.

**Word real (.docx) vs .doc HTML.** `word-report.js` genera un `.doc` que es en realidad HTML envuelto con encabezado MIME. Word lo abre sin problemas. Si en algún momento se quiere un `.docx` verdadero (formato Office Open XML), habría que integrar la librería `docx` (npm) y eso rompería el requisito de "sin build tools" — por eso se optó por esta ruta.

**Excel usa SheetJS desde CDN.** `<script src="https://cdnjs.cloudflare.com/.../xlsx.full.min.js">` en `index.html`. Si el usuario está offline y el navegador no cacheó la librería, el botón de Excel avisará con un `alert()` y no romperá nada.

**El autoguardado usa una cola.** `saveChain` es una `Promise` encadenada para evitar carreras cuando el postulante responde rápido varias preguntas seguidas.

## Cambios frecuentes que puedes pedirle a Claude Code

- "Cambia la contraseña del evaluador a X" → editar `PASSWORD` en `src/storage.js`.
- "Reasigna la pregunta 42 a la escala III" → editar `MAPEO_ESCALAS` en `data/mapeo.js`.
- "Añade una escala X con estas descripciones y baremos" → editar `data/escalas.js` (agregar entry en `ESCALAS` y `DECATIPOS`) + `data/mapeo.js`.
- "Cambia los colores del tema" → editar las `--variables` CSS en la parte superior de `styles/main.css`.
- "Añade descarga en formato PDF" → crear `src/reports/pdf-report.js`, integrar `jsPDF` desde CDN, añadir botón en `index.html` y listener en `src/reports/download-buttons.js`.
- "Añade validación de datos del postulante (RUT, email, etc.)" → editar el handler de `#btn-start` en `src/ui-intro.js`.

## Pruebas

No hay framework de tests. La forma de verificar cambios:

1. Abrir `index.html` en el navegador.
2. Completar el flujo del postulante con datos de prueba.
3. Entrar al panel evaluador (contraseña `RRhH.26BPS`).
4. Verificar las tres pestañas (raw, corrección, interpretación).
5. Descargar en HTML, Word y Excel y abrir los archivos para inspeccionar.

Para diagnóstico rápido de storage, abrir la consola del navegador y ejecutar:

```js
await loadCurrent();       // sesión en curso
await getCompleted();      // histórico
USE_WINDOW_STORAGE;        // true si estamos en artefacto Claude
LOCALSTORAGE_OK;           // true si localStorage funciona
```

## Fuera de alcance

Cosas que **no** debe intentar Claude Code sin conversarlo antes:

- Convertir el proyecto a React/Vue/framework SPA — rompería la simplicidad de "abrir y usar".
- Añadir backend/base de datos — el diseño es cliente-only.
- Sustituir SheetJS por otra librería — SheetJS está probado y funciona con este código.
- Cambiar el mapeo pregunta→escala automáticamente basándose en LLM analysis — la asignación temática está pensada y validada manualmente.
