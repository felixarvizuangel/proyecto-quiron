import { Link } from 'react-router';
import { useApi } from '../useApi';
import { MensajeError } from '../componentes/Formulario';

interface Asignacion {
  id: number;
  materia: string;
  grupo: string;
}

export function MisGrupos() {
  const { datos: asignaciones, error, cargando } = useApi<Asignacion[]>('/asignaciones/mias');

  return (
    <section className="space-y-6">
      <h1 className="text-2xl font-semibold text-slate-800">Mis grupos</h1>

      {cargando && <p className="text-slate-500">Cargando…</p>}
      <MensajeError texto={error} />
      {asignaciones?.length === 0 && (
        <p className="text-slate-500">
          Todavía no tienes grupos asignados. El Director los asigna desde su panel.
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {asignaciones?.map((a) => (
          <article
            key={a.id}
            className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <div>
              <p className="text-sm text-slate-500">{a.grupo}</p>
              <h2 className="text-lg font-medium text-slate-800">{a.materia}</h2>
            </div>
            <Link
              to={`/mis-grupos/${a.id}/lista`}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-center text-sm font-medium text-white hover:bg-indigo-700"
            >
              Pasar lista
            </Link>
          </article>
        ))}
      </div>
    </section>
  );
}