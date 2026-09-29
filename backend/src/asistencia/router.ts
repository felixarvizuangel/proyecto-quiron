import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../db';
import { requiereAutenticacion, requiereRol } from '../auth/middleware';

export const asistenciaRouter = Router();

// Devuelve la asignación (grupo y materia) solo si pertenece al maestro que hace
// la petición. Es la regla "un maestro solo toca lo que le corresponde".
async function asignacionDelMaestro(idAsignacion: number, idUsuario: number) {
  const resultado = await pool.query(
    `SELECT mmg.id_grupo, mmg.id_materia, m.nombre AS materia, g.nombre AS grupo
     FROM materia_maestro_grupo mmg
     JOIN maestros ma ON ma.id = mmg.id_maestro
     JOIN materias m ON m.id = mmg.id_materia
     JOIN grupos g ON g.id = mmg.id_grupo
     WHERE mmg.id = $1 AND ma.id_usuario = $2`,
    [idAsignacion, idUsuario],
  );
  return resultado.rows[0] as
    | { id_grupo: number; id_materia: number; materia: string; grupo: string }
    | undefined;
}

// Fecha de hoy en la zona horaria del servidor, en formato AAAA-MM-DD.
function hoy() {
  return new Date().toLocaleDateString('en-CA');
}

// Para un solo registro: ¿el maestro da esta materia al grupo de este estudiante?
async function maestroPuedeOperar(idUsuarioMaestro: number, idEstudiante: number, idMateria: number) {
  const resultado = await pool.query(
    `SELECT 1
     FROM materia_maestro_grupo mmg
     JOIN maestros ma ON ma.id = mmg.id_maestro
     JOIN estudiantes e ON e.id_grupo = mmg.id_grupo
     WHERE ma.id_usuario = $1 AND mmg.id_materia = $2 AND e.id = $3`,
    [idUsuarioMaestro, idMateria, idEstudiante],
  );
  return (resultado.rowCount ?? 0) > 0;
}

// ---------- Pasar lista a todo un grupo (lo usa el panel) ----------

// Lista del grupo para una fecha: cada estudiante activo, con su estado si ya se pasó lista.
asistenciaRouter.get('/asignacion/:id', requiereAutenticacion, requiereRol('maestro'), async (req, res) => {
  const idAsignacion = Number(req.params.id);
  const fecha = String(req.query.fecha ?? '');
  if (!Number.isInteger(idAsignacion) || idAsignacion <= 0) {
    return res.status(400).json({ error: 'Asignación inválida' });
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
    return res.status(400).json({ error: 'Fecha inválida, usa el formato AAAA-MM-DD' });
  }

  const asignacion = await asignacionDelMaestro(idAsignacion, req.usuario!.idUsuario);
  if (!asignacion) {
    return res.status(403).json({ error: 'Esa asignación no te pertenece' });
  }

  const resultado = await pool.query(
    `SELECT e.id, e.nombre, e.matricula, a.estado, a.justificacion
     FROM estudiantes e
     JOIN usuarios u ON u.id = e.id_usuario AND u.activo
     LEFT JOIN asistencia a
       ON a.id_estudiante = e.id AND a.id_materia = $2 AND a.fecha = $3
     WHERE e.id_grupo = $1
     ORDER BY e.nombre`,
    [asignacion.id_grupo, asignacion.id_materia, fecha],
  );

  res.json({ materia: asignacion.materia, grupo: asignacion.grupo, fecha, estudiantes: resultado.rows });
});

const esquemaLista = z.object({
  idAsignacion: z.number().int().positive(),
  fecha: z.string().date('Fecha inválida'),
  registros: z
    .array(
      z.object({
        idEstudiante: z.number().int().positive(),
        estado: z.enum(['presente', 'ausente', 'retardo']),
        justificacion: z.string().trim().max(500).optional(),
      }),
    )
    .min(1, 'La lista está vacía'),
});

