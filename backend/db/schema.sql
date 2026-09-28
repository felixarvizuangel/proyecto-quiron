-- =====================================================
-- Proyecto Quirón - Esquema de base de datos (PostgreSQL)
-- =====================================================

-- 1. USUARIOS: datos de acceso de TODAS las personas
CREATE TABLE IF NOT EXISTS usuarios (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  correo        VARCHAR(255) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  rol           VARCHAR(20) NOT NULL
                CHECK (rol IN ('director','maestro','estudiante','padre','psicologo')),
  activo        BOOLEAN NOT NULL DEFAULT TRUE,
  creado_en     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. MATERIAS: catálogo (existe una sola vez en la escuela)
CREATE TABLE IF NOT EXISTS materias (
  id     BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL UNIQUE
);

-- 3. GRUPOS
CREATE TABLE IF NOT EXISTS grupos (
  id     BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nombre VARCHAR(50) NOT NULL UNIQUE,          -- ej. 'DSM 4-1'
  grado  SMALLINT NOT NULL CHECK (grado > 0)   -- número, para ordenar y filtrar
);

-- 4. PADRES (cada uno tiene su usuario para iniciar sesión)
CREATE TABLE IF NOT EXISTS padres (
  id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  id_usuario BIGINT NOT NULL UNIQUE REFERENCES usuarios(id),
  nombre     VARCHAR(150) NOT NULL,
  telefono   VARCHAR(20)
);

-- 5. MAESTROS
CREATE TABLE IF NOT EXISTS maestros (
  id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  id_usuario BIGINT NOT NULL UNIQUE REFERENCES usuarios(id),
  nombre     VARCHAR(150) NOT NULL,
  telefono   VARCHAR(20)
);

-- 6. ESTUDIANTES
CREATE TABLE IF NOT EXISTS estudiantes (
  id               BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  id_usuario       BIGINT NOT NULL UNIQUE REFERENCES usuarios(id),
  id_grupo         BIGINT NOT NULL REFERENCES grupos(id),
  nombre           VARCHAR(150) NOT NULL,
  matricula        VARCHAR(30) NOT NULL UNIQUE,
  direccion        TEXT,
  codigo_parental  VARCHAR(12) NOT NULL UNIQUE  -- para vincular a los padres
);

-- 7. ESTUDIANTE_PADRE (muchos a muchos)
CREATE TABLE IF NOT EXISTS estudiante_padre (
  id_estudiante BIGINT NOT NULL REFERENCES estudiantes(id),
  id_padre      BIGINT NOT NULL REFERENCES padres(id),
  relacion      VARCHAR(10) NOT NULL CHECK (relacion IN ('padre','madre','tutor')),
  PRIMARY KEY (id_estudiante, id_padre)
);

-- 8. MATERIA_MAESTRO_GRUPO: qué maestro da qué materia a qué grupo
CREATE TABLE IF NOT EXISTS materia_maestro_grupo (
  id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  id_maestro BIGINT NOT NULL REFERENCES maestros(id),
  id_materia BIGINT NOT NULL REFERENCES materias(id),
  id_grupo   BIGINT NOT NULL REFERENCES grupos(id),
  UNIQUE (id_maestro, id_materia, id_grupo)
);

-- 9. CALIFICACIONES (el aprobado/reprobado se calcula, no se guarda)
CREATE TABLE IF NOT EXISTS calificaciones (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  id_estudiante BIGINT NOT NULL REFERENCES estudiantes(id),
  id_materia    BIGINT NOT NULL REFERENCES materias(id),
  id_maestro    BIGINT NOT NULL REFERENCES maestros(id),
  calificacion  NUMERIC(4,2) NOT NULL CHECK (calificacion BETWEEN 0 AND 10),
  parcial       SMALLINT NOT NULL CHECK (parcial > 0),
  capturado_en  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (id_estudiante, id_materia, parcial)
);

-- 10. ASISTENCIA: una fila por estudiante, materia y día
CREATE TABLE IF NOT EXISTS asistencia (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  id_estudiante BIGINT NOT NULL REFERENCES estudiantes(id),
  id_materia    BIGINT NOT NULL REFERENCES materias(id),
  fecha         DATE NOT NULL,
  estado        VARCHAR(10) NOT NULL CHECK (estado IN ('presente','ausente','retardo')),
  justificacion TEXT,
  registrado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (id_estudiante, id_materia, fecha)
);

-- 11. AVISOS (id_materia_maestro_grupo vacío = aviso general del director)
CREATE TABLE IF NOT EXISTS avisos (
  id                        BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  id_autor                  BIGINT NOT NULL REFERENCES usuarios(id),
  id_materia_maestro_grupo  BIGINT REFERENCES materia_maestro_grupo(id),
  titulo                    VARCHAR(150) NOT NULL,
  subtitulo                 VARCHAR(200),
  cuerpo                    TEXT NOT NULL,
  fecha_publicacion         TIMESTAMPTZ NOT NULL DEFAULT now(),
  fecha_evento              TIMESTAMPTZ
);

-- ÍNDICES en llaves foráneas que se consultan seguido
CREATE INDEX IF NOT EXISTS idx_estudiantes_grupo   ON estudiantes(id_grupo);
CREATE INDEX IF NOT EXISTS idx_est_padre_padre     ON estudiante_padre(id_padre);
CREATE INDEX IF NOT EXISTS idx_mmg_grupo           ON materia_maestro_grupo(id_grupo);
CREATE INDEX IF NOT EXISTS idx_asistencia_fecha    ON asistencia(id_estudiante, fecha);
CREATE INDEX IF NOT EXISTS idx_calif_estudiante    ON calificaciones(id_estudiante);
CREATE INDEX IF NOT EXISTS idx_avisos_destino      ON avisos(id_materia_maestro_grupo, fecha_publicacion DESC);