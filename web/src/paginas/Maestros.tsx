import { useApi } from '../useApi';

interface Maestro {
  id: number;
  nombre: string;
  telefono: string | null;
}

export function Maestros() {
  const { datos: maestros, error, cargando } = useApi<Maestro[]>('/maestros');

  return (
    <section className="space-y-6">
      <h1 className="text-2xl font-semibold text-slate-800">Maestros</h1>

      {cargando && <p className="text-slate-500">Cargando…</p>}
      {error && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {maestros && (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Nombre</th>
                <th className="px-4 py-3 font-medium">Teléfono</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {maestros.map((m) => (
                <tr key={m.id}>
                  <td className="px-4 py-3 text-slate-800">{m.nombre}</td>
                  <td className="px-4 py-3 text-slate-500">{m.telefono ?? '—'}</td>
                </tr>
              ))}
              {maestros.length === 0 && (
                <tr>
                  <td colSpan={2} className="px-4 py-6 text-center text-slate-500">
                    Aún no hay maestros registrados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}