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

El login del evaluador es el mismo para ambos instrumentos (misma tabla `evaluadores`, misma cookie de sesión).

## Tests

```bash
npm test
```

- DISC (`server/scoring/scoring.test.js`): suma de conteos MÁS = 28, suma MENOS = 28, cobertura completa de las tablas de conversión, los 13 códigos faltantes de la matriz de patrones y los códigos de verificación 1115→Objetivo, 1511→Promotor, 5555→Superactivo.
- IPV (`server/ipv/scoring.test.js`): 87 preguntas con clave válida, PD por escala = número de ítems con todo correcto, las escalas compuestas R y A como suma exacta de sus partes, los límites de la tabla de decatipos y el rechazo tipado de respuestas incompletas o inválidas.

## Lógica de calificación del IPV

1. **Puntuación directa (PD)**: por cada escala específica (I…IX) se cuenta 1 punto por cada pregunta cuya respuesta coincide con la clave del manual (`datos/ipv/preguntas_ipv.json`). El mapeo pregunta→escala está en `datos/ipv/baremos_ipv.json`.
2. **Escalas compuestas**: `R = I + II + III + IV` (Receptividad) y `A = V + VI + VII + VIII` (Agresividad).
3. **DGV** (Disposición General para la Venta): coincidencias con la clave entre los 21 ítems representativos.
4. **Decatipos**: cada PD se convierte a un valor tipificado 1–10 según la tabla de baremos mexicanos (n = 300) de cada escala.
5. **Nivel**: Bajo (decatipo 1–3), Medio (4–7), Alto (8–10). Las descripciones por nivel salen de `datos/ipv/baremos_ipv.json`; el código no inventa interpretación.

## Notas de seguridad

- La base de datos (`data.sqlite`) y el archivo `.env` nunca se suben al repositorio (ver `.gitignore`).
- Ningún endpoint de resultados o exportación responde sin sesión de evaluador autenticada.
- El evaluado solo puede leer/escribir su propia sesión mediante el token que recibe al crearla.
