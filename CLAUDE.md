# Proyecto: Sistema de Perfil Personal (DISC) — PRADEVA

## Qué es esto

Aplicación web para administrar y calificar el test psicométrico DISC (Personal Profile System, 28 ítems de selección forzada MÁS/MENOS) en procesos de selección de personal. Fue desarrollada originalmente como artefacto de Claude.ai y se migra aquí para convertirla en una aplicación real con backend.

## Estado actual

`app/disc_pps_pradeva.html` es la app funcional completa (un solo archivo HTML+CSS+JS). Ya implementa:

- Flujo del evaluado: intro → datos personales → 28 grupos de palabras (elige una MÁS y una MENOS por grupo, sin repetir) → mensaje "Gracias por tu respuesta" (cierre ciego: el evaluado NUNCA ve sus resultados).
- Calificación oficial completa (ver "Lógica de calificación" abajo).
- Panel del evaluador protegido con clave (`4SIS.g2026`, constante `ACCESS_KEY` en el JS) con: lista de evaluados, detalle en 3 secciones (1. resultados en bruto pregunta+respuesta, 2. corrección con conteos/niveles/códigos, 3. interpretación con patrón clásico y estilo predominante), borrado con confirmación de dos pasos, y exportación a Word (.doc vía HTML), Excel (.xls vía SpreadsheetML), HTML autocontenido y JSON.
- Persistencia con `window.storage` (API exclusiva de artefactos de Claude.ai — NO existe en un navegador normal; ver "Trabajo pendiente").

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

1. **Reemplazar `window.storage` por un backend real** (la razón principal de migrar):
   - API pequeña (Node/Express o Python/FastAPI) + base de datos (SQLite basta para empezar).
   - Endpoints: crear sesión, guardar respuestas, listar/leer/borrar resultados.
   - El evaluado solo puede escribir su propia sesión; leer resultados requiere autenticación.
2. **Autenticación real del evaluador**: la clave actual está embebida en el cliente y es visible en el código fuente — es protección contra el curioso casual, no seguridad real. Mover a login del lado del servidor (hash de contraseña, sesión/JWT).
3. **Exportaciones nativas**: reemplazar el .doc (HTML disfrazado) por .docx real con la librería `docx` de npm, y el .xls (SpreadsheetML) por .xlsx real con SheetJS. Mantener el HTML autocontenido y el JSON tal como están.
4. **Separar el archivo único en módulos**: datos del test / motor de calificación / interfaz evaluado / panel evaluador. El motor de calificación debe quedar como módulo puro con tests unitarios (los invariantes ya validados: suma de conteos MÁS = 28, suma MENOS = 28, cobertura completa de las tablas de conversión, códigos conocidos como 1115→Objetivo, 1511→Promotor, 5555→Superactivo).
5. **Guardado automático por respuesta y reanudación de sesión** (hoy si el evaluado recarga la página pierde su avance).
6. Deploy: la app del evaluado debe ser accesible por URL para los postulantes (Vercel/Netlify para el frontend + hosting del backend, o un solo servidor).

## Reglas del proyecto

- No inventar reglas de corrección: todo lo interpretativo sale de los archivos en `datos/`. Si falta información, preguntar a la propietaria.
- Los resultados son datos sensibles de candidatos: ningún endpoint debe exponerlos sin autenticación.
- El evaluado jamás debe poder ver puntajes, niveles, códigos ni interpretación — solo el mensaje de agradecimiento con su folio.
- Idioma de la interfaz: español.
