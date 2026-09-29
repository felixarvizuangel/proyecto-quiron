import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../db';
import { config } from '../config';
import { requiereAutenticacion, requiereRol } from '../auth/middleware';
import { limiteVinculacion } from '../auth/limites';

export const familiaRouter = Router();

// Todo este módulo es solo para familias (rol padre).
familiaRouter.use(requiereAutenticacion, requiereRol('padre'));

// ---------- Vincularse con un hijo ----------

// El código se acepta con espacios o en minúsculas: se limpia antes de revisarlo.
const esquemaVinculo = z.object({
  codigo: z.string().trim().toUpperCase().length(8, 'El código familiar tiene 8 caracteres'),
  relacion: z.enum(['padre', 'madre', 'tutor'], 'Indica si eres padre, madre o tutor'),
});

familiaRouter.post('/vincular', limiteVinculacion, async (req, res) => {
  const datos = esquemaVinculo.safeParse(req.body);
  if (!datos.success) {
    return res.status(400).json({ error: datos.error.issues[0].message });
  }
  const { codigo, relacion } = datos.data;

  const padre = await pool.query('SELECT id FROM padres WHERE id_usuario = $1', [req.usuario!.idUsuario]);
  if (!padre.rowCount) {
    return res.status(403).json({ error: 'Tu cuenta no tiene perfil de familia' });
  }

  // Solo estudiantes activos. El mensaje es el mismo si el código no existe o si el
  // estudiante está dado de baja, para no darle pistas a quien intenta adivinar.
  const estudiante = await pool.query(
    `SELECT e.id, e.nombre, g.nombre AS grupo
     FROM estudiantes e
     JOIN usuarios u ON u.id = e.id_usuario AND u.activo
     JOIN grupos g ON g.id = e.id_grupo
     WHERE e.codigo_parental = $1`,
    [codigo],
  );
  if (!estudiante.rowCount) {
    return res.status(404).json({ error: 'Ese código no es válido. Revísalo con la escuela.' });
  }

  try {
    await pool.query('INSERT INTO estudiante_padre (id_estudiante, id_padre, relacion) VALUES ($1, $2, $3)', [
      estudiante.rows[0].id,
      padre.rows[0].id,
      relacion,
    ]);
  } catch (error: any) {
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Ya estás vinculado con este estudiante' });
    }
    throw error;
  }

  res.status(201).json({ ...estudiante.rows[0], relacion });
});

// ---------- Mis hijos ----------

// Estudiantes activos vinculados a la cuenta. En la app es el menú "Hijo 1, Hijo 2".
familiaRouter.get('/hijos', async (req, res) => {
  const resultado = await pool.query(
    `SELECT e.id, e.nombre, g.nombre AS grupo, ep.relacion
     FROM estudiante_padre ep
     JOIN padres p ON p.id = ep.id_padre
     JOIN estudiantes e ON e.id = ep.id_estudiante
     JOIN usuarios u ON u.id = e.id_usuario AND u.activo
     JOIN grupos g ON g.id = e.id_grupo
     WHERE p.id_usuario = $1
     ORDER BY e.nombre`,
    [req.usuario!.idUsuario],
  );
  res.json(resultado.rows);
});

// ---------- Resumen de un hijo ----------

familiaRouter.get('/hijos/:id/resumen', async (req, res) => {
  const idEstudiante = Number(req.params.id);
  if (!Number.isInteger(idEstudiante) || idEstudiante <= 0) {
    return res.status(400).json({ error: 'Estudiante inválido' });
  }

  const hijo = await pool.query(
    `SELECT e.id, e.nombre, g.nombre AS grupo
     FROM estudiante_padre ep
     JOIN padres p ON p.id = ep.id_padre
     JOIN estudiantes e ON e.id = ep.id_estudiante
     JOIN grupos g ON g.id = e.id_grupo
     WHERE ep.id_estudiante = $1 AND p.id_usuario = $2`,
    [idEstudiante, req.usuario!.idUsuario],
  );
  if (!hijo.rowCount) {
    return res.status(403).json({ error: 'Ese estudiante no está vinculado a tu cuenta' });
  }

  // Las dos consultas son independientes, así que se hacen al mismo tiempo.
  const [asistencia, materias] = await Promise.all([
    pool.query(
      `SELECT COUNT(*) FILTER (WHERE estado = 'presente') AS presentes,
              COUNT(*) FILTER (WHERE estado = 'retardo')  AS retardos,
              COUNT(*) FILTER (WHERE estado = 'ausente')  AS ausencias
       FROM asistencia
       WHERE id_estudiante = $1 AND fecha >= CURRENT_DATE - 30`,
      [idEstudiante],
    ),
    pool.query(
      `SELECT m.nombre AS materia, ROUND(AVG(c.calificacion), 1) AS promedio, COUNT(*) AS parciales
       FROM calificaciones c
       JOIN materias m ON m.id = c.id_materia
       WHERE c.id_estudiante = $1
       GROUP BY m.nombre
       ORDER BY promedio DESC, m.nombre`,
      [idEstudiante],
    ),
  ]);

  const minima = config.calificacionMinima;
  const filas = materias.rows as { materia: string; promedio: number; parciales: number }[];

  // Acompañamiento sin comparaciones: el estudiante solo se compara consigo mismo.
  // - Destaca en: hasta dos materias en la mitad alta del rango aprobatorio
  //   (con mínima 6, un promedio de 8 o más).
  // - Puede reforzar: las materias con promedio por debajo de la mínima.
  // En la Fase 2, estas sugerencias las validará un orientador.
  const umbralDestaca = minima + (10 - minima) / 2;
  const destaca = filas
    .filter((f) => f.promedio >= umbralDestaca)
    .slice(0, 2)
    .map((f) => f.materia);
  const reforzar = filas.filter((f) => f.promedio < minima).map((f) => f.materia);

  res.json({
    estudiante: hijo.rows[0],
    minima,
    asistencia30Dias: asistencia.rows[0],
    materias: filas,
    destaca,
    reforzar,
  });
});