# Evaluaciones PRADEVA — DISC + IPV

Aplicación web para administrar y calificar tests psicométricos en procesos de selección de personal. Incluye dos instrumentos independientes que comparten el mismo servidor y el mismo login de evaluador:

- **DISC** — Sistema de Perfil Personal (28 ítems de selección forzada MÁS/MENOS).
- **IPV** — Inventario de Personalidad para Vendedores (87 preguntas de elección única A/B/C, corrección contra clave, decatipos y niveles).

Ver `CLAUDE.md` para el contexto completo del proyecto (calificación oficial, reglas, trabajo pendiente).

## Estructura

```
datos/            Datos oficiales de los instrumentos
  <raíz>           DISC (ítems, tablas de conversión, patrones, estilos)
  ipv/             IPV (87 preguntas con su clave, baremos/decatipos, mapeo pregunta→escala)
server/           Backend Express + SQLite
  scoring/         Motor de calificación DISC (puro, con tests: node --test)
  export/          Generadores de exportación DISC (docx, xlsx, html)
  ipv/             Motor de calificación IPV (puro + tests) y sus exportadores (ipv/export/)
  routes/          Endpoints de la API (DISC e IPV: ipv-sesiones, ipv-resultados, ipv-exportar)
  scripts/         Utilidades de línea de comandos (crear contraseña de evaluador)
public/
  evaluado/        Vista del postulante DISC (28 ítems, jamás ve resultados)
  evaluador/        Panel del evaluador DISC (login, lista, detalle, exportación)
  ipv/evaluado/    Vista del postulante IPV (87 preguntas, jamás ve resultados)
  ipv/evaluador/   Panel del evaluador IPV (login compartido, lista, detalle, exportación)
  shared/          Estilos base compartidos
cleaver-app/       Test de Cleaver — app React/Vite independiente (frontend, localStorage).
                   Su build (cleaver-app/dist) lo sirve el mismo Express en /cleaver
app/               App original de un solo archivo (referencia visual/funcional, ya no se usa en producción)
```

## Puesta en marcha (desarrollo local)

```bash
npm install

cp .env.example .env
# Edita .env y define SESSION_SECRET, por ejemplo con:
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

npm run set-admin-password   # crea el primer usuario evaluador (pide la contraseña por teclado, oculta)

npm start                    # http://localhost:3000
```

- DISC — evaluado: `http://localhost:3000/evaluado/` · evaluador: `http://localhost:3000/evaluador/`
- IPV — evaluado: `http://localhost:3000/ipv/evaluado/` · evaluador: `http://localhost:3000/ipv/evaluador/`
- Cleaver — evaluado y evaluador en `http://localhost:3000/cleaver/` (el enlace "Acceso restringido", abajo de la pantalla del evaluado, lleva al login)

El login del evaluador es el **mismo para los tres instrumentos** (misma tabla `evaluadores`, misma cookie de sesión).

### Cleaver (frontend React/Vite con backend real)

El Test de Cleaver vive en `cleaver-app/` como app React/Vite. A diferencia del
original (que guardaba en `localStorage`), ahora usa el **backend real**: crea la
sesión, guarda cada respuesta y califica en el servidor (`/api/cleaver/...`,
tablas `cleaver_*`), y el evaluador entra con el login de servidor. Express sirve
el frontend compilado en `/cleaver` **solo si existe su build** (`cleaver-app/dist`,
que no se versiona).

Para desarrollo con recarga en caliente, levanta el backend (`npm start` en la
raíz, puerto 3000) y en paralelo el Vite del Cleaver; el `vite.config.js` ya
tiene un proxy de `/api` al 3000:

```bash
cd cleaver-app
npm install
npm run dev        # http://localhost:5173/  (las llamadas /api pasan al 3000)
```

Para verlo servido por Express en `http://localhost:3000/cleaver/` (como en
producción), genera el build primero:

```bash
cd cleaver-app && npm install && npm run build   # crea cleaver-app/dist con base /cleaver/
```

En el deploy con Docker/Railway este build se genera automáticamente (ver más
abajo), así que no hay que compilarlo a mano.

## Tests

```bash
npm test
```

