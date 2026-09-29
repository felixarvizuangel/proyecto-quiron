import { randomInt } from 'node:crypto';
import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../db';
import { cifrarPassword } from '../auth/password';
import { requiereAutenticacion, requiereRol } from '../auth/middleware';

export const estudiantesRouter = Router();

// El código parental es la llave que vincula a una familia con su hijo, así que
// se genera con el generador seguro de Node (no con Math.random) y sin
// caracteres que se confunden al teclear (0 y O, 1 e I).
const ALFABETO = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function generarCodigoParental() {
  return Array.from({ length: 8 }, () => ALFABETO[randomInt(ALFABETO.length)]).join('');
}

// Lista para el Director, con su grupo y su correo de acceso.
// Por defecto solo los activos; con ?bajas=1 incluye también a los dados de baja.
estudiantesRouter.get('/', requiereAutenticacion, requiereRol('director'), async (req, res) => {
  const incluirBajas = req.query.bajas === '1';
  const resultado = await pool.query(
    `SELECT e.id, e.nombre, e.matricula, e.codigo_parental, g.nombre AS grupo, u.correo, u.activo
     FROM estudiantes e
     JOIN grupos g ON g.id = e.id_grupo
     JOIN usuarios u ON u.id = e.id_usuario
     WHERE u.activo OR $1
     ORDER BY u.activo DESC, g.nombre, e.nombre`,
    [incluirBajas],
  );
  res.json(resultado.rows);
});

const esquemaAlta = z.object({
  correo: z.string().email('Correo inválido'),
  password: z.string().min(8, 'La contraseña necesita al menos 8 caracteres'),
  nombre: z.string().trim().min(1, 'Falta el nombre'),
  matricula: z.string().trim().min(1, 'Falta la matrícula'),
  idGrupo: z.number().int().positive('Elige un grupo'),
  direccion: z.string().optional(),
});

// Solo un usuario autenticado Y con rol "director" puede dar de alta.
estudiantesRouter.post('/', requiereAutenticacion, requiereRol('director'), async (req, res) => {
  const datos = esquemaAlta.safeParse(req.body);
  if (!datos.success) {
    return res.status(400).json({ error: datos.error.issues[0].message });
  }
  const { correo, password, nombre, matricula, idGrupo, direccion } = datos.data;

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
      [usuario.rows[0].id, idGrupo, nombre, matricula, direccion ?? null, generarCodigoParental()],
    );

    await cliente.query('COMMIT');
    res.status(201).json(estudiante.rows[0]);
  } catch (error: any) {
    await cliente.query('ROLLBACK');
    // 23505 = dato repetido. El nombre de la restricción dice cuál campo chocó.
    if (error.code === '23505') {
      const mensajes: Record<string, string> = {
        usuarios_correo_key: 'Ese correo ya está registrado',
        estudiantes_matricula_key: 'Esa matrícula ya existe',
      };
      return res.status(409).json({ error: mensajes[error.constraint] ?? 'Ese registro ya existe' });
    }
    // 23503 = la llave foránea apunta a algo que no existe.
    if (error.code === '23503') {
      return res.status(400).json({ error: 'El grupo elegido no existe' });
    }
    console.error(error);
    res.status(500).json({ error: 'No se pudo dar de alta al estudiante' });
  } finally {
    cliente.release();
  }
});

const esquemaEstado = z.object({ activo: z.boolean() });

// Dar de baja o reactivar. No borra nada: solo cambia "activo" en su cuenta,
// así que su historial de asistencia y calificaciones se conserva.
estudiantesRouter.patch('/:id/estado', requiereAutenticacion, requiereRol('director'), async (req, res) => {
  const id = Number(req.params.id);
  const datos = esquemaEstado.safeParse(req.body);
  if (!Number.isInteger(id) || id <= 0 || !datos.success) {
    return res.status(400).json({ error: 'Datos inválidos' });
  }

  const resultado = await pool.query(
    `UPDATE usuarios u SET activo = $2
     FROM estudiantes e
     WHERE e.id = $1 AND u.id = e.id_usuario
     RETURNING e.id, u.activo`,
    [id, datos.data.activo],
  );
  if (!resultado.rowCount) {
    return res.status(404).json({ error: 'Ese estudiante no existe' });
  }
  res.json(resultado.rows[0]);
});