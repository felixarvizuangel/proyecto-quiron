CREATE TABLE usuarios (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  correo        VARCHAR(255) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  rol           VARCHAR(20) NOT NULL
                CHECK (rol IN ('director','maestro','estudiante','padre','psicologo')),
  activo        BOOLEAN NOT NULL DEFAULT TRUE,
  creado_en     TIMESTAMPTZ NOT NULL DEFAULT now()
);