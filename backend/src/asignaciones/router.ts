import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../db';
import { requiereAutenticacion, requiereRol } from '../auth/middleware';

export const asignacionesRouter = Router();

// Lista completa para el Director, con nombres en vez de ids.
asignacionesRouter.get('/', requiereAutenticacion, requiereRol('director'), async (_req, res) => {
  const resultado = await pool.query(
    `SELECT mmg.id, ma.nombre AS maestro, m.nombre AS materia, g.nombre AS grupo
     FROM materia_maestro_grupo mmg
     JOIN maestros ma ON ma.id = mmg.id_maestro
     JOIN materias m ON m.id = mmg.id_materia
     JOIN grupos g ON g.id = mmg.id_grupo
     ORDER BY g.nombre, m.nombre`,
  );
  res.json(resultado.rows);
});

const esquemaAlta = z.object({
  idMaestro: z.number().int().positive('Elige un maestro'),
  idMateria: z.number().int().positive('Elige una materia'),
  idGrupo: z.number().int().positive('Elige un grupo'),
});

// Solo el Director asigna qué maestro da qué materia a qué grupo. Esta tabla es la
// que después limita lo que cada maestro puede hacer en asistencia, calificaciones y avisos.
asignacionesRouter.post('/', requiereAutenticacion, requiereRol('director'), async (req, res) => {
  const datos = esquemaAlta.safeParse(req.body);
  if (!datos.success) {
    return res.status(400).json({ error: datos.error.issues[0].message });
  }
  const { idMaestro, idMateria, idGrupo } = datos.data;

  try {
    const resultado = await pool.query(
      `INSERT INTO materia_maestro_grupo (id_maestro, id_materia, id_grupo)
       VALUES ($1, $2, $3)
       RETURNING id, id_maestro, id_materia, id_grupo`,
      [idMaestro, idMateria, idGrupo],
    );
    res.status(201).json(resultado.rows[0]);
  } catch (error: any) {
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Esa asignación ya existe' });
    }
    if (error.code === '23503') {
      return res.status(400).json({ error: 'El maestro, la materia o el grupo no existen' });
    }
    console.error(error);
    res.status(500).json({ error: 'No se pudo crear la asignación' });
  }
});

// Quitar una asignación. El historial de asistencia y calificaciones no se pierde,
// porque esas tablas no dependen de la asignación. Si ya hay avisos publicados
// con ella, la base de datos no deja borrarla, para no dejar avisos huérfanos.
asignacionesRouter.delete('/:id', requiereAutenticacion, requiereRol('director'), async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: 'Asignación inválida' });
  }

  try {
    const resultado = await pool.query('DELETE FROM materia_maestro_grupo WHERE id = $1', [id]);
    if (!resultado.rowCount) {
      return res.status(404).json({ error: 'Esa asignación no existe' });
    }
    res.status(204).end();
  } catch (error: any) {
    if (error.code === '23503') {
      return res.status(409).json({ error: 'No se puede quitar: ya tiene avisos publicados' });
    }
    console.error(error);
    res.status(500).json({ error: 'No se pudo quitar la asignación' });
  }
});

// Lo que ve un maestro: sus propias asignaciones.
asignacionesRouter.get('/mias', requiereAutenticacion, requiereRol('maestro'), async (req, res) => {
  const resultado = await pool.query(
    `SELECT mmg.id, m.nombre AS materia, g.nombre AS grupo, mmg.id_grupo, mmg.id_materia
     FROM materia_maestro_grupo mmg
     JOIN maestros ma ON ma.id = mmg.id_maestro
     JOIN materias m ON m.id = mmg.id_materia
     JOIN grupos g ON g.id = mmg.id_grupo
     WHERE ma.id_usuario = $1
     ORDER BY g.nombre, m.nombre`,
    [req.usuario!.idUsuario],
  );
  res.json(resultado.rows);
});