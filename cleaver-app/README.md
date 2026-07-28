# Test de Cleaver — Aplicación web

Aplicación web para administrar y calificar el **Test de Cleaver** con el
formato tradicional de la hoja de respuestas (6 bloques × 4 grupos, columnas
MÁS / MENOS), pensada para uso local o desplegada en un servidor.

## Características

- **Hoja de respuestas con el formato tradicional**: encabezado con el nombre
  del test, datos del postulante (nombre, cargo al que postula y fecha de
  administración) y las 24 palabras organizadas en 6 tablas de 4 columnas con
  casillas MÁS y MENOS.
- **Dos vistas**: evaluado (pública) y panel del evaluador (protegido por
  contraseña).
- **Guardado automático** en `localStorage`: si se recarga la página, el
  evaluado puede continuar donde quedó escribiendo el mismo nombre.
- **Calificación en 4 pasos trazables**: hoja de respuestas → precalificación
  (conteo M y L) → calificación (T = M − L, gráficas) → interpretación
  (claves aplicadas con criterio numérico, motivación y limitaciones).
- **Exportaciones**: Excel (.xlsx multihoja), Word (.doc con formato),
  HTML autocontenido, e impresión directa.
- **Borrado de registros** con confirmación de dos pasos.
- **Contraseña del evaluador**: `RRhHcl3veR26`
  (cambiar en `src/calificacion.js` → `PASSWORD_EVALUADOR`).

## Instalación y ejecución

Requisitos: Node.js 18 o superior.

```bash
# 1. Instalar dependencias
npm install

# 2. Ejecutar en modo desarrollo (abre http://localhost:5173 automáticamente)
npm run dev

# 3. Compilar para producción (genera carpeta dist/)
npm run build

# 4. Previsualizar la versión compilada
npm run preview
```

## Estructura

```
cleaver-app/
├── index.html                 # HTML raíz
├── package.json               # dependencias
├── vite.config.js             # configuración de Vite
├── tailwind.config.js         # configuración de Tailwind CSS
├── postcss.config.js          # PostCSS
└── src/
    ├── main.jsx               # entrada React
    ├── index.css              # Tailwind + estilos de impresión
    ├── App.jsx                # componente principal (vistas + exportaciones)
    ├── datos-test.js          # 24 grupos organizados en 6 bloques
    ├── interpretacion.js      # textos interpretativos del manual
    └── calificacion.js        # lógica de calificación + localStorage
```

## Almacenamiento

Los datos se guardan en `localStorage` del navegador con el patrón
**índice + registros**:

- `cleaver-index`: lista de sesiones con metadatos.
- `cleaver-sesion-<id>`: datos completos de cada evaluado.

Para migrar a un backend (base de datos, API), basta con reemplazar el
objeto `storage` en `src/calificacion.js`. Las funciones a implementar son
`getIndex`, `setIndex`, `getSesion`, `setSesion`, `deleteSesion`.

## Nota sobre el baremo

El manual proporcionado incluye el material interpretativo pero no la tabla
numérica de conversión de puntaje bruto a percentil (escala 0–100). La
calificación se reporta en **puntaje bruto T = M − L** con línea media en
T = 0 (ALTO/BAJO). Si más adelante se captura la tabla percentilar, puede
agregarse en `src/calificacion.js`.

## Despliegue

Al ejecutar `npm run build`, se genera la carpeta `dist/` con archivos
estáticos que pueden subirse a cualquier hosting (Netlify, Vercel, GitHub
Pages, servidor propio). No requiere backend.
