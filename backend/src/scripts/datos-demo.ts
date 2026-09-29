import { readFileSync } from 'node:fs';
import path from 'node:path';
import { config } from '../config';
import { pool } from '../db';
import { cifrarPassword } from '../auth/password';

// Deja la base con una escuela de demostración: BORRA TODO, crea las tablas y carga
// datos inventados. Sirve para preparar la demo publicada y para restaurarla si
// alguien la desordena. Uso: npm run demo -- --confirmar

const CONTRASENA_DEMO = 'QuironDemo2026';
// .test es un dominio reservado: estos correos nunca pueden ser de alguien real.
const DOMINIO = 'quiron-demo.test';

const GRUPOS = [
    { nombre: '1° A', grado: 1 },
    { nombre: '1° B', grado: 1 },
];

const MATERIAS = ['Matemáticas', 'Español', 'Ciencias'];

const MAESTROS = [
    { nombre: 'Laura Méndez', correo: 'maestra.mendez' },
    { nombre: 'Jorge Salazar', correo: 'maestro.salazar' },
];

// Qué maestro da qué materia a qué grupo.
const ASIGNACIONES = [
    { maestro: 'Laura Méndez', materia: 'Matemáticas', grupo: '1° A' },
    { maestro: 'Laura Méndez', materia: 'Matemáticas', grupo: '1° B' },
    { maestro: 'Jorge Salazar', materia: 'Español', grupo: '1° A' },
    { maestro: 'Jorge Salazar', materia: 'Ciencias', grupo: '1° B' },
];

interface EstudianteDemo {
    nombre: string;
    correo: string;
    grupo: string;
    matricula: string;
    codigo: string; // 8 caracteres, sin 0, O, 1 ni I
    calificaciones: Record<string, [number, number]>; // parciales 1 y 2
}

// Pensados para que la app muestre casos distintos: quien destaca en dos materias,
// quien necesita reforzar una, y una alumna sin familia para probar la vinculación.
const ESTUDIANTES: EstudianteDemo[] = [
    {
        nombre: 'Sofía Ramírez', correo: 'sofia', grupo: '1° A', matricula: 'D-001', codigo: 'K7M2QX4P',
        calificaciones: { Matemáticas: [9.5, 9], Español: [8, 8.5] }
    },
    {
        nombre: 'Diego Torres', correo: 'diego', grupo: '1° A', matricula: 'D-002', codigo: 'R3T8WB6N',
        calificaciones: { Matemáticas: [6.5, 7], Español: [7.5, 8] }
    },
    {
        nombre: 'Valeria Cruz', correo: 'valeria', grupo: '1° A', matricula: 'D-003', codigo: 'H5Z9CD2L',
        calificaciones: { Matemáticas: [8.5, 9], Español: [9.5, 10] }
    },
    {
        nombre: 'Mateo Ramírez', correo: 'mateo', grupo: '1° B', matricula: 'D-004', codigo: 'P4Y7GF3S',
        calificaciones: { Matemáticas: [7, 7.5], Ciencias: [5, 5.5] }
    },
    {
        nombre: 'Camila Flores', correo: 'camila', grupo: '1° B', matricula: 'D-005', codigo: 'W8E2JU5A',
        calificaciones: { Matemáticas: [10, 9.5], Ciencias: [9, 9] }
    },
    {
        nombre: 'Santiago Ruiz', correo: 'santiago', grupo: '1° B', matricula: 'D-006', codigo: 'N6V3XK9T',
        calificaciones: { Matemáticas: [6, 6.5], Ciencias: [7, 6.5] }
    },
];

// Ana tiene dos hijos (en la app verá "Hijo 1, Hijo 2"). Camila queda sin familia.
const FAMILIAS = [
    {
        nombre: 'Ana Ramírez', correo: 'familia.ramirez',
        hijos: [{ estudiante: 'Sofía Ramírez', relacion: 'madre' }, { estudiante: 'Mateo Ramírez', relacion: 'madre' }]
    },
    {
        nombre: 'Roberto Torres', correo: 'familia.torres',
        hijos: [{ estudiante: 'Diego Torres', relacion: 'padre' }]
    },
];

const AVISOS_GENERALES = [
    {
        titulo: 'Junta de padres de familia', subtitulo: null,
        cuerpo: 'Los esperamos en el auditorio para revisar los resultados del primer parcial.', enDias: 3, hora: 18
    },
    {
        titulo: 'Semana de la ciencia', subtitulo: 'Exposición de proyectos',
        cuerpo: 'Todos los grupos presentarán sus proyectos en el patio principal.', enDias: 10, hora: 9
    },
];

