import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../db';
import { requiereAutenticacion, requiereRol } from '../auth/middleware';
import { asignacionDelMaestro, puedeVerEstudiante } from '../auth/permisos';

export const avisosRouter = Router();

// Los límites coinciden con las columnas de la tabla (VARCHAR 150 y 200),
// así el error llega claro desde la API y no como un fallo de la base de datos.
const esquemaAviso = z.object({
  titulo: z.string().trim().min(1, 'Falta el título').max(150, 'El título puede tener hasta 150 caracteres'),
  subtitulo: z.string().trim().max(200, 'El subtítulo puede tener hasta 200 caracteres').optional(),
  cuerpo: z.string().trim().min(1, 'Falta el mensaje del aviso'),
  fechaEvento: z.string().datetime('Fecha del evento inválida').optional(),
});

// ---------- Para el panel ----------

// Avisos que ve cada rol en el panel:
// - Director: todos (generales y de grupo).
// - Maestro: los generales y los que él publicó.
avisosRouter.get('/', requiereAutenticacion, requiereRol('director', 'maestro'), async (req, res) => {
  const { rol, idUsuario } = req.usuario!;
  const resultado = await pool.query(
    `SELECT a.id, a.titulo, a.subtitulo, a.cuerpo, a.fecha_publicacion, a.fecha_evento,
            a.id_materia_maestro_grupo IS NULL AS general,
            m.nombre || ' · ' || g.nombre AS destino,
            COALESCE(ma.nombre, 'Dirección') AS autor,
            a.id_autor = $2 AS propio
     FROM avisos a
     LEFT JOIN materia_maestro_grupo mmg ON mmg.id = a.id_materia_maestro_grupo
     LEFT JOIN materias m ON m.id = mmg.id_materia
     LEFT JOIN grupos g ON g.id = mmg.id_grupo
     LEFT JOIN maestros ma ON ma.id_usuario = a.id_autor
     WHERE $1 OR a.id_materia_maestro_grupo IS NULL OR a.id_autor = $2
     ORDER BY a.fecha_publicacion DESC
     LIMIT 100`,
    [rol === 'director', idUsuario],
  );
  res.json(resultado.rows);
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
    [req.usuario!.idUsuario, titulo, subtitulo || null, cuerpo, fechaEvento ?? null],
  );
  res.status(201).json(resultado.rows[0]);
});

const esquemaAvisoDeGrupo = esquemaAviso.extend({
  idAsignacion: z.number().int().positive('Elige a qué grupo y materia va el aviso'),
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
    [req.usuario!.idUsuario, idAsignacion, titulo, subtitulo || null, cuerpo, fechaEvento ?? null],
  );
  res.status(201).json(resultado.rows[0]);
});

// Borrar un aviso publicado por error. El Director puede borrar cualquiera y un
// maestro solo los suyos. El permiso va dentro del mismo DELETE, así que la
// revisión y el borrado ocurren en una sola operación.
avisosRouter.delete('/:id', requiereAutenticacion, requiereRol('director', 'maestro'), async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: 'Aviso inválido' });
  }
  const { rol, idUsuario } = req.usuario!;

  const resultado = await pool.query('DELETE FROM avisos WHERE id = $1 AND ($2 OR id_autor = $3)', [
    id,
    rol === 'director',
    idUsuario,
  ]);
  if (!resultado.rowCount) {
    return res.status(404).json({ error: 'Ese aviso no existe o no puedes borrarlo' });
  }
  res.status(204).end();
});

// ---------- Para la app de familias y estudiantes ----------

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