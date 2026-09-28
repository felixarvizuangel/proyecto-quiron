import argon2 from 'argon2';

// Convierte una contraseña en texto plano en un hash que se guarda en la base.
// El hash incluye la "sal" (datos aleatorios) adentro, no hace falta guardarla aparte.
export function cifrarPassword(password: string): Promise<string> {
  return argon2.hash(password);
}

// Compara la contraseña que escribió la persona contra el hash guardado.
// Nunca se descifra el hash: se cifra la nueva y se comparan los resultados.
export function verificarPassword(hash: string, password: string): Promise<boolean> {
  return argon2.verify(hash, password);
}