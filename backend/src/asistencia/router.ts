import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../db';
import { requiereAutenticacion, requiereRol } from '../auth/middleware';

export const asistenciaRouter = Router();

const esquemaRegistro = z.object({
  idEstudiante: z.number().int().positive(),
  idMateria: z.number().int().positive(),
  fecha: z.string().date(), // formato 'YYYY-MM-DD'
  estado: z.enum(['presente', 'ausente', 'retardo']),
  justificacion: z.string().optional(),
});

// Comprueba que el maestro autenticado de verdad tenga asignada esa materia,
// en el grupo al que pertenece el estudiante. Esta es la regla de negocio
// que decidiste: "un maestro solo puede tocar lo que le corresponde",
// convertida en una consulta SQL que nadie puede saltarse desde el cliente.
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
       DO UPDATE SET estado = EXCLUDED.estado, justificacion = EXCLUDED.justificacion
       RETURNING id, id_estudiante, id_materia, fecha, estado, justificacion`,
      [idEstudiante, idMateria, fecha, estado, justificacion ?? null],
    );
    res.status(201).json(resultado.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'No se pudo registrar la asistencia' });
  }
});

// Lo que ve un estudiante o un padre: solo la asistencia de SU propio estudiante.
asistenciaRouter.get('/estudiante/:id', requiereAutenticacion, async (req, res) => {
  const idEstudiante = Number(req.params.id);
  const { rol, idUsuario } = req.usuario!;

  // Un estudiante solo puede pedir la suya. Un padre, solo la de sus hijos vinculados.
  // Director y maestro pueden consultar cualquiera (lo necesitan para su trabajo).
  if (rol === 'estudiante') {
    const propio = await pool.query('SELECT 1 FROM estudiantes WHERE id = $1 AND id_usuario = $2', [idEstudiante, idUsuario]);
    if (!propio.rowCount) return res.status(403).json({ error: 'No puedes ver la asistencia de otro estudiante' });
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
    `SELECT a.id, m.nombre AS materia, a.fecha, a.estado, a.justificacion
     FROM asistencia a
     JOIN materias m ON m.id = a.id_materia
     WHERE a.id_estudiante = $1
     ORDER BY a.fecha DESC`,
    [idEstudiante],
  );
  res.json(resultado.rows);
});