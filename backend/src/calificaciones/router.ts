import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../db';
import { requiereAutenticacion, requiereRol } from '../auth/middleware';

export const calificacionesRouter = Router();

const esquemaRegistro = z.object({
  idEstudiante: z.number().int().positive(),
  idMateria: z.number().int().positive(),
  calificacion: z.number().min(0).max(10),
  parcial: z.number().int().positive(),
});

async function maestroPuedeOperar(idUsuarioMaestro: number, idEstudiante: number, idMateria: number) {
  const resultado = await pool.query(
    `SELECT ma.id AS id_maestro
     FROM materia_maestro_grupo mmg
     JOIN maestros ma ON ma.id = mmg.id_maestro
     JOIN estudiantes e ON e.id_grupo = mmg.id_grupo
     WHERE ma.id_usuario = $1 AND mmg.id_materia = $2 AND e.id = $3`,
    [idUsuarioMaestro, idMateria, idEstudiante],
  );
  return resultado.rows[0]?.id_maestro as number | undefined;
}

calificacionesRouter.post('/', requiereAutenticacion, requiereRol('maestro'), async (req, res) => {
  const datos = esquemaRegistro.safeParse(req.body);
  if (!datos.success) {
    return res.status(400).json({ error: datos.error.issues[0].message });
  }
  const { idEstudiante, idMateria, calificacion, parcial } = datos.data;

  const idMaestro = await maestroPuedeOperar(req.usuario!.idUsuario, idEstudiante, idMateria);
  if (!idMaestro) {
    return res.status(403).json({ error: 'No impartes esta materia a este estudiante' });
  }

  try {
    const resultado = await pool.query(
      `INSERT INTO calificaciones (id_estudiante, id_materia, id_maestro, calificacion, parcial)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (id_estudiante, id_materia, parcial)
       DO UPDATE SET calificacion = EXCLUDED.calificacion, id_maestro = EXCLUDED.id_maestro
       RETURNING id, id_estudiante, id_materia, calificacion, parcial`,
      [idEstudiante, idMateria, idMaestro, calificacion, parcial],
    );
    res.status(201).json(resultado.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'No se pudo registrar la calificación' });
  }
});

// El aprobado/reprobado se calcula al leer, nunca se guarda (tu decisión de diseño).
calificacionesRouter.get('/estudiante/:id', requiereAutenticacion, async (req, res) => {
  const idEstudiante = Number(req.params.id);
  const { rol, idUsuario } = req.usuario!;

  if (rol === 'estudiante') {
    const propio = await pool.query('SELECT 1 FROM estudiantes WHERE id = $1 AND id_usuario = $2', [idEstudiante, idUsuario]);
    if (!propio.rowCount) return res.status(403).json({ error: 'No puedes ver las calificaciones de otro estudiante' });
  } else if (rol === 'padre') {
    const vinculado = await pool.query(
      `SELECT 1 FROM estudiante_padre ep
       JOIN padres p ON p.id = ep.id_padre
       WHERE ep.id_estudiante = $1 AND p.id_usuario = $2`,
      [idEstudiante, idUsuario],
    );
    if (!vinculado.rowCount) return res.status(403).json({ error: 'Ese estudiante no está vinculado a tu cuenta' });
  }

  const resultado = await pool.query(
    `SELECT c.id, m.nombre AS materia, c.parcial, c.calificacion,
            CASE WHEN c.calificacion >= 6 THEN 'aprobado' ELSE 'reprobado' END AS estado
     FROM calificaciones c
     JOIN materias m ON m.id = c.id_materia
     WHERE c.id_estudiante = $1
     ORDER BY c.parcial, m.nombre`,
    [idEstudiante],
  );
  res.json(resultado.rows);
});