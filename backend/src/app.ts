import express from 'express';
import { pool } from './db';

export const app = express();

app.use(express.json());
import { authRouter } from './auth/router';
app.use('/auth', authRouter);
// Ruta de salud: confirma que la API vive y que llega a la base de datos
app.get('/salud', async (_req, res) => {
  try {
    const resultado = await pool.query('SELECT now() AS hora');
    res.json({
      estado: 'ok',
      baseDeDatos: 'conectada',
      hora: resultado.rows[0].hora,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ estado: 'error', baseDeDatos: 'sin conexion' });
  }
});