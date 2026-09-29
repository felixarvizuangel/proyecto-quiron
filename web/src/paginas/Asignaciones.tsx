import { useState, type FormEvent } from 'react';
import { api } from '../api';
import { useApi } from '../useApi';
import { MensajeError, Selector } from '../componentes/Formulario';

interface Asignacion {
  id: number;
  maestro: string;
  materia: string;
  grupo: string;
}

interface Opcion {
  id: number;
  nombre: string;
}

const VACIO = { idMaestro: '', idMateria: '', idGrupo: '' };

export function Asignaciones() {
  const { datos: asignaciones, error, cargando, recargar } = useApi<Asignacion[]>('/asignaciones');
  const { datos: maestros } = useApi<Opcion[]>('/maestros');
  const { datos: materias } = useApi<Opcion[]>('/materias');
  const { datos: grupos } = useApi<Opcion[]>('/grupos');

  const [formulario, setFormulario] = useState(VACIO);
  const [errorAccion, setErrorAccion] = useState('');
  const [guardando, setGuardando] = useState(false);

  function cambiar(campo: keyof typeof VACIO, valor: string) {
    setFormulario((actual) => ({ ...actual, [campo]: valor }));
  }

  async function asignar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setErrorAccion('');
    setGuardando(true);
    try {
      await api('/asignaciones', {
        metodo: 'POST',
        cuerpo: {
          idMaestro: Number(formulario.idMaestro),
          idMateria: Number(formulario.idMateria),
          idGrupo: Number(formulario.idGrupo),
        },
      });
      setFormulario(VACIO);
      recargar();
    } catch (e) {
      setErrorAccion(e instanceof Error ? e.message : 'No se pudo crear la asignación');
    } finally {
      setGuardando(false);
    }
  }

  async function quitar(a: Asignacion) {
    const confirmado = window.confirm(
      `¿Quitar ${a.materia} de ${a.grupo} a ${a.maestro}? La asistencia y las calificaciones ya capturadas se conservan.`,
    );
    if (!confirmado) return;
    setErrorAccion('');
    try {
      await api(`/asignaciones/${a.id}`, { metodo: 'DELETE' });
      recargar();
    } catch (e) {
      setErrorAccion(e instanceof Error ? e.message : 'No se pudo quitar la asignación');
    }
  }

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-800">Asignaciones</h1>
        <p className="text-slate-500">
          Qué maestro da qué materia a qué grupo. Un maestro solo puede pasar lista y calificar en lo que
          tiene asignado.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-3">
          {cargando && <p className="text-slate-500">Cargando…</p>}
          <MensajeError texto={error || errorAccion} />

          {asignaciones && (
            <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-medium">Grupo</th>
                    <th className="px-4 py-3 font-medium">Materia</th>
                    <th className="px-4 py-3 font-medium">Maestro</th>
                    <th className="px-4 py-3">
                      <span className="sr-only">Acciones</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {asignaciones.map((a) => (
                    <tr key={a.id}>
                      <td className="px-4 py-3 text-slate-800">{a.grupo}</td>
                      <td className="px-4 py-3 text-slate-600">{a.materia}</td>
                      <td className="px-4 py-3 text-slate-600">{a.maestro}</td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => quitar(a)}
                          className="text-sm text-red-600 hover:underline"
                        >
                          Quitar
                        </button>
                      </td>
                    </tr>
                  ))}
                  {asignaciones.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-4 py-6 text-center text-slate-500">
                        Aún no hay asignaciones.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <form
          onSubmit={asignar}
          className="h-fit space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
        >
          <h2 className="font-medium text-slate-800">Nueva asignación</h2>
          <Selector
            etiqueta="Maestro"
            required
            value={formulario.idMaestro}
            onChange={(e) => cambiar('idMaestro', e.target.value)}
          >
            <option value="">Elige un maestro</option>
            {maestros?.map((m) => (
              <option key={m.id} value={m.id}>
                {m.nombre}
              </option>
            ))}
          </Selector>
          <Selector
            etiqueta="Materia"
            required
            value={formulario.idMateria}
            onChange={(e) => cambiar('idMateria', e.target.value)}
          >
            <option value="">Elige una materia</option>
            {materias?.map((m) => (
              <option key={m.id} value={m.id}>
                {m.nombre}
              </option>
            ))}
          </Selector>
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
          <button
            type="submit"
            disabled={guardando}
            className="w-full rounded-lg bg-indigo-600 py-2 font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
          >
            {guardando ? 'Guardando…' : 'Asignar'}
          </button>
        </form>
      </div>
    </section>
  );
}