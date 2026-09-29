import { pool } from '../db';
import { cifrarPassword } from '../auth/password';

// Crea la cuenta del Director. Se usa una vez al instalar el sistema,
// porque nadie puede registrarse como director desde la API.
// Uso: npm run crear-director -- correo@escuela.mx "contraseña de 8 o más caracteres"
async function main() {
  const [correo, password] = process.argv.slice(2);
  if (!correo || !password || password.length < 8) {
    console.error('Uso: npm run crear-director -- <correo> <contraseña de 8 o más caracteres>');
    process.exitCode = 1;
    return;
  }
  const hash = await cifrarPassword(password);
  const resultado = await pool.query(
    `INSERT INTO usuarios (correo, password_hash, rol) VALUES ($1, $2, 'director') RETURNING id, correo`,
    [correo, hash],
  );
  console.log('Director creado:', resultado.rows[0]);
}

main()
  .catch((error) => {
    console.error('No se pudo crear el director:', error.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());