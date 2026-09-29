// Todas las llamadas a la API pasan por aquí: agrega el token
// y convierte los errores del servidor en mensajes legibles.
const BASE = '/api';

interface Opciones {
  metodo?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  cuerpo?: unknown;
}

export async function api<T>(ruta: string, { metodo = 'GET', cuerpo }: Opciones = {}): Promise<T> {
  const token = sessionStorage.getItem('token');

  const respuesta = await fetch(`${BASE}${ruta}`, {
    method: metodo,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
  });

  // Si mandamos un token y la API lo rechaza, venció o es inválido:
  // se avisa a toda la app para que cierre la sesión.
  if (respuesta.status === 401 && token) {
    window.dispatchEvent(new Event('sesion-expirada'));
  }

  const datos = await respuesta.json().catch(() => ({}));
  if (!respuesta.ok) {
    throw new Error(datos.error ?? 'No se pudo conectar con el servidor');
  }
  return datos as T;
}