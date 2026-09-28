import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../db';
import { cifrarPassword } from '../auth/password';
import { requiereAutenticacion, requiereRol } from '../auth/middleware';

export const maestrosRouter = Router();

const esquemaAlta = z.object({
  correo: z.string().email(),
  password: z.string().min(8),
  nombre: z.string().min(1),
  telefono: z.string().optional(),
});

// Solo el Director da de alta maestros.
maestrosRouter.post('/', requiereAutenticacion, requiereRol('director'), async (req, res) => {
  const datos = esquemaAlta.safeParse(req.body);
  if (!datos.success) {
    return res.status(400).json({ error: datos.error.issues[0].message });
  }
  const { correo, password, nombre, telefono } = datos.data;

  const cliente = await pool.connect();
  try {
    await cliente.query('BEGIN');
    const hash = await cifrarPassword(password);
    const usuario = await cliente.query(
      `INSERT INTO usuarios (correo, password_hash, rol) VALUES ($1, $2, 'maestro') RETURNING id`,
      [correo, hash],
    );
    const maestro = await cliente.query(
      `INSERT INTO maestros (id_usuario, nombre, telefono) VALUES ($1, $2, $3) RETURNING id, nombre, telefono`,
      [usuario.rows[0].id, nombre, telefono ?? null],
    );
    await cliente.query('COMMIT');
    res.status(201).json(maestro.rows[0]);
  } catch (error) {
    await cliente.query('ROLLBACK');
    console.error(error);
    res.status(500).json({ error: 'No se pudo dar de alta al maestro' });
  } finally {
    cliente.release();
  }
});

// Cualquier persona autenticada puede consultar la lista (la necesita el Director
// para armar asignaciones, y sirve para mostrarla en el panel web).
maestrosRouter.get('/', requiereAutenticacion, async (_req, res) => {
  const resultado = await pool.query('SELECT id, nombre, telefono FROM maestros ORDER BY nombre');
  res.json(resultado.rows);
});