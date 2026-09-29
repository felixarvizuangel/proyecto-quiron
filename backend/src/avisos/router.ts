import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../db';
import { requiereAutenticacion, requiereRol } from '../auth/middleware';
import { asignacionDelMaestro, puedeVerEstudiante } from '../auth/permisos';

export const avisosRouter = Router();

const esquemaAviso = z.object({
  titulo: z.string().min(1),
  subtitulo: z.string().optional(),
  cuerpo: z.string().min(1),
  fechaEvento: z.string().datetime().optional(),
});

// El Director publica avisos generales: llegan a toda la escuela,
// por eso id_materia_maestro_grupo se deja vacío (NULL).
avisosRouter.post('/general', requiereAutenticacion, requiereRol('director'), async (req, res) => {
  const datos = esquemaAviso.safeParse(req.body);
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

const esquemaAvisoDeGrupo = esquemaAviso.extend({
  idAsignacion: z.number().int().positive(), // el id de materia_maestro_grupo, de /asignaciones/mias
});

// El maestro publica un aviso solo para una asignación que de verdad le pertenece.
avisosRouter.post('/grupo', requiereAutenticacion, requiereRol('maestro'), async (req, res) => {
  const datos = esquemaAvisoDeGrupo.safeParse(req.body);
  if (!datos.success) {
    return res.status(400).json({ error: datos.error.issues[0].message });
  }
  const { idAsignacion, titulo, subtitulo, cuerpo, fechaEvento } = datos.data;

  const asignacion = await asignacionDelMaestro(idAsignacion, req.usuario!.idUsuario);
  if (!asignacion) {
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
  if (!Number.isInteger(idEstudiante) || idEstudiante <= 0) {
    return res.status(400).json({ error: 'Estudiante inválido' });
  }
  if (!(await puedeVerEstudiante(req.usuario!, idEstudiante))) {
    return res.status(403).json({ error: 'No tienes acceso a la información de este estudiante' });
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