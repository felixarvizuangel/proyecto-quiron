import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../db';
import { requiereAutenticacion, requiereRol } from '../auth/middleware';

export const avisosRouter = Router();

const esquemaAvisoDirector = z.object({
  titulo: z.string().min(1),
  subtitulo: z.string().optional(),
  cuerpo: z.string().min(1),
  fechaEvento: z.string().datetime().optional(),
});

// El Director publica avisos generales: llegan a toda la escuela,
// por eso id_materia_maestro_grupo se deja vacío (NULL).
avisosRouter.post('/general', requiereAutenticacion, requiereRol('director'), async (req, res) => {
  const datos = esquemaAvisoDirector.safeParse(req.body);
  if (!datos.success) {
    return res.status(400).json({ error: datos.error.issues[0].message });
  }
  const { titulo, subtitulo, cuerpo, fechaEvento } = datos.data;

  const resultado = await pool.query(
    `INSERT INTO avisos (id_autor, id_materia_maestro_grupo, titulo, subtitulo, cuerpo, fecha_evento)
     VALUES ($1, NULL, $2, $3, $4, $5)
     RETURNING id, titulo, subtitulo, cuerpo, fecha_publicacion, fecha_evento`,
    [req.usuario!.idUsuario, titulo, subtitulo ?? null, cuerpo, fechaEvento ?? null],
  );
  res.status(201).json(resultado.rows[0]);
});

const esquemaAvisoMaestro = esquemaAvisoDirector.extend({
  idAsignacion: z.number().int().positive(), // el id de materia_maestro_grupo, de /asignaciones/mias
});

// El maestro publica un aviso solo para su propio grupo y materia.
// Se verifica que esa asignación de verdad le pertenezca, igual que en asistencia.
avisosRouter.post('/grupo', requiereAutenticacion, requiereRol('maestro'), async (req, res) => {
  const datos = esquemaAvisoMaestro.safeParse(req.body);
  if (!datos.success) {
    return res.status(400).json({ error: datos.error.issues[0].message });
  }
  const { idAsignacion, titulo, subtitulo, cuerpo, fechaEvento } = datos.data;

  const propia = await pool.query(
    `SELECT 1 FROM materia_maestro_grupo mmg
     JOIN maestros ma ON ma.id = mmg.id_maestro
     WHERE mmg.id = $1 AND ma.id_usuario = $2`,
    [idAsignacion, req.usuario!.idUsuario],
  );
  if (!propia.rowCount) {
    return res.status(403).json({ error: 'Esa asignación no te pertenece' });
  }

  const resultado = await pool.query(
    `INSERT INTO avisos (id_autor, id_materia_maestro_grupo, titulo, subtitulo, cuerpo, fecha_evento)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, titulo, subtitulo, cuerpo, fecha_publicacion, fecha_evento`,
    [req.usuario!.idUsuario, idAsignacion, titulo, subtitulo ?? null, cuerpo, fechaEvento ?? null],
  );
  res.status(201).json(resultado.rows[0]);
});

// Avisos que le tocan a un estudiante: los generales del Director,
// más los de las materias que cursa (por su grupo).
avisosRouter.get('/estudiante/:id', requiereAutenticacion, async (req, res) => {
  const idEstudiante = Number(req.params.id);
  const { rol, idUsuario } = req.usuario!;

  if (rol === 'estudiante') {
    const propio = await pool.query('SELECT 1 FROM estudiantes WHERE id = $1 AND id_usuario = $2', [idEstudiante, idUsuario]);
    if (!propio.rowCount) return res.status(403).json({ error: 'No puedes ver los avisos de otro estudiante' });
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
    `SELECT a.id, a.titulo, a.subtitulo, a.cuerpo, a.fecha_publicacion, a.fecha_evento,
            CASE WHEN a.id_materia_maestro_grupo IS NULL THEN 'general' ELSE m.nombre END AS origen
     FROM avisos a
     LEFT JOIN materia_maestro_grupo mmg ON mmg.id = a.id_materia_maestro_grupo
     LEFT JOIN materias m ON m.id = mmg.id_materia
     LEFT JOIN estudiantes e ON e.id_grupo = mmg.id_grupo
     WHERE a.id_materia_maestro_grupo IS NULL
        OR e.id = $1
     ORDER BY a.fecha_publicacion DESC`,
    [idEstudiante],
  );
  res.json(resultado.rows);
});