const AVISOS_DE_GRUPO = [
    {
        maestro: 'Laura Méndez', materia: 'Matemáticas', grupo: '1° A', titulo: 'Examen del segundo parcial',
        cuerpo: 'Temas: fracciones y porcentajes. Traer calculadora.', enDias: 5, hora: 8
    },
    {
        maestro: 'Jorge Salazar', materia: 'Ciencias', grupo: '1° B', titulo: 'Proyecto del sistema solar',
        cuerpo: 'Entrega en equipos de tres, con materiales reciclados.', enDias: 7, hora: 8
    },
];

// Los últimos días hábiles (lunes a viernes), del más antiguo al más reciente.
function diasHabiles(cuantos: number) {
    const dias: string[] = [];
    const fecha = new Date();
    while (dias.length < cuantos) {
        const dia = fecha.getDay();
        if (dia !== 0 && dia !== 6) dias.push(fecha.toLocaleDateString('en-CA'));
        fecha.setDate(fecha.getDate() - 1);
    }
    return dias.reverse();
}

function fechaEvento(enDias: number, hora: number) {
    const fecha = new Date();
    fecha.setDate(fecha.getDate() + enDias);
    fecha.setHours(hora, 0, 0, 0);
    return fecha.toISOString();
}

// Muestra a qué base se va a conectar, para no borrar la equivocada.
function destino() {
    const db = config.db;
    if (db.connectionString) {
        const url = new URL(db.connectionString);
        return `${url.host}${url.pathname}`;
    }
    return `${db.host}:${db.port}/${db.database}`;
}

