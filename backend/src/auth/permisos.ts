import { pool } from '../db';
import type { PayloadToken } from './jwt';

// Reglas de acceso compartidas por varias rutas. Viven en un solo lugar para que
// asistencia, calificaciones y avisos no repitan (ni contradigan) la misma lógica.

export interface Asignacion {
  id_grupo: number;
  id_materia: number;
  id_maestro: number;
  materia: string;
  grupo: string;
}

// Devuelve la asignación solo si pertenece al maestro que hace la petición.
export async function asignacionDelMaestro(idAsignacion: number, idUsuario: number) {
  const resultado = await pool.query(
    `SELECT mmg.id_grupo, mmg.id_materia, mmg.id_maestro, m.nombre AS materia, g.nombre AS grupo
     FROM materia_maestro_grupo mmg
     JOIN maestros ma ON ma.id = mmg.id_maestro
     JOIN materias m ON m.id = mmg.id_materia
     JOIN grupos g ON g.id = mmg.id_grupo
     WHERE mmg.id = $1 AND ma.id_usuario = $2`,
    [idAsignacion, idUsuario],
  );
  return resultado.rows[0] as Asignacion | undefined;
}

// Para registros individuales: devuelve el id del maestro si da esa materia
// al grupo del estudiante.
export async function maestroDeLaMateria(idUsuario: number, idEstudiante: number, idMateria: number) {
  const resultado = await pool.query(
    `SELECT ma.id AS id_maestro
     FROM materia_maestro_grupo mmg
     JOIN maestros ma ON ma.id = mmg.id_maestro
     JOIN estudiantes e ON e.id_grupo = mmg.id_grupo
     WHERE ma.id_usuario = $1 AND mmg.id_materia = $2 AND e.id = $3`,
    [idUsuario, idMateria, idEstudiante],
  );
  return resultado.rows[0]?.id_maestro as number | undefined;
}

// ¿Esta persona puede consultar la información de este estudiante?
// - Director: cualquier estudiante.
// - Maestro: solo estudiantes de grupos donde imparte alguna materia.
// - Estudiante: solo a sí mismo.
// - Familia: solo a sus hijos vinculados.
// Cualquier otro rol (por ejemplo, psicólogo) no ve nada hasta que se defina su regla.
export async function puedeVerEstudiante(usuario: PayloadToken, idEstudiante: number) {
  if (usuario.rol === 'director') return true;

  const consultas: Partial<Record<PayloadToken['rol'], string>> = {
    maestro: `SELECT 1 FROM estudiantes e
              JOIN materia_maestro_grupo mmg ON mmg.id_grupo = e.id_grupo
              JOIN maestros ma ON ma.id = mmg.id_maestro
              WHERE e.id = $1 AND ma.id_usuario = $2`,
    estudiante: `SELECT 1 FROM estudiantes WHERE id = $1 AND id_usuario = $2`,
    padre: `SELECT 1 FROM estudiante_padre ep
            JOIN padres p ON p.id = ep.id_padre
            WHERE ep.id_estudiante = $1 AND p.id_usuario = $2`,
  };

  const consulta = consultas[usuario.rol];
  if (!consulta) return false;

  const resultado = await pool.query(consulta, [idEstudiante, usuario.idUsuario]);
  return (resultado.rowCount ?? 0) > 0;
}