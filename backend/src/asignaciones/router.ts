import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../db';
import { requiereAutenticacion, requiereRol } from '../auth/middleware';

export const asignacionesRouter = Router();

const esquemaAlta = z.object({
  idMaestro: z.number().int().positive(),
  idMateria: z.number().int().positive(),
  idGrupo: z.number().int().positive(),
});

// Solo el Director asigna qué maestro da qué materia a qué grupo.
// Esta tabla es la que después va a limitar lo que cada maestro puede
// hacer en asistencia, calificaciones y avisos.
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

// Lo que un maestro puede ver: sus propias asignaciones (para saber
// qué grupos y materias le tocan). El Director puede pedir las de cualquiera.
asignacionesRouter.get('/mias', requiereAutenticacion, requiereRol('maestro'), async (req, res) => {
  const resultado = await pool.query(
    `SELECT mmg.id, m.nombre AS materia, g.nombre AS grupo, g.id AS id_grupo, mat.id AS id_materia
     FROM materia_maestro_grupo mmg
     JOIN maestros ma ON ma.id = mmg.id_maestro
     JOIN materias m ON m.id = mmg.id_materia
     JOIN materias mat ON mat.id = mmg.id_materia
     JOIN grupos g ON g.id = mmg.id_grupo
     WHERE ma.id_usuario = $1`,
    [req.usuario!.idUsuario],
  );
  res.json(resultado.rows);
});