async function main() {
    console.log(`Base de datos destino: ${destino()}`);
    if (!process.argv.includes('--confirmar')) {
        console.log('Este comando BORRA todos los datos de esa base.');
        console.log('Si es la correcta, repítelo así: npm run demo -- --confirmar');
        return;
    }

    const hash = await cifrarPassword(CONTRASENA_DEMO);
    const cliente = await pool.connect();
    try {
        // Todo en una transacción: si algo falla, la base queda como estaba.
        await cliente.query('BEGIN');
        await cliente.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
        await cliente.query(readFileSync(path.resolve(__dirname, '../../db/schema.sql'), 'utf8'));

        const crearUsuario = async (correo: string, rol: string): Promise<number> => {
            const r = await cliente.query(
                'INSERT INTO usuarios (correo, password_hash, rol) VALUES ($1, $2, $3) RETURNING id',
                [`${correo}@${DOMINIO}`, hash, rol],
            );
            return r.rows[0].id;
        };

        const idDirector = await crearUsuario('director', 'director');

        const grupos = new Map<string, number>();
        for (const g of GRUPOS) {
            const r = await cliente.query('INSERT INTO grupos (nombre, grado) VALUES ($1, $2) RETURNING id', [g.nombre, g.grado]);
            grupos.set(g.nombre, r.rows[0].id);
        }

        const materias = new Map<string, number>();
        for (const nombre of MATERIAS) {
            const r = await cliente.query('INSERT INTO materias (nombre) VALUES ($1) RETURNING id', [nombre]);
            materias.set(nombre, r.rows[0].id);
        }

        const maestros = new Map<string, { id: number; idUsuario: number }>();
        for (const m of MAESTROS) {
            const idUsuario = await crearUsuario(m.correo, 'maestro');
            const r = await cliente.query('INSERT INTO maestros (id_usuario, nombre) VALUES ($1, $2) RETURNING id', [idUsuario, m.nombre]);
            maestros.set(m.nombre, { id: r.rows[0].id, idUsuario });
        }

        const asignaciones = new Map<string, number>(); // clave: "maestro|materia|grupo"
        for (const a of ASIGNACIONES) {
            const r = await cliente.query(
                'INSERT INTO materia_maestro_grupo (id_maestro, id_materia, id_grupo) VALUES ($1, $2, $3) RETURNING id',
                [maestros.get(a.maestro)!.id, materias.get(a.materia), grupos.get(a.grupo)],
            );
            asignaciones.set(`${a.maestro}|${a.materia}|${a.grupo}`, r.rows[0].id);
        }

        const estudiantes = new Map<string, number>();
        for (const e of ESTUDIANTES) {
            const idUsuario = await crearUsuario(e.correo, 'estudiante');
            const r = await cliente.query(
                `INSERT INTO estudiantes (id_usuario, id_grupo, nombre, matricula, codigo_parental)
         VALUES ($1, $2, $3, $4, $5) RETURNING id`,
                [idUsuario, grupos.get(e.grupo), e.nombre, e.matricula, e.codigo],
            );
            estudiantes.set(e.nombre, r.rows[0].id);
        }

        for (const f of FAMILIAS) {
            const idUsuario = await crearUsuario(f.correo, 'padre');
            const r = await cliente.query('INSERT INTO padres (id_usuario, nombre) VALUES ($1, $2) RETURNING id', [idUsuario, f.nombre]);
            for (const h of f.hijos) {
                await cliente.query(
                    'INSERT INTO estudiante_padre (id_estudiante, id_padre, relacion) VALUES ($1, $2, $3)',
                    [estudiantes.get(h.estudiante), r.rows[0].id, h.relacion],
                );
            }
        }

        // Asistencia de los últimos 10 días hábiles, con un patrón fijo de faltas y retardos.
        // Se inserta todo en una sola consulta con unnest (una fila por posición de los arreglos).
        const dias = diasHabiles(10);
        const asistencia = {
            estudiante: [] as number[], materia: [] as number[], fecha: [] as string[],
            estado: [] as string[], justificacion: [] as (string | null)[]
        };
        ESTUDIANTES.forEach((e, i) => {
            for (const materia of Object.keys(e.calificaciones)) {
                dias.forEach((fecha, d) => {
                    const estado = (i + d) % 9 === 4 ? 'ausente' : (i * 3 + d) % 8 === 5 ? 'retardo' : 'presente';
                    asistencia.estudiante.push(estudiantes.get(e.nombre)!);
                    asistencia.materia.push(materias.get(materia)!);
                    asistencia.fecha.push(fecha);
                    asistencia.estado.push(estado);
                    asistencia.justificacion.push(estado === 'ausente' && d % 2 === 0 ? 'Cita médica' : null);
                });
            }
        });
        await cliente.query(
            `INSERT INTO asistencia (id_estudiante, id_materia, fecha, estado, justificacion)
       SELECT * FROM unnest($1::bigint[], $2::bigint[], $3::date[], $4::varchar[], $5::text[])`,
            [asistencia.estudiante, asistencia.materia, asistencia.fecha, asistencia.estado, asistencia.justificacion],
        );

        // Calificaciones de los parciales 1 y 2, capturadas por el maestro de cada materia.
        const calificaciones = {
            estudiante: [] as number[], materia: [] as number[], maestro: [] as number[],
            valor: [] as number[], parcial: [] as number[]
        };
        for (const e of ESTUDIANTES) {
            for (const [materia, parciales] of Object.entries(e.calificaciones)) {
                const asignacion = ASIGNACIONES.find((a) => a.materia === materia && a.grupo === e.grupo)!;
                parciales.forEach((valor, p) => {
                    calificaciones.estudiante.push(estudiantes.get(e.nombre)!);
                    calificaciones.materia.push(materias.get(materia)!);
                    calificaciones.maestro.push(maestros.get(asignacion.maestro)!.id);
                    calificaciones.valor.push(valor);
                    calificaciones.parcial.push(p + 1);
                });
            }
        }
        await cliente.query(
            `INSERT INTO calificaciones (id_estudiante, id_materia, id_maestro, calificacion, parcial)
       SELECT * FROM unnest($1::bigint[], $2::bigint[], $3::bigint[], $4::numeric[], $5::smallint[])`,
            [calificaciones.estudiante, calificaciones.materia, calificaciones.maestro, calificaciones.valor, calificaciones.parcial],
        );

        for (const a of AVISOS_GENERALES) {
            await cliente.query(
                `INSERT INTO avisos (id_autor, id_materia_maestro_grupo, titulo, subtitulo, cuerpo, fecha_evento)
         VALUES ($1, NULL, $2, $3, $4, $5)`,
                [idDirector, a.titulo, a.subtitulo, a.cuerpo, fechaEvento(a.enDias, a.hora)],
            );
        }
        for (const a of AVISOS_DE_GRUPO) {
            await cliente.query(
                `INSERT INTO avisos (id_autor, id_materia_maestro_grupo, titulo, cuerpo, fecha_evento)
         VALUES ($1, $2, $3, $4, $5)`,
                [maestros.get(a.maestro)!.idUsuario, asignaciones.get(`${a.maestro}|${a.materia}|${a.grupo}`),
                a.titulo, a.cuerpo, fechaEvento(a.enDias, a.hora)],
            );
        }

        await cliente.query('COMMIT');

        console.log(`Demo lista. Todas las cuentas usan la contraseña: ${CONTRASENA_DEMO}`);
        console.log(`  Director:  director@${DOMINIO}`);
        console.log(`  Maestra:   maestra.mendez@${DOMINIO}`);
        console.log(`  Maestro:   maestro.salazar@${DOMINIO}`);
        console.log(`  Familia:   familia.ramirez@${DOMINIO} (dos hijos)`);
        console.log('  Código familiar libre para probar la vinculación: W8E2JU5A (Camila Flores)');
    } catch (error) {
        await cliente.query('ROLLBACK');
        throw error;
    } finally {
        cliente.release();
    }
}

main()
    .catch((error) => {
        console.error('No se pudo cargar la demo:', error.message);
        process.exitCode = 1;
    })
    .finally(() => pool.end());