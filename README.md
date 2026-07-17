# Sistema de Perfil Personal (DISC) — PRADEVA

Aplicación web para administrar y calificar el test psicométrico DISC (28 ítems de selección forzada MÁS/MENOS) en procesos de selección de personal.

Ver `CLAUDE.md` para el contexto completo del proyecto (calificación oficial, reglas, trabajo pendiente).

## Estructura

```
datos/            Datos oficiales del instrumento (ítems, tablas de conversión, patrones, estilos)
server/           Backend Express + SQLite
  scoring/         Motor de calificación puro (con tests: node --test)
  export/          Generadores de exportación (docx, xlsx, html)
  routes/          Endpoints de la API
  scripts/         Utilidades de línea de comandos (crear contraseña de evaluador)
public/
  evaluado/        Vista del postulante (28 ítems, jamás ve resultados)
  evaluador/        Panel del evaluador (login, lista, detalle, exportación)
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

- Vista del evaluado: `http://localhost:3000/evaluado/`
- Panel del evaluador: `http://localhost:3000/evaluador/`

## Tests

```bash
npm test
```

Corre el motor de calificación (`server/scoring/scoring.test.js`) contra los invariantes validados: suma de conteos MÁS = 28, suma MENOS = 28, cobertura completa de las tablas de conversión, los 13 códigos faltantes de la matriz de patrones, y los códigos de verificación 1115→Objetivo, 1511→Promotor, 5555→Superactivo.

## Notas de seguridad

- La base de datos (`data.sqlite`) y el archivo `.env` nunca se suben al repositorio (ver `.gitignore`).
- Ningún endpoint de resultados o exportación responde sin sesión de evaluador autenticada.
- El evaluado solo puede leer/escribir su propia sesión mediante el token que recibe al crearla.