// Guarda la lista completa en una sola transacción: o se guardan todos, o ninguno.
asistenciaRouter.post('/lista', requiereAutenticacion, requiereRol('maestro'), async (req, res) => {
  const datos = esquemaLista.safeParse(req.body);
  if (!datos.success) {
    return res.status(400).json({ error: datos.error.issues[0].message });
  }
  const { idAsignacion, fecha, registros } = datos.data;

  if (fecha > hoy()) {
    return res.status(400).json({ error: 'No se puede pasar lista de una fecha futura' });
  }

  const asignacion = await asignacionDelMaestro(idAsignacion, req.usuario!.idUsuario);
  if (!asignacion) {
    return res.status(403).json({ error: 'Esa asignación no te pertenece' });
  }

  // Todos los estudiantes de la lista deben pertenecer al grupo de esa asignación.
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
        `INSERT INTO asistencia (id_estudiante, id_materia, fecha, estado, justificacion)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (id_estudiante, id_materia, fecha)
         DO UPDATE SET estado = EXCLUDED.estado,
                       justificacion = EXCLUDED.justificacion,
                       registrado_en = now()`,
        [r.idEstudiante, asignacion.id_materia, fecha, r.estado, r.justificacion || null],
      );
    }
    await cliente.query('COMMIT');
    res.status(201).json({ guardados: registros.length });
  } catch (error) {
    await cliente.query('ROLLBACK');
    console.error(error);
    res.status(500).json({ error: 'No se pudo guardar la lista' });
  } finally {
    cliente.release();
  }
});

// ---------- Registro individual (se conserva para la API) ----------

const esquemaRegistro = z.object({
  idEstudiante: z.number().int().positive(),
  idMateria: z.number().int().positive(),
  fecha: z.string().date(),
  estado: z.enum(['presente', 'ausente', 'retardo']),
  justificacion: z.string().optional(),
});

asistenciaRouter.post('/', requiereAutenticacion, requiereRol('maestro'), async (req, res) => {
  const datos = esquemaRegistro.safeParse(req.body);
  if (!datos.success) {
    return res.status(400).json({ error: datos.error.issues[0].message });
  }
  const { idEstudiante, idMateria, fecha, estado, justificacion } = datos.data;

  const autorizado = await maestroPuedeOperar(req.usuario!.idUsuario, idEstudiante, idMateria);
  if (!autorizado) {
    return res.status(403).json({ error: 'No impartes esta materia a este estudiante' });
  }

  try {
    const resultado = await pool.query(
      `INSERT INTO asistencia (id_estudiante, id_materia, fecha, estado, justificacion)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (id_estudiante, id_materia, fecha)
       DO UPDATE SET estado = EXCLUDED.estado,
                     justificacion = EXCLUDED.justificacion,
                     registrado_en = now()
       RETURNING id, id_estudiante, id_materia, fecha, estado, justificacion`,
      [idEstudiante, idMateria, fecha, estado, justificacion ?? null],
    );
    res.status(201).json(resultado.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'No se pudo registrar la asistencia' });
  }
});

// ---------- Consulta por estudiante (estudiante propio, su familia, Director o maestro) ----------

asistenciaRouter.get('/estudiante/:id', requiereAutenticacion, async (req, res) => {
  const idEstudiante = Number(req.params.id);
  const { rol, idUsuario } = req.usuario!;

  // Un estudiante solo puede pedir la suya. Una familia, solo la de sus hijos vinculados.
  if (rol === 'estudiante') {
    const propio = await pool.query('SELECT 1 FROM estudiantes WHERE id = $1 AND id_usuario = $2', [
      idEstudiante,
      idUsuario,
    ]);
    if (!propio.rowCount) {
      return res.status(403).json({ error: 'No puedes ver la asistencia de otro estudiante' });
    }
  } else if (rol === 'padre') {
    const vinculado = await pool.query(
      `SELECT 1 FROM estudiante_padre ep
       JOIN padres p ON p.id = ep.id_padre
       WHERE ep.id_estudiante = $1 AND p.id_usuario = $2`,
      [idEstudiante, idUsuario],
    );
    if (!vinculado.rowCount) {
      return res.status(403).json({ error: 'Ese estudiante no está vinculado a tu cuenta' });
    }
  }

  const resultado = await pool.query(
    `SELECT a.id, m.nombre AS materia, a.fecha, a.estado, a.justificacion
     FROM asistencia a
     JOIN materias m ON m.id = a.id_materia
     WHERE a.id_estudiante = $1
     ORDER BY a.fecha DESC`,
    [idEstudiante],
  );
  res.json(resultado.rows);
});