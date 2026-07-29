# Test de Cleaver — Frontend (React/Vite)

Interfaz web para administrar y calificar el **Test de Cleaver** con el formato
tradicional de la hoja de respuestas (6 bloques × 4 grupos, columnas MÁS /
MENOS). Es el **frontend** de la aplicación; la calificación y el almacenamiento
viven en el servidor Express + SQLite del proyecto (carpeta `server/`, tablas
`cleaver_*`, API `/api/cleaver/...`). En producción, Express sirve el build de
esta app en la ruta `/cleaver`.

## Características

- **Hoja de respuestas con el formato tradicional**: encabezado con el nombre
  del test, datos del postulante (nombre, cargo al que postula y fecha de
  administración) y las 24 palabras organizadas en 6 tablas de 4 columnas con
  casillas MÁS y MENOS.
- **Dos vistas**: evaluado (pública) y panel del evaluador (protegido por el
  login de servidor, el mismo de DISC/IPV).
- **Respuestas guardadas en el servidor**: cada marca se guarda al instante
  (autosave) vía API; si se recarga la página, el evaluado puede continuar donde
  quedó (el navegador recuerda su folio/token). El evaluador ve los resultados
  desde cualquier dispositivo.
- **Calificación en 4 pasos trazables** (calculada en el servidor): hoja de
  respuestas → precalificación (conteo M y L) → calificación (T = M − L,
  gráficas) → interpretación (claves aplicadas con criterio numérico, motivación
  y limitaciones).
- **Exportaciones**: Excel (.xlsx multihoja), Word (.doc con formato),
  HTML autocontenido, e impresión directa.
- **Borrado de registros** con confirmación de dos pasos.

> **Login del evaluador**: ya no hay contraseña fija en el código. Se usa el
> login real del servidor (usuario + contraseña con hash bcrypt), el mismo que
> DISC e IPV. Se configura con `npm run set-admin-password` (local) o las
> variables `ADMIN_USER`/`ADMIN_PASSWORD` (Railway).

## Desarrollo

Requisitos: Node.js 18 o superior.

```bash
# 1. Backend (desde la raíz del repo): levanta la API en el puerto 3000
npm start

# 2. Frontend del Cleaver (en esta carpeta): Vite con recarga en caliente
cd cleaver-app
npm install
npm run dev        # http://localhost:5173/
```

El `vite.config.js` proxya `/api` al servidor Express (`http://localhost:3000`),
así que en desarrollo las llamadas a la API funcionan sin CORS.

```bash
npm run build      # genera dist/ (con base /cleaver/) que sirve Express en /cleaver
npm run preview    # previsualiza el build
```

## Estructura

```
cleaver-app/
├── index.html                 # HTML raíz
├── package.json               # dependencias
├── vite.config.js             # Vite (base /cleaver/ en build, proxy /api en dev)
├── tailwind.config.js         # configuración de Tailwind CSS
├── postcss.config.js          # PostCSS
└── src/
    ├── main.jsx               # entrada React
    ├── index.css              # Tailwind + estilos de impresión
    ├── App.jsx                # vistas (evaluado / evaluador) + exportaciones
    ├── api.js                 # cliente de la API del servidor + utilidades
    └── datos-test.js          # las 24 palabras (solo para dibujar la hoja)
```

La lógica de calificación y los textos interpretativos **no** están aquí: viven
en el servidor (`server/cleaver/scoring.js`) y en `datos/cleaver/`, para que el
evaluado nunca reciba puntajes ni interpretación en el navegador.

## Nota sobre el baremo

El manual proporcionado incluye el material interpretativo pero no la tabla
numérica de conversión de puntaje bruto a percentil (escala 0–100). La
calificación se reporta en **puntaje bruto T = M − L** con línea media en
T = 0 (ALTO/BAJO). Si más adelante se captura la tabla percentilar, puede
agregarse en `server/cleaver/scoring.js` sin tocar la interfaz.

## Despliegue

No se despliega por separado: el `Dockerfile` del repo compila esta app y el
servidor Express sirve su `dist/` en `/cleaver`, junto con DISC e IPV, en el
mismo proceso y dominio. Ver la sección "Despliegue en Railway" del README
principal.
