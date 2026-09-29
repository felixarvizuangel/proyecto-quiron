import { useState, type FormEvent } from 'react';
import { api } from '../api';
import { useSesion, type Rol } from '../sesion';

interface RespuestaLogin {
  token: string;
  rol: string;
}

// El panel es solo para el personal. Las familias y los estudiantes usan la app móvil.
function esRolDelPanel(rol: string): rol is Rol {
  return rol === 'director' || rol === 'maestro';
}

export function Login() {
  const { iniciar } = useSesion();
  const [correo, setCorreo] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  async function iniciarSesion(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setError('');
    setCargando(true);
    try {
      const datos = await api<RespuestaLogin>('/auth/login', {
        metodo: 'POST',
        cuerpo: { correo, password },
      });
      if (!esRolDelPanel(datos.rol)) {
        setError('Este panel es para directivos y maestros. Las familias usan la app móvil.');
        return;
      }
      iniciar(datos.token, datos.rol);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo iniciar sesión');
    } finally {
      setCargando(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <form
        onSubmit={iniciarSesion}
        className="w-full max-w-sm space-y-5 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm"
      >
        <div className="space-y-1 text-center">
          <h1 className="text-2xl font-semibold text-slate-800">Quirón</h1>
          <p className="text-sm text-slate-500">Panel para directivos y maestros</p>
        </div>

        <label className="block space-y-1">
          <span className="text-sm font-medium text-slate-700">Correo</span>
          <input
            type="email"
            required
            autoComplete="email"
            value={correo}
            onChange={(e) => setCorreo(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
          />
        </label>

        <label className="block space-y-1">
          <span className="text-sm font-medium text-slate-700">Contraseña</span>
          <input
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
          />
        </label>

        {error && (
          <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={cargando}
          className="w-full rounded-lg bg-indigo-600 py-2 font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
        >
          {cargando ? 'Entrando…' : 'Iniciar sesión'}
        </button>
      </form>
    </main>
  );
}