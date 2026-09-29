import { useApi } from '../useApi';

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
      {error && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}
      {asignaciones?.length === 0 && (
        <p className="text-slate-500">
          Todavía no tienes grupos asignados. El Director los asigna desde su panel.
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {asignaciones?.map((a) => (
          <article key={a.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">{a.grupo}</p>
            <h2 className="text-lg font-medium text-slate-800">{a.materia}</h2>
          </article>
        ))}
      </div>
    </section>
  );
}