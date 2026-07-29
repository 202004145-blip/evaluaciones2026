# Evaluaciones PRADEVA — DISC + IPV + BFI-2-XS

Aplicación web para administrar y calificar tests psicométricos en procesos de selección de personal. Incluye instrumentos independientes que comparten el mismo servidor y el mismo login de evaluador:

- **DISC** — Sistema de Perfil Personal (28 ítems de selección forzada MÁS/MENOS).
- **IPV** — Inventario de Personalidad para Vendedores (87 preguntas de elección única A/B/C, corrección contra clave, decatipos y niveles).
- **BFI-2-XS** — Inventario Big Five 2, versión ultra breve (15 ítems de escala Likert 1–5, 5 dominios: Extraversión, Amabilidad, Responsabilidad, Emocionalidad Negativa y Apertura Mental).

Ver `CLAUDE.md` para el contexto completo del proyecto (calificación oficial, reglas, trabajo pendiente).

## Estructura

```
datos/            Datos oficiales de los instrumentos
  <raíz>           DISC (ítems, tablas de conversión, patrones, estilos)
  ipv/             IPV (87 preguntas con su clave, baremos/decatipos, mapeo pregunta→escala)
  bfi/             BFI-2-XS (15 ítems, mapeo ítem→dimensión e ítems inversos, umbrales de nivel, interpretaciones)
server/           Backend Express + SQLite
  scoring/         Motor de calificación DISC (puro, con tests: node --test)
  export/          Generadores de exportación DISC (docx, xlsx, html)
  ipv/             Motor de calificación IPV (puro + tests) y sus exportadores (ipv/export/)
  bfi/             Motor de calificación BFI-2-XS (puro + tests) y sus exportadores (bfi/export/)
  routes/          Endpoints de la API (DISC, IPV y BFI: bfi-sesiones, bfi-resultados, bfi-exportar)
  scripts/         Utilidades de línea de comandos (crear contraseña de evaluador)
public/
  evaluado/        Vista del postulante DISC (28 ítems, jamás ve resultados)
  evaluador/        Panel del evaluador DISC (login, lista, detalle, exportación)
  ipv/evaluado/    Vista del postulante IPV (87 preguntas, jamás ve resultados)
  ipv/evaluador/   Panel del evaluador IPV (login compartido, lista, detalle, exportación)
  bfi/evaluado/    Vista del postulante BFI-2-XS (15 ítems Likert, jamás ve resultados)
  bfi/evaluador/   Panel del evaluador BFI-2-XS (login compartido, lista, detalle, exportación)
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
- BFI-2-XS — evaluado: `http://localhost:3000/bfi/evaluado/` · evaluador: `http://localhost:3000/bfi/evaluador/`

El login del evaluador es el mismo para todos los instrumentos (misma tabla `evaluadores`, misma cookie de sesión).

### Cleaver

El Test de Cleaver vive en `cleaver-app/` como app React/Vite aparte (frontend
puro con `localStorage`, sin backend). Express la sirve en `/cleaver` **solo si
existe su build** (`cleaver-app/dist`), que no se versiona. Para desarrollo del
Cleaver conviene su propio servidor de Vite con recarga en caliente:

```bash
cd cleaver-app
npm install
npm run dev        # http://localhost:5173/
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
- IPV (`server/ipv/scoring.test.js`): 87 preguntas con clave válida, PD por escala = número de ítems con todo correcto, las escalas compuestas R y A como suma exacta de sus partes, los límites de la tabla de decatipos y el rechazo tipado de respuestas incompletas o inválidas.
- BFI-2-XS (`server/bfi/scoring.test.js`): 15 ítems mapeados 3 por dimensión sin solapamiento, los ítems inversos exactos (2, 5, 8, 13), la recodificación `6 − respuesta`, los umbrales de nivel (Muy bajo/Bajo/Medio/Alto/Muy alto) y el rechazo tipado de respuestas incompletas o inválidas.

## Lógica de calificación del BFI-2-XS

1. **Respuesta**: cada uno de los 15 ítems se responde en una escala Likert 1–5 (Muy en desacuerdo → Muy de acuerdo). Los ítems y el mapeo ítem→dimensión están en `datos/bfi/`.
2. **Ítems inversos**: los ítems 2, 5, 8 y 13 se recodifican con `valor usado = 6 − respuesta` (definidos con `inv: true` en `datos/bfi/preguntas_bfi.json`).
3. **Promedio por dimensión**: cada dominio (E, A, R, EN, AM) suma los valores usados de sus 3 ítems y divide entre 3 → promedio 1.0–5.0.
4. **Nivel**: Muy bajo (≤ 1.80), Bajo (≤ 2.60), Medio (≤ 3.40), Alto (≤ 4.20), Muy alto (> 4.20). Los umbrales y las interpretaciones por nivel salen de `datos/bfi/baremos_bfi.json`; el código no inventa interpretación. Son rangos descriptivos, no baremos normativos oficiales.

## Lógica de calificación del IPV

1. **Puntuación directa (PD)**: por cada escala específica (I…IX) se cuenta 1 punto por cada pregunta cuya respuesta coincide con la clave del manual (`datos/ipv/preguntas_ipv.json`). El mapeo pregunta→escala está en `datos/ipv/baremos_ipv.json`.
2. **Escalas compuestas**: `R = I + II + III + IV` (Receptividad) y `A = V + VI + VII + VIII` (Agresividad).
3. **DGV** (Disposición General para la Venta): coincidencias con la clave entre los 21 ítems representativos.
4. **Decatipos**: cada PD se convierte a un valor tipificado 1–10 según la tabla de baremos mexicanos (n = 300) de cada escala.
5. **Nivel**: Bajo (decatipo 1–3), Medio (4–7), Alto (8–10). Las descripciones por nivel salen de `datos/ipv/baremos_ipv.json`; el código no inventa interpretación.

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
   - Postulantes DISC: `/evaluado/` · IPV: `/ipv/evaluado/` · BFI-2-XS: `/bfi/evaluado/`
   - Evaluador: `/evaluador/`, `/ipv/evaluador/` o `/bfi/evaluador/` (login con `ADMIN_USER`/`ADMIN_PASSWORD`)
   - Cleaver: `/cleaver/` (frontend independiente, sin login de servidor)

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
