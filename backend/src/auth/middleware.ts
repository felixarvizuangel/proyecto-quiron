import type { Request, Response, NextFunction } from 'express';
import { verificarToken, type PayloadToken, type Rol } from './jwt';

// Le añade el usuario autenticado al objeto Request, para que las rutas lo lean.
declare global {
  namespace Express {
    interface Request {
      usuario?: PayloadToken;
    }
  }
}

// Exige un token válido en el header "Authorization: Bearer <token>".
export function requiereAutenticacion(req: Request, res: Response, next: NextFunction) {
  const encabezado = req.headers.authorization;
  if (!encabezado?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Falta el token de acceso' });
  }
  try {
    req.usuario = verificarToken(encabezado.slice(7));
    next();
  } catch {
    res.status(401).json({ error: 'Token inválido o vencido' });
  }
}

// Exige, además, que el rol del usuario esté en la lista permitida.
// Uso: requiereRol('director', 'maestro')
export function requiereRol(...rolesPermitidos: Rol[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.usuario || !rolesPermitidos.includes(req.usuario.rol)) {
      return res.status(403).json({ error: 'No tienes permiso para esto' });
    }
    next();
  };
}