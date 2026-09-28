import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../db';
import { requiereAutenticacion, requiereRol } from '../auth/middleware';

export const gruposRouter = Router();

const esquemaAlta = z.object({
  nombre: z.string().min(1),
  grado: z.number().int().positive(),
});

gruposRouter.post('/', requiereAutenticacion, requiereRol('director'), async (req, res) => {
  const datos = esquemaAlta.safeParse(req.body);
  if (!datos.success) {
    return res.status(400).json({ error: datos.error.issues[0].message });
  }
  try {
    const resultado = await pool.query(
      'INSERT INTO grupos (nombre, grado) VALUES ($1, $2) RETURNING id, nombre, grado',
      [datos.data.nombre, datos.data.grado],
    );
    res.status(201).json(resultado.rows[0]);
  } catch (error: any) {
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Ese grupo ya existe' });
    }
    console.error(error);
    res.status(500).json({ error: 'No se pudo crear el grupo' });
  }
});

gruposRouter.get('/', requiereAutenticacion, async (_req, res) => {
  const resultado = await pool.query('SELECT id, nombre, grado FROM grupos ORDER BY grado, nombre');
  res.json(resultado.rows);
});