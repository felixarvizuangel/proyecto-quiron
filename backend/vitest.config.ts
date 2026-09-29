import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Prepara la base de pruebas una sola vez, antes de todo.
    globalSetup: './test/preparar-base.ts',
    // Las pruebas usan su propia base y una mínima fija, sin importar tu .env.
    env: {
      POSTGRES_DB: 'quiron_test',
      CALIFICACION_MINIMA: '6',
    },
    // Los archivos comparten la misma base, así que se ejecutan uno por uno.
    fileParallelism: false,
  },
});