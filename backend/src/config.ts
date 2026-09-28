import path from 'node:path';
import dotenv from 'dotenv';

// El .env vive en la raíz del proyecto, dos niveles arriba de este archivo
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

function requerida(nombre: string): string {
  const valor = process.env[nombre];
  if (!valor) {
    throw new Error(`Falta la variable de entorno ${nombre} en el archivo .env`);
  }
  return valor;
}

export const config = {
  port: Number(process.env.PORT ?? 3000),
  db: {
    host: process.env.DB_HOST ?? 'localhost',
    port: Number(process.env.DB_PORT ?? 5432),
    user: requerida('POSTGRES_USER'),
    password: requerida('POSTGRES_PASSWORD'),
    database: requerida('POSTGRES_DB'),
  },
};