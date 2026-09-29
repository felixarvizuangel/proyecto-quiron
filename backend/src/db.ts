import { Pool, types } from 'pg';
import { config } from './config';

// Cómo convierte pg los tipos de PostgreSQL a JavaScript:
// - BIGINT (20) y NUMERIC (1700) llegan como texto por precaución. Nuestros ids
//   nunca pasan de 2^53 y las calificaciones tienen 2 decimales, así que se
//   pueden convertir a número sin perder precisión.
// - DATE (1082) se convertía en fecha con hora y zona horaria (2026-09-28T07:00:00Z).
//   Una fecha de asistencia no tiene hora, así que se deja como texto 'AAAA-MM-DD'.
types.setTypeParser(20, (valor: string) => parseInt(valor, 10));
types.setTypeParser(1700, (valor: string) => parseFloat(valor));
types.setTypeParser(1082, (valor: string) => valor);

// Un Pool mantiene varias conexiones abiertas y las reutiliza,
// en vez de abrir y cerrar una por cada petición.
export const pool = new Pool(config.db);