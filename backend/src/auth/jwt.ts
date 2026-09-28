import jwt from 'jsonwebtoken';
import { config } from '../config';

export type Rol = 'director' | 'maestro' | 'estudiante' | 'padre' | 'psicologo';

export interface PayloadToken {
  idUsuario: number;
  rol: Rol;
}

// Firma un token que dura 8 horas. Adentro solo va el id y el rol,
// nunca la contraseña ni datos sensibles.
export function generarToken(payload: PayloadToken): string {
  return jwt.sign(payload, config.jwtSecret, { expiresIn: '8h' });
}

export function verificarToken(token: string): PayloadToken {
  return jwt.verify(token, config.jwtSecret) as PayloadToken;
}