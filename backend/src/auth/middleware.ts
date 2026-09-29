import type { Request, Response, NextFunction } from 'express';
import { pool } from '../db';
import { verificarToken, type PayloadToken, type Rol } from './jwt';

// Le añade el usuario autenticado al objeto Request, para que las rutas lo lean.
declare global {
  namespace Express {
    interface Request {
      usuario?: PayloadToken;
    }
  }
}

// Exige un token válido en el header "Authorization: Bearer <token>" y que la cuenta
// siga activa. Revisar "activo" en cada petición hace que una baja surta efecto
// de inmediato, aunque el token todavía no haya vencido.
export async function requiereAutenticacion(req: Request, res: Response, next: NextFunction) {
  const encabezado = req.headers.authorization;
  if (!encabezado?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Falta el token de acceso' });
    return;
  }

  let usuario: PayloadToken;
  try {
    usuario = verificarToken(encabezado.slice(7));
  } catch {
    res.status(401).json({ error: 'Token inválido o vencido' });
    return;
  }

  const resultado = await pool.query('SELECT activo FROM usuarios WHERE id = $1', [usuario.idUsuario]);
  if (!resultado.rows[0]?.activo) {
    res.status(401).json({ error: 'Esta cuenta está dada de baja' });
    return;
  }

  req.usuario = usuario;
  next();
}

// Exige, además, que el rol del usuario esté en la lista permitida.
// Uso: requiereRol('director', 'maestro')
export function requiereRol(...rolesPermitidos: Rol[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.usuario || !rolesPermitidos.includes(req.usuario.rol)) {
      res.status(403).json({ error: 'No tienes permiso para esto' });
      return;
    }
    next();
  };
}