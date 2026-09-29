import express from 'express';
import { pool } from './db';
import { authRouter } from './auth/router';
import { estudiantesRouter } from './estudiantes/router';
import { maestrosRouter } from './maestros/router';
import { materiasRouter } from './materias/router';
import { gruposRouter } from './grupos/router';
import { asignacionesRouter } from './asignaciones/router';
import { asistenciaRouter } from './asistencia/router';
import { calificacionesRouter } from './calificaciones/router';
import { avisosRouter } from './avisos/router';
import { familiaRouter } from './familia/router';

export const app = express();

// Convierte el cuerpo JSON de cada petición en un objeto. Va antes de las rutas.
app.use(express.json());

app.use('/auth', authRouter);
app.use('/estudiantes', estudiantesRouter);
app.use('/maestros', maestrosRouter);
app.use('/materias', materiasRouter);
app.use('/grupos', gruposRouter);
app.use('/asignaciones', asignacionesRouter);
app.use('/asistencia', asistenciaRouter);
app.use('/calificaciones', calificacionesRouter);
app.use('/avisos', avisosRouter);
app.use('/familia', familiaRouter);

// Ruta de salud: confirma que la API vive y que llega a la base de datos.
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