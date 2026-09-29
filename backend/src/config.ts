import path from 'node:path';
import dotenv from 'dotenv';

// En tu computadora las variables vienen del .env de la raíz. En Render vienen de la
// configuración del servicio y el archivo no existe (dotenv simplemente no hace nada).
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

function requerida(nombre: string): string {
  const valor = process.env[nombre];
  if (!valor) {
    throw new Error(`Falta la variable de entorno ${nombre}`);
  }
  return valor;
}

// Conexión a PostgreSQL. En la nube (Neon) llega como una sola dirección y exige
// conexión cifrada; en tu computadora (Docker) se arma con las variables por separado.
function conexionBaseDeDatos() {
  const url = process.env.DATABASE_URL;
  if (url) {
    return { connectionString: url, ssl: true };
  }
  return {
    host: process.env.DB_HOST ?? '127.0.0.1',
    port: Number(process.env.DB_PORT ?? 5432),
    user: requerida('POSTGRES_USER'),
    password: requerida('POSTGRES_PASSWORD'),
    database: requerida('POSTGRES_DB'),
  };
}

export const config = {
  port: Number(process.env.PORT ?? 3000),
  jwtSecret: requerida('JWT_SECRET'),
  // Calificación mínima para aprobar. Como el estado se calcula al leer,
  // cambiar este valor no obliga a tocar ningún registro guardado.
  calificacionMinima: Number(process.env.CALIFICACION_MINIMA ?? 6),
  // Sitios que pueden llamar a la API desde un navegador (el panel publicado),
  // separados por comas. En desarrollo no hace falta: el panel usa el proxy de Vite.
  origenesPermitidos: (process.env.CORS_ORIGEN ?? '')
    .split(',')
    .map((origen) => origen.trim())
    .filter(Boolean),
  // Cuántos proxies hay delante de la API: 0 en tu computadora, 1 en Render.
  proxiesConfiables: Number(process.env.PROXIES_CONFIABLES ?? 0),
  db: conexionBaseDeDatos(),
};