- DISC (`server/scoring/scoring.test.js`): suma de conteos MÁS = 28, suma MENOS = 28, cobertura completa de las tablas de conversión, los 13 códigos faltantes de la matriz de patrones y los códigos de verificación 1115→Objetivo, 1511→Promotor, 5555→Superactivo.
- IPV (`server/ipv/scoring.test.js`): 87 preguntas con clave válida, cada pregunta pertenece a exactamente una escala (11+11+11+8+11+11+8+8+8 = 87), PD por escala igual al nº de ítems con todo correcto, VIII inversa (con todo correcto → PD 0), R y A como suma exacta de sus partes, límites y casillas inalcanzables de las tablas de decatipos, los 5 niveles del manual (Muy Bajo/Bajo/Promedio/Mayor Promedio/Alto), rechazo tipado de respuestas incompletas o inválidas, y una **prueba de oro que reproduce exactamente el ejemplo del Excel oficial** (12 escalas: PDs, decatipos y etiquetas de nivel iguales al Excel).
- Cleaver (`server/cleaver/scoring.test.js`): 24 grupos con los 4 factores D/I/S/C, numeración natural 1–24 en orden de lectura, definiciones/sinónimos oficiales para las 96 palabras, suma de M = 24 y suma de L = 24, T = M − L con sus lecturas y claves (D+, I-, D=C+…), **percentiles oficiales** para M/L/T con extrapolación fuera de rango, y la **prueba de oro** que reproduce los percentiles del ejemplo del Excel oficial.

## Lógica de calificación del IPV

Validada contra el Excel oficial del instrumento (`the_IPV_test.xls`): reproduce PDs, decatipos y niveles idénticos al ejemplo del Excel para las 12 escalas (probado en `server/ipv/scoring.test.js`).

1. **Puntuación directa (PD)**: por cada escala específica (I…IX) se cuenta 1 punto por cada pregunta cuya respuesta coincide con la clave del manual (`datos/ipv/preguntas_ipv.json`). El mapeo pregunta→escala está en `datos/ipv/baremos_ipv.json` (11+11+11+8+11+11+8+8+8 = 87 ítems, cada pregunta pertenece a exactamente una escala).
2. **Escala VIII (Actividad) es inversa**: `PD_VIII = 8 − aciertos` (fórmula del Excel `8-(SUM(...))`). Marcado con `baremos.escala_reversa.VIII = true`.
3. **Escalas compuestas**: `R = I + II + III + IV` (Receptividad) y `A = V + VI + VII + VIII` (Agresividad).
4. **DGV** (Disposición General para la Venta): escala global aparte con su propia lista de 19 ítems y sus propias opciones puntuables en `baremos.dgv_items` (formato `{q, opt}`, una pregunta puede aparecer con más de una opción puntuable, y esa opción puede diferir de la de su escala específica).
5. **Decatipos**: cada PD se convierte a un valor 1–10 usando rangos `{min, max}` por escala (`baremos.decatipos`). Algunas casillas son inalcanzables (min/max null) y se saltan.
6. **Nivel** (5 categorías del manual oficial, fórmula del Excel `IF(dec<3,1,IF(dec<5,2,IF(dec<7,3,IF(dec<9,4,5))))`):
   - **Muy Bajo** (decatipo 1–2), **Bajo** (3–4), **Promedio** (5–6), **Mayor Promedio** (7–8), **Alto** (9–10).
   Las descripciones por nivel están en `baremos.escalas[<escala>].desc_1..desc_5`, tomadas literalmente del manual (`1interpretacionIPV.xls`).

## Lógica de calificación del Cleaver

Validada contra el Excel oficial (`Test_de_Cleaver_automatizado.xls`): reproduce los percentiles exactos del ejemplo del propio Excel.

