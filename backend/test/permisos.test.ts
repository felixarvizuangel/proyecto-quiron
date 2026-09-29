import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { app } from '../src/app';
import { pool } from '../src/db';

// Datos que carga test/preparar-base.ts (ids fijos porque la base se crea desde cero).
const ANA = 1; // Grupo A, hija de Laura
const BETO = 2; // Grupo B
const ASIGNACION_CARLOS = 1; // Programación Web · Grupo A
const ASIGNACION_MARTA = 2; // Matemáticas · Grupo B
const JORGE = 3; // maestro sin grupos, se usa para probar la baja

function hoy() {
  return new Date().toLocaleDateString('en-CA');
}

async function entrar(correo: string) {
  const res = await request(app).post('/auth/login').send({ correo, password: 'Prueba1234' });
  expect(res.status).toBe(200);
  return `Bearer ${res.body.token}`;
}

let director: string;
let carlos: string;
let laura: string;

beforeAll(async () => {
  [director, carlos, laura] = await Promise.all([
    entrar('director@test.mx'),
    entrar('carlos@test.mx'),
    entrar('laura@test.mx'),
  ]);
});

afterAll(async () => {
  await pool.end();
});

describe('Registro y autenticación', () => {
  it('el registro abierto siempre crea familias, aunque pidan otro rol', async () => {
    const res = await request(app).post('/auth/registro').send({
      correo: 'intruso@test.mx',
      password: 'Prueba1234',
      nombre: 'Intruso',
      rol: 'director',
    });
    expect(res.status).toBe(201);
    expect(res.body.rol).toBe('padre');
  });

  it('sin token no se puede consultar nada', async () => {
    const res = await request(app).get('/estudiantes');
    expect(res.status).toBe(401);
  });
});

describe('Director', () => {
  it('solo el Director da de alta estudiantes, con un código familiar válido', async () => {
    const alta = {
      correo: 'nuevo@test.mx',
      password: 'Prueba1234',
      nombre: 'Nuevo',
      matricula: 'T100',
      idGrupo: 1,
    };

    const comoMaestro = await request(app).post('/estudiantes').set('Authorization', carlos).send(alta);
    expect(comoMaestro.status).toBe(403);

    const comoDirector = await request(app).post('/estudiantes').set('Authorization', director).send(alta);
    expect(comoDirector.status).toBe(201);
    // 8 caracteres, sin 0, O, 1 ni I.
    expect(comoDirector.body.codigo_parental).toMatch(/^[A-HJ-NP-Z2-9]{8}$/);
  });
});

describe('Maestros: solo lo que les corresponde', () => {
  it('pasa lista en su propia asignación', async () => {
    const res = await request(app)
      .post('/asistencia/lista')
      .set('Authorization', carlos)
      .send({ idAsignacion: ASIGNACION_CARLOS, fecha: hoy(), registros: [{ idEstudiante: ANA, estado: 'presente' }] });
    expect(res.status).toBe(201);
  });

  it('no puede pasar lista en una asignación ajena', async () => {
    const res = await request(app)
      .post('/asistencia/lista')
      .set('Authorization', carlos)
      .send({ idAsignacion: ASIGNACION_MARTA, fecha: hoy(), registros: [{ idEstudiante: BETO, estado: 'presente' }] });
    expect(res.status).toBe(403);
  });

  it('no puede colar en su lista a un estudiante de otro grupo', async () => {
    const res = await request(app)
      .post('/asistencia/lista')
      .set('Authorization', carlos)
      .send({ idAsignacion: ASIGNACION_CARLOS, fecha: hoy(), registros: [{ idEstudiante: BETO, estado: 'ausente' }] });
    expect(res.status).toBe(403);
  });

  it('ve las calificaciones de su grupo, pero no las de otros grupos', async () => {
    const propio = await request(app).get(`/calificaciones/estudiante/${ANA}`).set('Authorization', carlos);
    const ajeno = await request(app).get(`/calificaciones/estudiante/${BETO}`).set('Authorization', carlos);
    expect(propio.status).toBe(200);
    expect(ajeno.status).toBe(403);
  });

  it('no puede borrar avisos del Director', async () => {
    const aviso = await request(app)
      .post('/avisos/general')
      .set('Authorization', director)
      .send({ titulo: 'Junta', cuerpo: 'El lunes a las 8.' });
    expect(aviso.status).toBe(201);

    const res = await request(app).delete(`/avisos/${aviso.body.id}`).set('Authorization', carlos);
    expect(res.status).toBe(404);
  });
});

