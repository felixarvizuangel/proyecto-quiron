import { useState, type FormEvent } from 'react';
import { api } from '../api';
import { useApi } from '../useApi';
import { Entrada, MensajeError } from '../componentes/Formulario';

interface Maestro {
  id: number;
  nombre: string;
  telefono: string | null;
  correo: string;
  activo: boolean;
}

const VACIO = { nombre: '', correo: '', telefono: '', password: '' };

export function Maestros() {
  const [verBajas, setVerBajas] = useState(false);
  const { datos: maestros, error, cargando, recargar } = useApi<Maestro[]>(
    verBajas ? '/maestros?bajas=1' : '/maestros',
  );

  const [formulario, setFormulario] = useState(VACIO);
  const [errorAlta, setErrorAlta] = useState('');
  const [errorAccion, setErrorAccion] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [creado, setCreado] = useState('');

  function cambiar(campo: keyof typeof VACIO, valor: string) {
    setFormulario((actual) => ({ ...actual, [campo]: valor }));
  }

  async function darDeAlta(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setErrorAlta('');
    setCreado('');
    setGuardando(true);
    try {
      const nuevo = await api<{ nombre: string }>('/maestros', {
        metodo: 'POST',
        cuerpo: {
          nombre: formulario.nombre,
          correo: formulario.correo,
          password: formulario.password,
          telefono: formulario.telefono.trim() || undefined,
        },
      });
      setCreado(`Listo: ${nuevo.nombre} ya tiene cuenta. Puede entrar con su correo y la contraseña inicial.`);
      setFormulario(VACIO);
      recargar();
    } catch (e) {
      setErrorAlta(e instanceof Error ? e.message : 'No se pudo dar de alta');
    } finally {
      setGuardando(false);
    }
  }

  async function cambiarEstado(maestro: Maestro, activo: boolean) {
    const confirmado =
      activo ||
      window.confirm(
        `¿Dar de baja a ${maestro.nombre}? Ya no podrá entrar al sistema. Sus asignaciones y lo que capturó se conservan.`,
      );
    if (!confirmado) return;
    setErrorAccion('');
    try {
      await api(`/maestros/${maestro.id}/estado`, { metodo: 'PATCH', cuerpo: { activo } });
      recargar();
    } catch (e) {
      setErrorAccion(e instanceof Error ? e.message : 'No se pudo cambiar el estado');
    }
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-slate-800">Maestros</h1>
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={verBajas}
            onChange={(e) => setVerBajas(e.target.checked)}
            className="size-4 rounded border-slate-300"
          />
          Mostrar dados de baja
        </label>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-3">
          {cargando && <p className="text-slate-500">Cargando…</p>}
          <MensajeError texto={error || errorAccion} />

          {maestros && (
            <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-medium">Nombre</th>
                    <th className="px-4 py-3 font-medium">Teléfono</th>
                    <th className="px-4 py-3">
                      <span className="sr-only">Acciones</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {maestros.map((m) => (
                    <tr key={m.id} className={m.activo ? '' : 'bg-slate-50'}>
                      <td className="px-4 py-3">
                        <p className={m.activo ? 'text-slate-800' : 'text-slate-500'}>
                          {m.nombre}
                          {!m.activo && (
                            <span className="ml-2 rounded-full bg-slate-200 px-2 py-0.5 text-xs text-slate-600">
                              Baja
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-slate-500">{m.correo}</p>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{m.telefono ?? '—'}</td>
                      <td className="px-4 py-3 text-right">
                        {m.activo ? (
                          <button
                            type="button"
                            onClick={() => cambiarEstado(m, false)}
                            className="whitespace-nowrap text-sm text-red-600 hover:underline"
                          >
                            Dar de baja
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => cambiarEstado(m, true)}
                            className="text-sm text-indigo-700 hover:underline"
                          >
                            Reactivar
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {maestros.length === 0 && (
                    <tr>
                      <td colSpan={3} className="px-4 py-6 text-center text-slate-500">
                        Aún no hay maestros registrados.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <form
          onSubmit={darDeAlta}
          className="h-fit space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
        >
          <h2 className="font-medium text-slate-800">Dar de alta</h2>
          <Entrada
            etiqueta="Nombre completo"
            required
            value={formulario.nombre}
            onChange={(e) => cambiar('nombre', e.target.value)}
          />
          <Entrada
            etiqueta="Correo"
            type="email"
            required
            autoComplete="off"
            value={formulario.correo}
            onChange={(e) => cambiar('correo', e.target.value)}
          />
          <Entrada
            etiqueta="Teléfono (opcional)"
            type="tel"
            value={formulario.telefono}
            onChange={(e) => cambiar('telefono', e.target.value)}
          />
          <Entrada
            etiqueta="Contraseña inicial"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            value={formulario.password}
            onChange={(e) => cambiar('password', e.target.value)}
          />

          <MensajeError texto={errorAlta} />
          {creado && (
            <p role="status" className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
              {creado}
            </p>
          )}

          <button
            type="submit"
            disabled={guardando}
            className="w-full rounded-lg bg-indigo-600 py-2 font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
          >
            {guardando ? 'Guardando…' : 'Dar de alta'}
          </button>
        </form>
      </div>
    </section>
  );
}