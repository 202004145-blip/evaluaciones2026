'use strict';

// Script interactivo para crear o actualizar la contraseña de un evaluador.
// La contraseña nunca se escribe en el código ni se pasa como argumento de
// línea de comandos (quedaría en el historial de la shell): se pide por
// entrada estándar con el eco desactivado.
//
// Uso:  npm run set-admin-password

const readline = require('node:readline');
const bcrypt = require('bcryptjs');
const db = require('../db');

function pregunta(rl, texto) {
  return new Promise((resolve) => rl.question(texto, resolve));
}

const CODIGO_ENTER = new Set([10, 13]); // \n, \r
const CODIGO_CTRL_C = 3;
const CODIGO_BACKSPACE = new Set([8, 127]); // backspace, delete

function preguntaOculta(texto) {
  return new Promise((resolve) => {
    const stdin = process.stdin;
    process.stdout.write(texto);
    stdin.resume();
    stdin.setRawMode(true);
    let valor = '';
    const onData = (buf) => {
      const code = buf[0];
      if (CODIGO_ENTER.has(code)) {
        stdin.setRawMode(false);
        stdin.pause();
        stdin.removeListener('data', onData);
        process.stdout.write('\n');
        resolve(valor);
        return;
      }
      if (code === CODIGO_CTRL_C) {
        stdin.setRawMode(false);
        process.exit(1);
      }
      if (CODIGO_BACKSPACE.has(code)) {
        valor = valor.slice(0, -1);
        return;
      }
      valor += buf.toString('utf8');
    };
    stdin.on('data', onData);
  });
}

async function main() {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const usuario = (await pregunta(rl, 'Usuario del evaluador (ej. admin): ')).trim();
  rl.close();
  if (!usuario) {
    console.error('El usuario no puede estar vacío.');
    process.exit(1);
  }
  const password = await preguntaOculta('Nueva contraseña: ');
  const confirmacion = await preguntaOculta('Confirma la contraseña: ');
  if (password !== confirmacion) {
    console.error('Las contraseñas no coinciden.');
    process.exit(1);
  }
  if (password.length < 8) {
    console.error('La contraseña debe tener al menos 8 caracteres.');
    process.exit(1);
  }

  const hash = bcrypt.hashSync(password, 12);
  db.prepare(
    `INSERT INTO evaluadores (usuario, password_hash) VALUES (?, ?)
     ON CONFLICT(usuario) DO UPDATE SET password_hash = excluded.password_hash`
  ).run(usuario, hash);

  console.log(`Contraseña guardada para el usuario "${usuario}".`);
}

main();
