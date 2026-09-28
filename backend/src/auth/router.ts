import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../db';
import { cifrarPassword, verificarPassword } from './password';
import { generarToken } from './jwt';

export const authRouter = Router();

const esquemaRegistro = z.object({
  correo: z.string().email(),
  password: z.string().min(8, 'La contraseña necesita al menos 8 caracteres'),
  rol: z.enum(['director', 'maestro', 'estudiante', 'padre', 'psicologo']),
});

authRouter.post('/registro', async (req, res) => {
  const datos = esquemaRegistro.safeParse(req.body);
  if (!datos.success) {
    return res.status(400).json({ error: datos.error.issues[0].message });
  }
  const { correo, password, rol } = datos.data;

  const yaExiste = await pool.query('SELECT id FROM usuarios WHERE correo = $1', [correo]);
  if (yaExiste.rowCount) {
    return res.status(409).json({ error: 'Ese correo ya está registrado' });
  }

  const hash = await cifrarPassword(password);
  const resultado = await pool.query(
    `INSERT INTO usuarios (correo, password_hash, rol)
     VALUES ($1, $2, $3)
     RETURNING id, correo, rol`,
    [correo, hash, rol],
  );

  res.status(201).json(resultado.rows[0]);
});

const esquemaLogin = z.object({
  correo: z.string().email(),
  password: z.string(),
});

authRouter.post('/login', async (req, res) => {
  const datos = esquemaLogin.safeParse(req.body);
  if (!datos.success) {
    return res.status(400).json({ error: 'Correo o contraseña con formato inválido' });
  }
  const { correo, password } = datos.data;

  const resultado = await pool.query(
    'SELECT id, password_hash, rol, activo FROM usuarios WHERE correo = $1',
    [correo],
  );
  const usuario = resultado.rows[0];

  // Mismo mensaje si el correo no existe o si la contraseña es incorrecta:
  // así nadie puede usar el error para averiguar qué correos están registrados.
  if (!usuario || !usuario.activo) {
    return res.status(401).json({ error: 'Correo o contraseña incorrectos' });
  }

  const passwordValida = await verificarPassword(usuario.password_hash, password);
  if (!passwordValida) {
    return res.status(401).json({ error: 'Correo o contraseña incorrectos' });
  }

  const token = generarToken({ idUsuario: usuario.id, rol: usuario.rol });
  res.json({ token, rol: usuario.rol });
});