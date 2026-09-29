import { rateLimit } from 'express-rate-limit';

// Frenan a quien intenta adivinar: contraseñas en el login y códigos familiares
// en la vinculación. Solo cuentan los intentos fallidos, así que quien escribe
// bien sus datos nunca se topa con el límite.
// Nota: el contador vive en memoria. Con varias copias de la API en producción
// se movería a Redis, para que todas compartan la misma cuenta.
export const limiteLogin = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skipSuccessfulRequests: true,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Demasiados intentos fallidos. Espera 15 minutos e inténtalo de nuevo.' },
});

export const limiteVinculacion = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skipSuccessfulRequests: true,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Demasiados códigos incorrectos. Espera 15 minutos e inténtalo de nuevo.' },
});