describe('Calificaciones y acompañamiento', () => {
  it('una calificación baja sale reprobada y aparece en "puede reforzar"', async () => {
    const guardar = await request(app)
      .post('/calificaciones/lista')
      .set('Authorization', carlos)
      .send({ idAsignacion: ASIGNACION_CARLOS, parcial: 1, registros: [{ idEstudiante: ANA, calificacion: 5.5 }] });
    expect(guardar.status).toBe(201);

    const calificaciones = await request(app).get(`/calificaciones/estudiante/${ANA}`).set('Authorization', laura);
    expect(calificaciones.body[0].estado).toBe('reprobado');

    const resumen = await request(app).get(`/familia/hijos/${ANA}/resumen`).set('Authorization', laura);
    expect(resumen.body.reforzar).toContain('Programación Web');
  });

  it('una calificación alta sale aprobada y aparece en "destaca en"', async () => {
    // Mismo parcial: la nueva calificación reemplaza a la anterior.
    const guardar = await request(app)
      .post('/calificaciones/lista')
      .set('Authorization', carlos)
      .send({ idAsignacion: ASIGNACION_CARLOS, parcial: 1, registros: [{ idEstudiante: ANA, calificacion: 9 }] });
    expect(guardar.status).toBe(201);

    const calificaciones = await request(app).get(`/calificaciones/estudiante/${ANA}`).set('Authorization', laura);
    expect(calificaciones.body[0].estado).toBe('aprobado');

    const resumen = await request(app).get(`/familia/hijos/${ANA}/resumen`).set('Authorization', laura);
    expect(resumen.body.destaca).toContain('Programación Web');
  });

  it('rechaza calificaciones fuera de 0 a 10', async () => {
    const res = await request(app)
      .post('/calificaciones/lista')
      .set('Authorization', carlos)
      .send({ idAsignacion: ASIGNACION_CARLOS, parcial: 1, registros: [{ idEstudiante: ANA, calificacion: 11 }] });
    expect(res.status).toBe(400);
  });
});

describe('Familias', () => {
  it('solo ven a sus propios hijos', async () => {
    const hija = await request(app).get(`/asistencia/estudiante/${ANA}`).set('Authorization', laura);
    const ajeno = await request(app).get(`/asistencia/estudiante/${BETO}`).set('Authorization', laura);
    expect(hija.status).toBe(200);
    expect(ajeno.status).toBe(403);
  });

  it('un código familiar falso se rechaza sin dar pistas', async () => {
    const res = await request(app)
      .post('/familia/vincular')
      .set('Authorization', laura)
      .send({ codigo: 'ZZZZZZZZ', relacion: 'madre' });
    expect(res.status).toBe(404);
  });

  it('un maestro no puede usar las rutas de familias', async () => {
    const res = await request(app).get('/familia/hijos').set('Authorization', carlos);
    expect(res.status).toBe(403);
  });
});

describe('Bajas', () => {
  it('dar de baja a un maestro corta su acceso de inmediato', async () => {
    const jorge = await entrar('jorge@test.mx');
    const antes = await request(app).get('/asignaciones/mias').set('Authorization', jorge);
    expect(antes.status).toBe(200);

    const baja = await request(app)
      .patch(`/maestros/${JORGE}/estado`)
      .set('Authorization', director)
      .send({ activo: false });
    expect(baja.status).toBe(200);

    // El mismo token, que todavía no vence, ya no sirve.
    const despues = await request(app).get('/asignaciones/mias').set('Authorization', jorge);
    expect(despues.status).toBe(401);
  });
});