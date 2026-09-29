import { readFileSync } from 'node:fs';
import path from 'node:path';
import argon2 from 'argon2';
import dotenv from 'dotenv';
import { Client } from 'pg';

// Se ejecuta una vez antes de todas las pruebas (npm test, desde la carpeta backend).
// Crea la base "quiron_test" si no existe, la deja vacía, crea las tablas con
// schema.sql y carga datos conocidos. La base de desarrollo nunca se toca.
export default async function prepararBase() {
  dotenv.config({ path: path.resolve(process.cwd(), '../.env'), quiet: true });

  const conexion = {
    host: process.env.DB_HOST ?? '127.0.0.1',
    port: Number(process.env.DB_PORT ?? 5432),
    user: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
  };

  // 1. Crear la base de pruebas si todavía no existe.
  const admin = new Client({ ...conexion, database: process.env.POSTGRES_DB });
  await admin.connect();
  const existe = await admin.query("SELECT 1 FROM pg_database WHERE datname = 'quiron_test'");
  if (!existe.rowCount) {
    await admin.query('CREATE DATABASE quiron_test');
  }
  await admin.end();

  // 2. Dejarla vacía, crear las tablas y cargar los datos de prueba.
  const cliente = new Client({ ...conexion, database: 'quiron_test' });
  await cliente.connect();
  try {
    await cliente.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
    await cliente.query(readFileSync(path.resolve(process.cwd(), 'db/schema.sql'), 'utf8'));

    const hash = await argon2.hash('Prueba1234');
    await cliente.query(
      `INSERT INTO usuarios (correo, password_hash, rol) VALUES
         ('director@test.mx', $1, 'director'),
         ('carlos@test.mx',   $1, 'maestro'),
         ('marta@test.mx',    $1, 'maestro'),
         ('jorge@test.mx',    $1, 'maestro'),
         ('ana@test.mx',      $1, 'estudiante'),
         ('beto@test.mx',     $1, 'estudiante'),
         ('laura@test.mx',    $1, 'padre')`,
      [hash],
    );

    // Como la base se crea desde cero, los ids empiezan en 1 y son predecibles.
    await cliente.query(`
      INSERT INTO grupos (nombre, grado) VALUES ('Grupo A', 1), ('Grupo B', 1);
      INSERT INTO materias (nombre) VALUES ('Programación Web'), ('Matemáticas');
      INSERT INTO maestros (id_usuario, nombre) VALUES (2, 'Carlos'), (3, 'Marta'), (4, 'Jorge');
      INSERT INTO estudiantes (id_usuario, id_grupo, nombre, matricula, codigo_parental)
        VALUES (5, 1, 'Ana', 'T001', 'ANACODE2'), (6, 2, 'Beto', 'T002', 'BETOCOD3');
      INSERT INTO padres (id_usuario, nombre) VALUES (7, 'Laura');
      INSERT INTO estudiante_padre (id_estudiante, id_padre, relacion) VALUES (1, 1, 'madre');
      INSERT INTO materia_maestro_grupo (id_maestro, id_materia, id_grupo) VALUES (1, 1, 1), (2, 2, 2);
    `);
  } finally {
    await cliente.end();
  }
}