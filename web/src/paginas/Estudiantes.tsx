import { useState, type FormEvent } from 'react';
import { api } from '../api';
import { useApi } from '../useApi';
import { Entrada, MensajeError, Selector } from '../componentes/Formulario';

interface Estudiante {
  id: number;
  nombre: string;
  matricula: string;
  grupo: string;
  correo: string;
  codigo_parental: string;
}

interface Grupo {
  id: number;
  nombre: string;
}

interface Creado {
  nombre: string;
  codigo_parental: string;
}

const VACIO = { nombre: '', matricula: '', idGrupo: '', correo: '', password: '' };

export function Estudiantes() {
  const { datos: estudiantes, error, cargando, recargar } = useApi<Estudiante[]>('/estudiantes');
  const { datos: grupos } = useApi<Grupo[]>('/grupos');

  const [formulario, setFormulario] = useState(VACIO);
  const [errorAlta, setErrorAlta] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [creado, setCreado] = useState<Creado | null>(null);

  function cambiar(campo: keyof typeof VACIO, valor: string) {
    setFormulario((actual) => ({ ...actual, [campo]: valor }));
  }

  async function darDeAlta(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setErrorAlta('');
    setCreado(null);
    setGuardando(true);
    try {
      const nuevo = await api<Creado>('/estudiantes', {
        metodo: 'POST',
        cuerpo: { ...formulario, idGrupo: Number(formulario.idGrupo) },
      });
      setCreado(nuevo);
      setFormulario(VACIO);
      recargar();
    } catch (e) {
      setErrorAlta(e instanceof Error ? e.message : 'No se pudo dar de alta');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <section className="space-y-6">
      <h1 className="text-2xl font-semibold text-slate-800">Estudiantes</h1>

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-3">
          {cargando && <p className="text-slate-500">Cargando…</p>}
          <MensajeError texto={error} />

          {estudiantes && (
            <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-medium">Nombre</th>
                    <th className="px-4 py-3 font-medium">Matrícula</th>
                    <th className="px-4 py-3 font-medium">Grupo</th>
                    <th className="px-4 py-3 font-medium">Código familiar</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {estudiantes.map((est) => (
                    <tr key={est.id}>
                      <td className="px-4 py-3">
                        <p className="text-slate-800">{est.nombre}</p>
                        <p className="text-xs text-slate-500">{est.correo}</p>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{est.matricula}</td>
                      <td className="px-4 py-3 text-slate-600">{est.grupo}</td>
                      <td className="px-4 py-3 font-mono text-slate-700">{est.codigo_parental}</td>
                    </tr>
                  ))}
                  {estudiantes.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-4 py-6 text-center text-slate-500">
                        Aún no hay estudiantes registrados.
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
            etiqueta="Matrícula"
            required
            value={formulario.matricula}
            onChange={(e) => cambiar('matricula', e.target.value)}
          />
          <Selector
            etiqueta="Grupo"
            required
            value={formulario.idGrupo}
            onChange={(e) => cambiar('idGrupo', e.target.value)}
          >
            <option value="">Elige un grupo</option>
            {grupos?.map((g) => (
              <option key={g.id} value={g.id}>
                {g.nombre}
              </option>
            ))}
          </Selector>
          <Entrada
            etiqueta="Correo del estudiante"
            type="email"
            required
            autoComplete="off"
            value={formulario.correo}
            onChange={(e) => cambiar('correo', e.target.value)}
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
            <div role="status" className="space-y-1 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
              <p>{creado.nombre} quedó dado de alta.</p>
              <p>
                Código para la familia:{' '}
                <span className="font-mono font-semibold">{creado.codigo_parental}</span>
              </p>
            </div>
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