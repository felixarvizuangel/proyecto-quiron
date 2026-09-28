import path from 'node:path';
import dotenv from 'dotenv';

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
  jwtSecret: requerida('JWT_SECRET'),
  db: {
    host: process.env.DB_HOST ?? '127.0.0.1',
    port: Number(process.env.DB_PORT ?? 5432),
    user: requerida('POSTGRES_USER'),
    password: requerida('POSTGRES_PASSWORD'),
    database: requerida('POSTGRES_DB'),
  },
};