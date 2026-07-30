# Proyecto: Sistema de Perfil Personal (DISC) — PRADEVA

## Qué es esto

Aplicación web para administrar y calificar el test psicométrico DISC (Personal Profile System, 28 ítems de selección forzada MÁS/MENOS) en procesos de selección de personal. Fue desarrollada originalmente como artefacto de Claude.ai y se migra aquí para convertirla en una aplicación real con backend.

## Estado actual

La migración a aplicación real (Node/Express + SQLite) ya está en marcha en `server/` y `public/`. `app/disc_pps_pradeva.html` se conserva solo como referencia visual/funcional original (un solo archivo HTML+CSS+JS con `window.storage`, que no existe fuera de Claude.ai) — no se usa en producción.

Implementado en la app migrada:

- Backend Express + SQLite (`server/db.js`): tablas `sesiones`, `respuestas` (una fila por ítem, permite guardado incremental y reanudación), `resultados`, `evaluadores`.
- Motor de calificación puro (`server/scoring/scoring.js`) con tests (`node --test`, ver `server/scoring/scoring.test.js`) que verifican los invariantes de este documento.
- API REST (`server/routes/`): crear sesión de evaluado, guardar respuesta por ítem (autosave), reanudar sesión vía token propio, finalizar (califica y guarda), listar/leer/borrar resultados (protegido), exportar docx/xlsx/html/json (protegido).
- Login real del evaluador del lado del servidor: contraseña con hash bcrypt en SQLite, sesión de servidor (`express-session`, cookie httpOnly). La contraseña se fija con `npm run set-admin-password` (interactivo, oculto) — nunca se escribe en el código.
- Frontend separado: `public/evaluado/` (28 ítems, guardado automático por respuesta, reanudación si se recarga, cierre ciego con folio) y `public/evaluador/` (login, lista de evaluados, detalle en 3 secciones, borrado con confirmación de dos pasos, botones de exportación).
- Exportaciones nativas: `.docx` real con la librería `docx`, `.xlsx` real con SheetJS (`xlsx`), además de HTML autocontenido y JSON — generadas en `server/export/` a partir de `server/export/reportView.js` (vista normalizada reutilizada por las 4 exportaciones y el detalle de la API).

Pendiente de la lista original: deploy a un hosting accesible por URL (ver "Trabajo pendiente").

### Segundo instrumento: IPV (Inventario de Personalidad para Vendedores)

El mismo servidor aloja un segundo test independiente, el IPV (87 preguntas de elección única A/B/C, corrección contra clave, decatipos y **5 niveles del manual oficial**: Muy Bajo, Bajo, Promedio, Mayor Promedio, Alto). Comparte el login de evaluador (misma tabla `evaluadores` y cookie de sesión) pero usa tablas propias (`ipv_sesiones`, `ipv_respuestas`, `ipv_resultados`), datos propios en `datos/ipv/` (`preguntas_ipv.json` con la clave, `baremos_ipv.json` con el mapeo pregunta→escala, tablas de decatipos, `dgv_items` y las descripciones por nivel), motor puro en `server/ipv/scoring.js` (con tests), API bajo `/api/ipv/...` y frontends en `public/ipv/evaluado|evaluador`. La lógica de calificación del IPV está documentada en el README. Igual que en DISC, el evaluado jamás recibe la clave ni resultado alguno, y todo lo interpretativo vive en `datos/ipv/`, no en el código.

