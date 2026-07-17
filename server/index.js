'use strict';

const path = require('node:path');
const crypto = require('node:crypto');
const express = require('express');
const session = require('express-session');

const { hayEvaluadoresRegistrados, bootstrapAdminFromEnv } = require('./auth');
const authRoutes = require('./routes/auth');
const sesionesRoutes = require('./routes/sesiones');
const resultadosRoutes = require('./routes/resultados');
const exportarRoutes = require('./routes/exportar');
const ipvSesionesRoutes = require('./routes/ipv-sesiones');
const ipvResultadosRoutes = require('./routes/ipv-resultados');
const ipvExportarRoutes = require('./routes/ipv-exportar');

const app = express();
const PORT = process.env.PORT || 3000;
const isProd = process.env.NODE_ENV === 'production';

let sessionSecret = process.env.SESSION_SECRET;
if (!sessionSecret) {
  if (isProd) {
    console.error('Falta la variable de entorno SESSION_SECRET (obligatoria en producción).');
    process.exit(1);
  }
  sessionSecret = crypto.randomBytes(32).toString('hex');
  console.warn(
    'Aviso: SESSION_SECRET no definido, se generó uno temporal para desarrollo. ' +
      'Las sesiones de evaluador se invalidarán al reiniciar el servidor.'
  );
}

// Bootstrap del evaluador desde variables de entorno (útil en hosting sin
// terminal interactiva, p. ej. Railway). No hace nada si no están definidas.
bootstrapAdminFromEnv();

app.disable('x-powered-by');
if (isProd) app.set('trust proxy', 1);

app.use(express.json());
app.use(
  session({
    secret: sessionSecret,
    name: 'disc_pradeva_sid',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: isProd,
      maxAge: 8 * 60 * 60 * 1000, // 8 horas
    },
  })
);

app.use('/api/auth', authRoutes);
app.use('/api/sesiones', sesionesRoutes);
app.use('/api/resultados', resultadosRoutes);
app.use('/api/exportar', exportarRoutes);
app.use('/api/ipv/sesiones', ipvSesionesRoutes);
app.use('/api/ipv/resultados', ipvResultadosRoutes);
app.use('/api/ipv/exportar', ipvExportarRoutes);

app.get('/api/estado', (req, res) => {
  res.json({ ok: true, evaluadorConfigurado: hayEvaluadoresRegistrados() });
});

app.use('/shared', express.static(path.join(__dirname, '..', 'public', 'shared')));
app.use('/evaluado', express.static(path.join(__dirname, '..', 'public', 'evaluado')));
app.use('/evaluador', express.static(path.join(__dirname, '..', 'public', 'evaluador')));
app.use('/ipv/evaluado', express.static(path.join(__dirname, '..', 'public', 'ipv', 'evaluado')));
app.use('/ipv/evaluador', express.static(path.join(__dirname, '..', 'public', 'ipv', 'evaluador')));
app.use('/ipv', express.static(path.join(__dirname, '../public', 'ipv')));
app.use('/ipv', express.static(path.join(__dirname, '../public', 'ipv')));
app.get('/', (req, res) => res.redirect('/evaluado/'));

app.use((req, res) => res.status(404).json({ error: 'No encontrado.' }));

app.listen(PORT, () => {
  console.log(`DISC PRADEVA escuchando en http://localhost:${PORT}`);
  if (!hayEvaluadoresRegistrados()) {
    console.warn(
      'No hay ningún evaluador registrado todavía. Ejecuta "npm run set-admin-password" para crear el primero.'
    );
  }
});
