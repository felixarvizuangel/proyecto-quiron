import request from 'supertest';
import { afterAll, describe, expect, it } from 'vitest';
import { app } from '../src/app';
import { pool } from '../src/db';

// Va en su propio archivo: cada archivo de pruebas tiene su propio contador de
// intentos, así estos fallos a propósito no afectan a las demás pruebas.
afterAll(async () => {
  await pool.end();
});

describe('Límite de intentos', () => {
  it('después de 10 contraseñas incorrectas, bloquea el login', async () => {
    const respuestas: number[] = [];
    for (let i = 0; i < 11; i++) {
      const res = await request(app)
        .post('/auth/login')
        .send({ correo: 'director@test.mx', password: 'incorrecta' });
      respuestas.push(res.status);
    }
    expect(respuestas.slice(0, 10).every((estado) => estado === 401)).toBe(true);
    expect(respuestas[10]).toBe(429);
  });
});