**Reglas específicas del IPV (validadas contra el Excel oficial `the_IPV_test.xls`):**
- **Cada pregunta pertenece a exactamente una escala específica** (I–IX) con su propia opción puntuable. La suma total es 11+11+11+8+11+11+8+8+8 = 87. `baremos.mapeo` guarda estos ítems.
- **Escala VIII (Actividad) es inversa**: `PD_VIII = 8 − aciertos` (marcado con `baremos.escala_reversa.VIII = true`). Contestar la opción "correcta" resta en lugar de sumar.
- **DGV (Disposición General para la Venta) es una escala global aparte** con su propia lista de 19 ítems y sus propias opciones puntuables en `baremos.dgv_items` (formato `{q, opt}`). Una misma pregunta puede aparecer con más de una opción puntuable para DGV, y esa opción puede diferir de la de su escala específica.
- **Escalas compuestas**: R = I+II+III+IV; A = V+VI+VII+VIII.
- **Decatipo (1–10)** por escala usando rangos `{min, max}` del baremo; algunas casillas son inalcanzables (min/max null) y se saltan.
- **Nivel (1–5)**: fórmula del Excel `IF(dec<3,1,IF(dec<5,2,IF(dec<7,3,IF(dec<9,4,5))))` → 1-2 Muy Bajo, 3-4 Bajo, 5-6 Promedio, 7-8 Mayor Promedio, 9-10 Alto. Cada nivel trae su interpretación por escala en `baremos.escalas[<escala>].desc_1..desc_5`, tomadas literalmente del manual oficial.
- **Prueba de oro**: `server/ipv/scoring.test.js` reproduce exactamente el ejemplo del Excel (PDs, decatipos y niveles de las 12 escalas).

### Tercer instrumento: Cleaver (Test de Cleaver)

Un tercer test independiente: 24 grupos de selección forzada MÁS/MENOS (4 palabras por grupo, una por factor D/I/S/C). Originalmente era una app React/Vite aparte con `localStorage` (sin backend); se migró al servidor real para que las respuestas se guarden y el evaluador las vea desde cualquier dispositivo. Comparte el login de evaluador (misma tabla `evaluadores` y cookie de sesión) con tablas propias (`cleaver_sesiones`, `cleaver_respuestas` —una fila por grupo con el factor MÁS y el MENOS—, `cleaver_resultados`), datos propios en `datos/cleaver/` (`grupos_cleaver.json` con las 24 palabras por factor y sus **sinónimos oficiales del manual**; `interpretacion_cleaver.json` con los textos oficiales del Excel `Test_de_Cleaver_automatizado.xls`: combinaciones D/I…C/S, alto/bajo por factor y las **12 tablas de percentiles** — D_M, I_M, S_M, C_M, D_L, I_L, S_L, C_L, D_T, I_T, S_T, C_T), motor puro en `server/cleaver/scoring.js` (con tests en `scoring.test.js`), API bajo `/api/cleaver/...` (`routes/cleaver-sesiones.js` y `cleaver-resultados.js`) y el frontend React en `cleaver-app/` (compilado a `cleaver-app/dist`, servido por Express en `/cleaver`). Igual que en DISC/IPV, el evaluado jamás recibe puntajes ni interpretación (el motor y los textos viven en el servidor, no en el bundle del cliente); solo el mensaje de agradecimiento.

**Reglas específicas del Cleaver (validadas contra el Excel oficial `Test_de_Cleaver_automatizado.xls`):**
- **Grupos numerados 1–24 en orden de lectura natural** (izquierda a derecha, arriba a abajo): bloque 1 = grupos 1-4, bloque 2 = 5-8, …, bloque 6 = 21-24. Coincide con el orden en el que el evaluado los ve en la hoja.
- **Cálculo**: por cada grupo el evaluado elige una palabra MÁS (M) y una MENOS (L); cada palabra pertenece a un factor D/I/S/C. Se cuentan M y L por factor; **T = M − L**; lectura ALTO (T>0), BAJO (T<0) o LÍNEA MEDIA (T=0).
- **Percentiles oficiales**: para cada factor se calcula el percentil de M, L y T usando las 12 tablas del manual (`baremos.percentiles`), reproduciendo exactamente el ejemplo del Excel.
- **Claves aplicadas** según el orden de T: `X+` para el factor con T más alto positivo, `X/Y` (combinación básica) del más alto sobre el segundo, `X-` para el más bajo negativo, y `D=C+`/`D=C-` cuando T(D)=T(C). Cada clave trae su interpretación oficial (nombre + texto completo) desde `interpretacion_cleaver.json`.
- **Sinónimos**: cada una de las 96 palabras trae su definición/sinónimo del manual, que se muestra como tooltip al pasar el mouse. Ayuda al evaluado a entender palabras poco comunes.
- **Endpoint de recalificación** `POST /api/cleaver/resultados/recalificar-todo` (protegido): re-califica todos los evaluados finalizados con la lógica y baremos vigentes. Idempotente.

