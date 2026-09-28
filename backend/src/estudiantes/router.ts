import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../db';
import { cifrarPassword } from '../auth/password';
import { requiereAutenticacion, requiereRol } from '../auth/middleware';

export const estudiantesRouter = Router();

const esquemaAlta = z.object({
  correo: z.string().email(),
  password: z.string().min(8),
  nombre: z.string().min(1),
  matricula: z.string().min(1),
  idGrupo: z.number().int().positive(),
  direccion: z.string().optional(),
});

// Solo un usuario autenticado Y con rol "director" puede llegar hasta aquí.
// Si alguno de los dos middlewares falla, la petición nunca toca la base de datos.
estudiantesRouter.post(
  '/',
  requiereAutenticacion,
  requiereRol('director'),
  async (req, res) => {
    const datos = esquemaAlta.safeParse(req.body);
    if (!datos.success) {
      return res.status(400).json({ error: datos.error.issues[0].message });
    }
    const { correo, password, nombre, matricula, idGrupo, direccion } = datos.data;

    // Genera un código de 8 caracteres para que los padres se vinculen a este estudiante.
    const codigoParental = Math.random().toString(36).slice(2, 10).toUpperCase();

    const cliente = await pool.connect();
    try {
      await cliente.query('BEGIN');

      const hash = await cifrarPassword(password);
      const usuario = await cliente.query(
        `INSERT INTO usuarios (correo, password_hash, rol) VALUES ($1, $2, 'estudiante') RETURNING id`,
        [correo, hash],
      );

      const estudiante = await cliente.query(
        `INSERT INTO estudiantes (id_usuario, id_grupo, nombre, matricula, direccion, codigo_parental)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, nombre, matricula, codigo_parental`,
        [usuario.rows[0].id, idGrupo, nombre, matricula, direccion ?? null, codigoParental],
      );

      await cliente.query('COMMIT');
      res.status(201).json(estudiante.rows[0]);
    } catch (error) {
      await cliente.query('ROLLBACK');
      console.error(error);
      res.status(500).json({ error: 'No se pudo dar de alta al estudiante' });
    } finally {
      cliente.release();
    }
  },
);