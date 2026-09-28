import { Pool } from 'pg';
import { config } from './config';

// Un Pool mantiene varias conexiones abiertas y las reutiliza,
// en vez de abrir y cerrar una por cada petición.
export const pool = new Pool(config.db);