## Lógica de calificación (validada, NO cambiar sin razón)

Fuente: documentos oficiales del instrumento provistos por la propietaria del proyecto.

1. **Conteos**: por cada una de las 4 escalas (D, I, S, C) se cuenta cuántas veces fue elegida como MÁS (Gráfica I) y como MENOS (Gráfica II). Gráfica III = MÁS − MENOS por escala.
2. **Conversión a niveles**: cada conteo se convierte a un nivel 1–7 usando las tablas de breakpoints en `datos/conversion_tables.json` (claves "I", "II", "III"; cada una con arreglos `[valor, nivel]` ascendentes por valor; el nivel corresponde al primer breakpoint cuyo valor sea >= al conteo). La función de referencia es `levelFromBreakpoints` en el HTML.
3. **Código de perfil**: concatenación de los niveles D-I-S-C de la Gráfica III (ej. "6443").
4. **Patrón clásico**: el código se busca en `datos/pattern_lookup.json`:
   - `PATTERN_LIST`: los 17 resultados posibles.
   - `LOOKUP`: string de 2401 caracteres; índice = (D-1)*343 + (I-1)*49 + (S-1)*7 + (C-1); el carácter indexa `CHARS` → posición en `PATTERN_LIST`. Un `.` significa código no documentado en la fuente.
   - `MISSING`: 13 códigos que faltan en la tabla original (la app lo comunica en vez de adivinar). Además, 5 códigos tenían valores contradictorios en el Excel fuente; se tomó la última aparición.
5. **Caso Superactivo**: si el patrón de Gráfica III es "Superactivo", la fuente indica interpretar con la Gráfica I o II; la app muestra los patrones alternativos de ambas.
6. **Interpretación**: `datos/patrones_estructurados.json` tiene la ficha de cada patrón (emociones, meta, juzga_a_otros_por, influye_mediante, valor_para_organizacion, abusa_de, bajo_presion, teme, seria_mas_eficaz_si, narrativa[]). Los estilos base D/I/S/C (tendencias, ambiente deseado, plan de acción) están como constante `ESTILOS_BASE` en el HTML.

`datos/items_disc.json` tiene los 28 ítems con sus 4 palabras por escala.

## Trabajo pendiente (objetivo de la migración)

1. ~~Reemplazar `window.storage` por un backend real~~ — hecho (`server/`, SQLite).
2. ~~Autenticación real del evaluador~~ — hecho (bcrypt + `express-session`). Nota: `express-session` usa `MemoryStore` por defecto, así que las sesiones de evaluador se pierden si el proceso se reinicia; aceptable para un solo evaluador, pero si esto molesta en producción, se puede cambiar a un store persistente (ej. SQLite).
3. ~~Exportaciones nativas~~ — hecho (`server/export/toDocx.js`, `toXlsx.js`, `toHtml.js`).
4. ~~Separar el archivo único en módulos~~ — hecho (`server/scoring/scoring.js` puro + tests).
5. ~~Guardado automático por respuesta y reanudación de sesión~~ — hecho (`PUT /api/sesiones/:folio/respuestas/:itemId` + `GET /api/sesiones/:folio`).
6. **Deploy**: scaffolding listo (`Dockerfile`, `.dockerignore`, `railway.json`) y guía paso a paso en el README. La app es un solo proceso Express sirviendo API + estáticos; se despliega en Railway/Render/Fly.io con `data.sqlite` en un volumen persistente (`DB_PATH`), `SESSION_SECRET` secreto, y el evaluador inicial vía `ADMIN_USER`/`ADMIN_PASSWORD` (bootstrap en el arranque, `server/auth.js` → `bootstrapAdminFromEnv`, porque no hay terminal interactiva para `set-admin-password`). Falta solo ejecutar el deploy en la cuenta de la propietaria.

## Reglas del proyecto

- No inventar reglas de corrección: todo lo interpretativo sale de los archivos en `datos/`. Si falta información, preguntar a la propietaria.
- Los resultados son datos sensibles de candidatos: ningún endpoint debe exponerlos sin autenticación.
- El evaluado jamás debe poder ver puntajes, niveles, códigos ni interpretación — solo el mensaje de agradecimiento con su folio.
- Idioma de la interfaz: español.
