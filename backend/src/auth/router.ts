import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../db';
import { cifrarPassword, verificarPassword } from './password';
import { generarToken } from './jwt';

export const authRouter = Router();

// Solo las familias se registran por su cuenta. Director, maestros y
// estudiantes los da de alta el Director desde sus propias rutas.
const esquemaRegistro = z.object({
  correo: z.string().email(),
  password: z.string().min(8, 'La contraseña necesita al menos 8 caracteres'),
  nombre: z.string().min(1),
  telefono: z.string().optional(),
});

authRouter.post('/registro', async (req, res) => {
  const datos = esquemaRegistro.safeParse(req.body);
  if (!datos.success) {
    return res.status(400).json({ error: datos.error.issues[0].message });
  }
  const { correo, password, nombre, telefono } = datos.data;

  const cliente = await pool.connect();
  try {
    await cliente.query('BEGIN');
    const hash = await cifrarPassword(password);
    const usuario = await cliente.query(
      `INSERT INTO usuarios (correo, password_hash, rol) VALUES ($1, $2, 'padre') RETURNING id`,
      [correo, hash],
    );
    const padre = await cliente.query(
      `INSERT INTO padres (id_usuario, nombre, telefono) VALUES ($1, $2, $3) RETURNING id, nombre`,
      [usuario.rows[0].id, nombre, telefono ?? null],
    );
    await cliente.query('COMMIT');
    res.status(201).json({ ...padre.rows[0], correo, rol: 'padre' });
  } catch (error: any) {
    await cliente.query('ROLLBACK');
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Ese correo ya está registrado' });
    }
    console.error(error);
    res.status(500).json({ error: 'No se pudo completar el registro' });
  } finally {
    cliente.release();
  }
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