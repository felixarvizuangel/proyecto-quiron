import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../db';
import { requiereAutenticacion, requiereRol } from '../auth/middleware';

export const materiasRouter = Router();

const esquemaAlta = z.object({
  nombre: z.string().min(1),
});

materiasRouter.post('/', requiereAutenticacion, requiereRol('director'), async (req, res) => {
  const datos = esquemaAlta.safeParse(req.body);
  if (!datos.success) {
    return res.status(400).json({ error: datos.error.issues[0].message });
  }
  try {
    const resultado = await pool.query(
      'INSERT INTO materias (nombre) VALUES ($1) RETURNING id, nombre',
      [datos.data.nombre],
    );
    res.status(201).json(resultado.rows[0]);
  } catch (error: any) {
    // Código 23505 = choque con una restricción UNIQUE (nombre repetido).
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Esa materia ya existe' });
    }
    console.error(error);
    res.status(500).json({ error: 'No se pudo crear la materia' });
  }
});

materiasRouter.get('/', requiereAutenticacion, async (_req, res) => {
  const resultado = await pool.query('SELECT id, nombre FROM materias ORDER BY nombre');
  res.json(resultado.rows);
});