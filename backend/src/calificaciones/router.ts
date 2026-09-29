import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../db';
import { config } from '../config';
import { requiereAutenticacion, requiereRol } from '../auth/middleware';
import { asignacionDelMaestro, maestroDeLaMateria, puedeVerEstudiante } from '../auth/permisos';

export const calificacionesRouter = Router();

// ---------- Captura por grupo (lo usa el panel) ----------

// Lista del grupo para un parcial: cada estudiante activo, con su calificación si ya se capturó.
calificacionesRouter.get('/asignacion/:id', requiereAutenticacion, requiereRol('maestro'), async (req, res) => {
  const idAsignacion = Number(req.params.id);
  const parcial = Number(req.query.parcial);
  if (!Number.isInteger(idAsignacion) || idAsignacion <= 0) {
    return res.status(400).json({ error: 'Asignación inválida' });
  }
  if (!Number.isInteger(parcial) || parcial <= 0) {
    return res.status(400).json({ error: 'Parcial inválido' });
  }

  const asignacion = await asignacionDelMaestro(idAsignacion, req.usuario!.idUsuario);
  if (!asignacion) {
    return res.status(403).json({ error: 'Esa asignación no te pertenece' });
  }

  const resultado = await pool.query(
    `SELECT e.id, e.nombre, e.matricula, c.calificacion
     FROM estudiantes e
     JOIN usuarios u ON u.id = e.id_usuario AND u.activo
     LEFT JOIN calificaciones c
       ON c.id_estudiante = e.id AND c.id_materia = $2 AND c.parcial = $3
     WHERE e.id_grupo = $1
     ORDER BY e.nombre`,
    [asignacion.id_grupo, asignacion.id_materia, parcial],
  );

  res.json({
    materia: asignacion.materia,
    grupo: asignacion.grupo,
    parcial,
    minima: config.calificacionMinima,
    estudiantes: resultado.rows,
  });
});

const esquemaLista = z.object({
  idAsignacion: z.number().int().positive(),
  parcial: z.number().int().positive(),
  registros: z
    .array(
      z.object({
        idEstudiante: z.number().int().positive(),
        calificacion: z
          .number()
          .min(0, 'Las calificaciones van de 0 a 10')
          .max(10, 'Las calificaciones van de 0 a 10'),
      }),
    )
    .min(1, 'No hay calificaciones para guardar'),
});

// Guarda las calificaciones del grupo en una sola transacción: o se guardan todas, o ninguna.
calificacionesRouter.post('/lista', requiereAutenticacion, requiereRol('maestro'), async (req, res) => {
  const datos = esquemaLista.safeParse(req.body);
  if (!datos.success) {
    return res.status(400).json({ error: datos.error.issues[0].message });
  }
  const { idAsignacion, parcial, registros } = datos.data;

  const asignacion = await asignacionDelMaestro(idAsignacion, req.usuario!.idUsuario);
  if (!asignacion) {
    return res.status(403).json({ error: 'Esa asignación no te pertenece' });
  }

  // Todos los estudiantes enviados deben pertenecer al grupo de esa asignación.
  const ids = [...new Set(registros.map((r) => r.idEstudiante))];
  const delGrupo = await pool.query(
    'SELECT id FROM estudiantes WHERE id = ANY($1::bigint[]) AND id_grupo = $2',
    [ids, asignacion.id_grupo],
  );
  if (delGrupo.rowCount !== ids.length) {
    return res.status(403).json({ error: 'La lista incluye estudiantes que no son de este grupo' });
  }

  const cliente = await pool.connect();
  try {
    await cliente.query('BEGIN');
    for (const r of registros) {
      await cliente.query(
        `INSERT INTO calificaciones (id_estudiante, id_materia, id_maestro, calificacion, parcial)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (id_estudiante, id_materia, parcial)
         DO UPDATE SET calificacion = EXCLUDED.calificacion,
                       id_maestro = EXCLUDED.id_maestro,
                       capturado_en = now()`,
        [r.idEstudiante, asignacion.id_materia, asignacion.id_maestro, r.calificacion, parcial],
      );
    }
    await cliente.query('COMMIT');
    res.status(201).json({ guardadas: registros.length });
  } catch (error) {
    await cliente.query('ROLLBACK');
    console.error(error);
    res.status(500).json({ error: 'No se pudieron guardar las calificaciones' });
  } finally {
    cliente.release();
  }
});

// ---------- Registro individual (se conserva para la API) ----------

const esquemaRegistro = z.object({
  idEstudiante: z.number().int().positive(),
  idMateria: z.number().int().positive(),
  calificacion: z.number().min(0).max(10),
  parcial: z.number().int().positive(),
});

calificacionesRouter.post('/', requiereAutenticacion, requiereRol('maestro'), async (req, res) => {
  const datos = esquemaRegistro.safeParse(req.body);
  if (!datos.success) {
    return res.status(400).json({ error: datos.error.issues[0].message });
  }
  const { idEstudiante, idMateria, calificacion, parcial } = datos.data;

  const idMaestro = await maestroDeLaMateria(req.usuario!.idUsuario, idEstudiante, idMateria);
  if (!idMaestro) {
    return res.status(403).json({ error: 'No impartes esta materia a este estudiante' });
  }

  try {
    const resultado = await pool.query(
      `INSERT INTO calificaciones (id_estudiante, id_materia, id_maestro, calificacion, parcial)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (id_estudiante, id_materia, parcial)
       DO UPDATE SET calificacion = EXCLUDED.calificacion,
                     id_maestro = EXCLUDED.id_maestro,
                     capturado_en = now()
       RETURNING id, id_estudiante, id_materia, calificacion, parcial`,
      [idEstudiante, idMateria, idMaestro, calificacion, parcial],
    );
    res.status(201).json(resultado.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'No se pudo registrar la calificación' });
  }
});

// ---------- Consulta por estudiante ----------

// El aprobado/reprobado se calcula al leer con la mínima del .env; nunca se guarda.
calificacionesRouter.get('/estudiante/:id', requiereAutenticacion, async (req, res) => {
  const idEstudiante = Number(req.params.id);
  if (!Number.isInteger(idEstudiante) || idEstudiante <= 0) {
    return res.status(400).json({ error: 'Estudiante inválido' });
  }
  if (!(await puedeVerEstudiante(req.usuario!, idEstudiante))) {
    return res.status(403).json({ error: 'No tienes acceso a la información de este estudiante' });
  }

  const resultado = await pool.query(
    `SELECT c.id, m.nombre AS materia, c.parcial, c.calificacion,
            CASE WHEN c.calificacion >= $2 THEN 'aprobado' ELSE 'reprobado' END AS estado
     FROM calificaciones c
     JOIN materias m ON m.id = c.id_materia
     WHERE c.id_estudiante = $1
     ORDER BY c.parcial, m.nombre`,
    [idEstudiante, config.calificacionMinima],
  );
  res.json(resultado.rows);
});