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
7. [Roadmap](#roadmap)
8. [Decisiones de diseño](#decisiones-de-diseño)
9. [Estado actual](#estado-actual)
10. [Autor](#autor)

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
Diseño relacional de 10 tablas. Las relaciones de muchos a muchos se resuelven con tablas intermedias.

![Diagrama entidad-relación](docs/diagrama_er_app_escolar.png)

| Tabla | Propósito |
|---|---|
| `Estudiantes` | Datos del alumno y su grupo |
| `Padres` | Padres, madres y tutores |
| `Estudiante_Padre` | Vincula alumnos con sus tutores |
| `Maestros` | Datos del personal docente |
| `Materias` | Catálogo de materias |
| `Grupos` | Grupos y grados |
| `Materia_Maestro_Grupo` | Qué maestro da qué materia a qué grupo |
| `Asistencia` | Registro por estudiante, materia y fecha |
| `Calificaciones` | Nota por estudiante, materia, maestro y parcial |
| `Avisos` | Comunicados generales o por grupo |

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
├── backend/   API (Node + TypeScript + Express)
├── web/       Panel de Director y Maestro (React)
├── mobile/    App para padres (Flutter)
├── docs/      Diagrama ER y documentación
└── README.md
```

## Roadmap
- [x] Diseño de la base de datos (10 tablas) y diagrama ER
- [x] Definición de roles y matriz de permisos
- [x] Repositorio y estructura inicial
- [ ] **Fase 1 (MVP):** base de datos en PostgreSQL, API con autenticación y roles, CRUD de estudiantes y maestros, asistencia, calificaciones, avisos, panel web y app móvil para padres
- [ ] **Fase 1.5:** modo sin conexión (sincronización al volver el internet)
- [ ] **Fase 2:** orientación vocacional con rol de psicólogo y validación profesional de las sugerencias de carrera
- [ ] **Fase 3:** estadísticas avanzadas para el Director y notificaciones por nivel de urgencia

## Decisiones de diseño
- **Una fila por registro de asistencia:** en vez de una columna por estado o por estudiante, para que la tabla escale sin cambios.
- **Estado calculado, no guardado:** si la escuela cambia la calificación mínima, no hay que actualizar registros viejos.
- **Sin comparaciones entre estudiantes ni entre hijos:** decisión de producto para evitar presión y burlas.
- **Datos sensibles protegidos:** las evaluaciones psicológicas (Fase 2) tendrán acceso restringido.
- **API y permisos propios:** control total de los datos, sin depender de servicios de terceros para lo esencial.

## Estado actual
Fase de diseño completada. En construcción: base de datos y API.

## Autor
Felix Arvizu Angel Gabriel, DSM 4-1, Universidad Tecnológica de Hermosillo (UTH).