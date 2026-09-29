import { readFileSync } from 'node:fs';
import path from 'node:path';
import { pool } from '../db';

// Crea las tablas que falten en la base configurada. No borra nada: schema.sql
// usa CREATE TABLE IF NOT EXISTS, así que se puede correr las veces que sea.
// Sirve para instalar Quirón en una escuela real, sin datos de demostración.
// Uso: npm run esquema
async function main() {
  const sql = readFileSync(path.resolve(__dirname, '../../db/schema.sql'), 'utf8');
  await pool.query(sql);
  const tablas = await pool.query(
    "SELECT count(*) AS total FROM information_schema.tables WHERE table_schema = 'public'",
  );
  console.log(`Esquema aplicado. Tablas en la base: ${tablas.rows[0].total}`);
}

main()
  .catch((error) => {
    console.error('No se pudo aplicar el esquema:', error.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());