1. **Conteos**: por cada uno de los 24 grupos el evaluado elige una palabra MÁS (M) y una MENOS (L); cada palabra pertenece a un factor D/I/S/C (`datos/cleaver/grupos_cleaver.json`). Se cuenta cuántas veces cada factor fue elegido como M y como L. Suma de M = 24 y suma de L = 24.
2. **Puntaje bruto**: `T = M − L` por factor. Lectura: ALTO (T>0), BAJO (T<0), LÍNEA MEDIA (T=0).
3. **Percentiles oficiales**: para cada factor se calcula el percentil de M, L y T usando 12 tablas del baremo del manual (D_M, I_M, S_M, C_M, D_L, I_L, S_L, C_L, D_T, I_T, S_T, C_T, en `baremos.percentiles`). El percentil 50 en T corresponde a la línea media (T=0).
4. **Claves aplicadas** (según el orden de T): `X+` para el factor con T más alto positivo; `X/Y` (combinación básica: Creatividad, Empuje, Individualidad, etc.) del más alto sobre el segundo; `X-` para el más bajo negativo; y `D=C+`/`D=C-` (Ambivalencia Alta/Baja) cuando T(D)=T(C). Cada clave trae su interpretación literal del manual (nombre + texto completo) desde `datos/cleaver/interpretacion_cleaver.json`.
5. **Sinónimos**: cada una de las 96 palabras trae su sinónimo/definición del manual, que se muestra como tooltip al pasar el mouse sobre la palabra.
6. **Numeración natural**: los 24 grupos están numerados en orden de lectura (izquierda a derecha, arriba a abajo): bloque 1 = grupos 1-4, bloque 2 = 5-8, …, bloque 6 = 21-24.

## Despliegue en Railway

La app es un solo proceso Express que sirve la API y los estáticos, con SQLite
en disco. En Railway hay que darle un **volumen persistente** (si no, la base se
borra en cada redeploy) y configurar el evaluador por variables de entorno
(Railway no tiene terminal interactiva para `npm run set-admin-password`).

El repo ya trae `Dockerfile`, `.dockerignore` y `railway.json`; Railway
construye con el Dockerfile automáticamente. El `Dockerfile` es multi-etapa:
una primera etapa compila el Test de Cleaver (`cleaver-app/`, React/Vite) a
estáticos y la imagen final los sirve desde el mismo Express en `/cleaver` —
no hace falta un segundo servicio ni configuración extra en Railway.

**Pasos:**

1. **Crear el proyecto**: en [railway.app](https://railway.app) → _New Project_
   → _Deploy from GitHub repo_ → elige este repositorio. Railway detecta el
   `Dockerfile` y hace el primer build.
2. **Agregar el volumen** (persistencia de la base): en el servicio →
   _Settings_ → _Volumes_ → _New Volume_, con **Mount path** `/data`.
3. **Variables de entorno** (servicio → _Variables_):
   - `NODE_ENV` = `production`
   - `SESSION_SECRET` = una cadena aleatoria larga
     (`node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`)
   - `DB_PATH` = `/data/data.sqlite`  ← dentro del volumen
   - `ADMIN_USER` = usuario del evaluador (p. ej. `admin`)
   - `ADMIN_PASSWORD` = contraseña del evaluador (mín. 8 caracteres)
   - `PORT` **no** hace falta: Railway lo inyecta y el server lo respeta.
4. **Generar el dominio**: _Settings_ → _Networking_ → _Generate Domain_.
   Railway sirve HTTPS en el borde; el server ya activa `trust proxy` y cookies
   `secure` cuando `NODE_ENV=production`.
5. **Redeploy** y probar:
   - Salud: `https://TU-DOMINIO/api/estado` → `{"ok":true,"evaluadorConfigurado":true}`
   - Postulantes DISC: `/evaluado/` · IPV: `/ipv/evaluado/`
   - Evaluador: `/evaluador/` o `/ipv/evaluador/` (login con `ADMIN_USER`/`ADMIN_PASSWORD`)
   - Cleaver: `/cleaver/` (postulante); el evaluador entra por "Acceso restringido" con el mismo `ADMIN_USER`/`ADMIN_PASSWORD`

Notas:

- `ADMIN_PASSWORD` es la fuente de verdad en cada arranque: para rotar la
  contraseña, cambia la variable y redeploy. Si prefieres no dejarla en el
  entorno, quítala tras el primer arranque (el usuario ya quedó en la base del
  volumen) o usa la terminal del servicio para correr `npm run set-admin-password`.
- Las sesiones de evaluador usan `MemoryStore`, así que un redeploy/reinicio
  obliga a volver a iniciar sesión; los datos de los postulantes viven en el
  volumen y no se pierden.
- Los mismos pasos sirven para Render/Fly.io u otro host con Docker: monta un
  volumen, apunta `DB_PATH` a él y define las mismas variables.

## Notas de seguridad

- La base de datos (`data.sqlite`) y el archivo `.env` nunca se suben al repositorio (ver `.gitignore`).
- Ningún endpoint de resultados o exportación responde sin sesión de evaluador autenticada.
- El evaluado solo puede leer/escribir su propia sesión mediante el token que recibe al crearla.
