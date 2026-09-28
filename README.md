# Proyecto Quirón

> El guía que acompaña al estudiante y a su familia.

Quirón es una plataforma escolar (panel web + app móvil) que conecta a la escuela con las familias. Los maestros pasan lista, suben calificaciones y publican avisos, y los padres, madres y tutores ven el progreso de sus hijos desde el celular, con notificaciones.

La idea central: la app no solo muestra números. A futuro le dirá a la familia en qué destaca el estudiante, en qué puede mejorar y qué carreras podrían irle bien, sin compararlo nunca con otros compañeros.

---

## Tabla de contenido
1. [Problema que resuelve](#problema-que-resuelve)
2. [Roles y permisos](#roles-y-permisos)
3. [Funciones principales](#funciones-principales)
4. [Base de datos](#base-de-datos)
5. [Stack tecnológico](#stack-tecnológico)
6. [Estructura del repositorio](#estructura-del-repositorio)
7. [Cómo levantar la base de datos](#cómo-levantar-la-base-de-datos)
8. [Roadmap](#roadmap)
9. [Decisiones de diseño](#decisiones-de-diseño)
10. [Estado actual](#estado-actual)
11. [Autor](#autor)

---

## Problema que resuelve
En muchas escuelas la información del estudiante (asistencia, calificaciones, avisos) llega tarde a los padres o por medios dispersos. Quirón centraliza todo en un solo sistema: el maestro registra una vez y la familia lo ve de inmediato.

## Roles y permisos

| Acción | Director | Maestro | Estudiante | Padre/Tutor |
|---|---|---|---|---|
| Dar de alta y baja a maestros y alumnos | Sí | No | No | No |
| Ver información de toda la escuela | Sí | No | No | No |
| Pasar lista y subir calificaciones | No | Sí (solo sus grupos y materias) | No | No |
| Publicar avisos | Sí (generales) | Sí (solo su grupo y materia) | No | No |
| Ver calificaciones y asistencia | Sí (todos) | Sí (solo su grupo) | Solo las propias | Solo las de sus hijos |
| Comparar entre estudiantes o hijos | No aplica | No aplica | No | No (decisión de producto) |

Los permisos se validan en el servidor, no solo en la interfaz.

## Funciones principales
- **Asistencia por materia:** presente, ausente o retardo, con justificación opcional.
- **Calificaciones por parcial.** El estado aprobado/reprobado se calcula, no se guarda.
- **Avisos** por grupo y materia, o generales de toda la escuela.
- **Vinculación segura** de padres con sus hijos mediante un código parental generado por la escuela.
- **Notificaciones push**, incluyendo alertas urgentes con sonido distinto.
- **Vista para padres** con un menú por hijo (Hijo 1, Hijo 2) y sin comparaciones.

## Base de datos
Diseño relacional de 11 tablas en PostgreSQL. Las relaciones de muchos a muchos se resuelven con tablas intermedias y los datos de acceso viven en una sola tabla (`Usuarios`).

![Diagrama entidad-relación](docs/diagrama_er_app_escolar.png)

| Tabla | Propósito |
|---|---|
| `Usuarios` | Correo, contraseña cifrada, rol y estado (activo) de todas las personas |
| `Estudiantes` | Datos del alumno, su grupo y su código parental |
| `Padres` | Padres, madres y tutores |
| `Estudiante_Padre` | Vincula alumnos con sus tutores y guarda la relación (padre, madre o tutor) |
| `Maestros` | Datos del personal docente |
| `Materias` | Catálogo de materias |
| `Grupos` | Grupos y grados |
| `Materia_Maestro_Grupo` | Qué maestro da qué materia a qué grupo |
| `Asistencia` | Registro por estudiante, materia y fecha |
| `Calificaciones` | Nota por estudiante, materia, maestro y parcial |
| `Avisos` | Comunicados generales o por grupo |

El esquema completo está en [`backend/db/schema.sql`](backend/db/schema.sql).

## Stack tecnológico

| Capa | Tecnología |
|---|---|
| API | Node.js 24 LTS, TypeScript, Express |
| Base de datos | PostgreSQL |
| Contenedores | Docker |
| Autenticación y permisos | JWT y control de roles propios (sin servicios externos) |
| Panel web (Director y Maestro) | React, Vite, Tailwind CSS |
| App móvil (Padres) | Flutter |
| Notificaciones push | Firebase Cloud Messaging |

## Estructura del repositorio
```
proyecto-quiron/
├── backend/
│   └── db/schema.sql   Esquema de la base de datos
├── web/                Panel de Director y Maestro (React)
├── mobile/             App para padres (Flutter)
├── docs/               Diagrama ER y documentación
├── docker-compose.yml  PostgreSQL en Docker
├── .env.example        Variables de entorno de ejemplo
└── README.md
```

## Cómo levantar la base de datos
Requisitos: Docker Desktop.

1. Copia `.env.example` como `.env` y cambia la contraseña.
2. Levanta PostgreSQL:
```
   docker compose up -d
```
3. Crea las tablas (PowerShell):
```
   Get-Content backend\db\schema.sql -Raw -Encoding UTF8 | docker exec -i quiron-db psql -U quiron_admin -d quiron
```
4. Verifica que existan las 11 tablas:
```
   docker exec -it quiron-db psql -U quiron_admin -d quiron -c "\dt"
```

## Roadmap
- [x] Diseño de la base de datos (11 tablas) y diagrama ER
- [x] Definición de roles y matriz de permisos
- [x] Repositorio y estructura inicial
- [x] Base de datos en PostgreSQL con Docker (11 tablas)
- [ ] **Fase 1 (MVP):** API con autenticación y roles, CRUD de estudiantes y maestros, asistencia, calificaciones, avisos, panel web y app móvil para padres
- [ ] **Fase 1.5:** modo sin conexión (sincronización al volver el internet)
- [ ] **Fase 2:** orientación vocacional con rol de psicólogo y validación profesional de las sugerencias de carrera
- [ ] **Fase 3:** estadísticas avanzadas para el Director y notificaciones por nivel de urgencia

## Decisiones de diseño
- **Una fila por registro de asistencia:** en vez de una columna por estado o por estudiante, para que la tabla escale sin cambios.
- **Estado calculado, no guardado:** si la escuela cambia la calificación mínima, no hay que actualizar registros viejos.
- **Sin comparaciones entre estudiantes ni entre hijos:** decisión de producto para evitar presión y burlas.
- **Datos sensibles protegidos:** las evaluaciones psicológicas (Fase 2) tendrán acceso restringido.
- **API y permisos propios:** control total de los datos, sin depender de servicios de terceros para lo esencial.
- **Datos de acceso centralizados:** una sola tabla `Usuarios` (correo, contraseña cifrada, rol, activo) en vez de repetirlos en cada tabla de personas.
- **Baja lógica:** dar de baja desactiva al usuario (`activo`), no lo borra, para conservar el historial de calificaciones y asistencia.

## Estado actual
Base de datos lista (11 tablas en PostgreSQL con Docker). En construcción: API con autenticación y roles.

## Autor
Felix Arvizu Angel Gabriel, DSM 4-1, Universidad Tecnológica de Hermosillo (UTH).