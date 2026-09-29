import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../db';
import { cifrarPassword } from '../auth/password';
import { requiereAutenticacion, requiereRol } from '../auth/middleware';

export const maestrosRouter = Router();

// Lista de maestros. El Director ve todo (correo, teléfono, estado) y puede pedir
// también a los dados de baja con ?bajas=1. El resto de los usuarios solo necesita
// el nombre, así que el teléfono y el correo no se exponen.
maestrosRouter.get('/', requiereAutenticacion, async (req, res) => {
  const esDirector = req.usuario!.rol === 'director';
  const incluirBajas = esDirector && req.query.bajas === '1';
  const resultado = await pool.query(
    `SELECT ma.id, ma.nombre, ma.telefono, u.correo, u.activo
     FROM maestros ma
     JOIN usuarios u ON u.id = ma.id_usuario
     WHERE u.activo OR $1
     ORDER BY u.activo DESC, ma.nombre`,
    [incluirBajas],
  );
  res.json(esDirector ? resultado.rows : resultado.rows.map(({ id, nombre }) => ({ id, nombre })));
});

const esquemaAlta = z.object({
  correo: z.string().email('Correo inválido'),
  password: z.string().min(8, 'La contraseña necesita al menos 8 caracteres'),
  nombre: z.string().trim().min(1, 'Falta el nombre'),
  telefono: z.string().trim().optional(),
});

// Solo el Director da de alta maestros: crea su cuenta y su ficha en una sola transacción.
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
      [usuario.rows[0].id, nombre, telefono || null],
    );
    await cliente.query('COMMIT');
    res.status(201).json(maestro.rows[0]);
  } catch (error: any) {
    await cliente.query('ROLLBACK');
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Ese correo ya está registrado' });
    }
    console.error(error);
    res.status(500).json({ error: 'No se pudo dar de alta al maestro' });
  } finally {
    cliente.release();
  }
});

const esquemaEstado = z.object({ activo: z.boolean() });

// Dar de baja o reactivar. No borra nada: sus asignaciones y lo que capturó se conservan.
maestrosRouter.patch('/:id/estado', requiereAutenticacion, requiereRol('director'), async (req, res) => {
  const id = Number(req.params.id);
  const datos = esquemaEstado.safeParse(req.body);
  if (!Number.isInteger(id) || id <= 0 || !datos.success) {
    return res.status(400).json({ error: 'Datos inválidos' });
  }

  const resultado = await pool.query(
    `UPDATE usuarios u SET activo = $2
     FROM maestros ma
     WHERE ma.id = $1 AND u.id = ma.id_usuario
     RETURNING ma.id, u.activo`,
    [id, datos.data.activo],
  );
  if (!resultado.rowCount) {
    return res.status(404).json({ error: 'Ese maestro no existe' });
  }
  res.json(resultado.rows[0]);
});