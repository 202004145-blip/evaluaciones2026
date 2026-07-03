# Cómo abrir este proyecto en Claude Code

## Pasos

1. Descomprime este ZIP en una carpeta de tu computadora, por ejemplo `Documentos/disc-pradeva/`.

2. Instala Claude Code si aún no lo tienes:
   - Opción fácil: la app **Claude Desktop** (pestaña "Code") — https://claude.com/download
   - Opción terminal: `npm install -g @anthropic-ai/claude-code` y luego el comando `claude` dentro de la carpeta.

3. Abre la carpeta `disc-pradeva` con Claude Code. Leerá automáticamente el archivo `CLAUDE.md`, que contiene todo el contexto del proyecto: qué hace la app, cómo funciona la calificación oficial, y la lista de trabajo pendiente.

4. Un buen primer mensaje para empezar:
   > "Lee el CLAUDE.md y proponme un plan para la migración, empezando por el backend con base de datos."

## Contenido del paquete

- `CLAUDE.md` — instrucciones e historia técnica del proyecto (Claude Code lo lee solo).
- `app/disc_pps_pradeva.html` — la aplicación actual completa y funcional.
- `datos/items_disc.json` — los 28 ítems del test.
- `datos/conversion_tables.json` — tablas oficiales de conversión conteo→nivel (Gráficas I, II, III).
- `datos/pattern_lookup.json` — matriz completa código→patrón clásico (2,401 combinaciones).
- `datos/patrones_estructurados.json` — ficha interpretativa de los 17 patrones.

## Importante

- La app actual usa `window.storage`, que solo funciona dentro de Claude.ai. Al abrir el HTML directamente en tu navegador, el guardado y el panel del evaluador no funcionarán — eso es justamente lo primero que la migración va a reemplazar por un backend real.
- La clave del evaluador actual es `4SIS.g2026`; en la versión migrada será reemplazada por un login real del lado del servidor.
