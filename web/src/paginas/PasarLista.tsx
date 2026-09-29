import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { api } from '../api';
import { useApi } from '../useApi';
import { MensajeError } from '../componentes/Formulario';

type Estado = 'presente' | 'retardo' | 'ausente';

interface FilaLista {
  id: number;
  nombre: string;
  matricula: string;
  estado: Estado | null;
  justificacion: string | null;
}

interface RespuestaLista {
  materia: string;
  grupo: string;
  fecha: string;
  estudiantes: FilaLista[];
}

interface Marca {
  estado: Estado;
  justificacion: string;
}

// Color y texto juntos: el estado nunca depende solo del color.
const OPCIONES: { valor: Estado; texto: string; activo: string }[] = [
  { valor: 'presente', texto: 'Presente', activo: 'border-emerald-600 bg-emerald-600 text-white' },
  { valor: 'retardo', texto: 'Retardo', activo: 'border-amber-500 bg-amber-500 text-white' },
  { valor: 'ausente', texto: 'Ausente', activo: 'border-red-600 bg-red-600 text-white' },
];

// Fecha de hoy en la zona horaria del navegador, en formato AAAA-MM-DD.
function hoyLocal() {
  return new Date().toLocaleDateString('en-CA');
}

export function PasarLista() {
  const { idAsignacion } = useParams();
  const [fecha, setFecha] = useState(hoyLocal);
  const { datos, error } = useApi<RespuestaLista>(`/asistencia/asignacion/${idAsignacion}?fecha=${fecha}`);

  return (
    <section className="space-y-6">
      <Link to="/mis-grupos" className="text-sm text-indigo-700 hover:underline">
        ← Mis grupos
      </Link>

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">Pasar lista</h1>
          {datos && (
            <p className="text-slate-500">
              {datos.materia} · {datos.grupo}
            </p>
          )}
        </div>
        <label className="space-y-1">
          <span className="block text-sm font-medium text-slate-700">Fecha</span>
          <input
            type="date"
            value={fecha}
            max={hoyLocal()}
            onChange={(e) => e.target.value && setFecha(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
          />
        </label>
      </div>

      <MensajeError texto={error} />
      {!error && datos?.fecha !== fecha && <p className="text-slate-500">Cargando…</p>}

      {/* La lista se vuelve a crear con cada fecha, para empezar con las marcas de ese día. */}
      {datos && datos.fecha === fecha && (
        <ListaDelDia
          key={fecha}
          idAsignacion={Number(idAsignacion)}
          fecha={fecha}
          estudiantes={datos.estudiantes}
        />
      )}
    </section>
  );
}

interface ListaProps {
  idAsignacion: number;
  fecha: string;
  estudiantes: FilaLista[];
}

function ListaDelDia({ idAsignacion, fecha, estudiantes }: ListaProps) {
  // Quien no tiene registro ese día empieza como presente: el maestro solo marca las excepciones.
  const [marcas, setMarcas] = useState<Record<number, Marca>>(() =>
    Object.fromEntries(
      estudiantes.map((e) => [e.id, { estado: e.estado ?? 'presente', justificacion: e.justificacion ?? '' }]),
    ),
  );
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');
  const yaSeHabiaGuardado = estudiantes.some((e) => e.estado !== null);

  function marcar(id: number, cambio: Partial<Marca>) {
    setMarcas((actual) => ({ ...actual, [id]: { ...actual[id], ...cambio } }));
    setMensaje('');
  }

  const conteo = Object.values(marcas).reduce(
    (total, m) => ({ ...total, [m.estado]: total[m.estado] + 1 }),
    { presente: 0, retardo: 0, ausente: 0 } as Record<Estado, number>,
  );

  async function guardar() {
    setError('');
    setMensaje('');
    setGuardando(true);
    try {
      const respuesta = await api<{ guardados: number }>('/asistencia/lista', {
        metodo: 'POST',
        cuerpo: {
          idAsignacion,
          fecha,
          registros: estudiantes.map((e) => ({
            idEstudiante: e.id,
            estado: marcas[e.id].estado,
            justificacion:
              marcas[e.id].estado === 'presente' ? undefined : marcas[e.id].justificacion || undefined,
          })),
        },
      });
      setMensaje(`Lista guardada: ${respuesta.guardados} estudiantes.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar la lista');
    } finally {
      setGuardando(false);
    }
  }

  if (estudiantes.length === 0) {
    return <p className="text-slate-500">Este grupo todavía no tiene estudiantes.</p>;
  }

  return (
    <div className="space-y-4">
      {yaSeHabiaGuardado && (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Esta lista ya se había guardado. Puedes corregirla y volver a guardar.
        </p>
      )}

      <ul className="divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white shadow-sm">
        {estudiantes.map((est) => {
          const marca = marcas[est.id];
          return (
            <li key={est.id} className="space-y-3 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-slate-800">{est.nombre}</p>
                  <p className="text-xs text-slate-500">{est.matricula}</p>
                </div>
                <div className="flex gap-1" role="group" aria-label={`Asistencia de ${est.nombre}`}>
                  {OPCIONES.map((opcion) => (
                    <button
                      key={opcion.valor}
                      type="button"
                      aria-pressed={marca.estado === opcion.valor}
                      onClick={() => marcar(est.id, { estado: opcion.valor })}
                      className={`rounded-lg border px-3 py-1.5 text-sm ${
                        marca.estado === opcion.valor
                          ? opcion.activo
                          : 'border-slate-300 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {opcion.texto}
                    </button>
                  ))}
                </div>
              </div>
              {marca.estado !== 'presente' && (
                <input
                  type="text"
                  placeholder="Justificación (opcional)"
                  maxLength={500}
                  value={marca.justificacion}
                  onChange={(e) => marcar(est.id, { justificacion: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                />
              )}
            </li>
          );
        })}
      </ul>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-600">
          Presentes: {conteo.presente} · Retardos: {conteo.retardo} · Ausentes: {conteo.ausente}
        </p>
        <button
          type="button"
          onClick={guardar}
          disabled={guardando}
          className="rounded-lg bg-indigo-600 px-5 py-2 font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
        >
          {guardando ? 'Guardando…' : 'Guardar lista'}
        </button>
      </div>

      <MensajeError texto={error} />
      {mensaje && (
        <p role="status" className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {mensaje}
        </p>
      )}
    </div>
  );
}