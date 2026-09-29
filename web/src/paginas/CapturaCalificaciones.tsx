import { useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router';
import { api } from '../api';
import { useApi } from '../useApi';
import { MensajeError } from '../componentes/Formulario';

interface FilaCalificacion {
  id: number;
  nombre: string;
  matricula: string;
  calificacion: number | null;
}

interface RespuestaCaptura {
  materia: string;
  grupo: string;
  parcial: number;
  minima: number;
  estudiantes: FilaCalificacion[];
}

// Parciales del periodo. Si la escuela maneja otra cantidad, basta con cambiar esta lista.
const PARCIALES = [1, 2, 3];

export function CapturaCalificaciones() {
  const { idAsignacion } = useParams();
  const [parcial, setParcial] = useState(1);
  const { datos, error } = useApi<RespuestaCaptura>(
    `/calificaciones/asignacion/${idAsignacion}?parcial=${parcial}`,
  );

  return (
    <section className="space-y-6">
      <Link to="/mis-grupos" className="text-sm text-indigo-700 hover:underline">
        ← Mis grupos
      </Link>

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">Calificaciones</h1>
          {datos && (
            <p className="text-slate-500">
              {datos.materia} · {datos.grupo}
            </p>
          )}
        </div>
        <div className="flex gap-1" role="group" aria-label="Parcial">
          {PARCIALES.map((p) => (
            <button
              key={p}
              type="button"
              aria-pressed={parcial === p}
              onClick={() => setParcial(p)}
              className={`rounded-lg border px-3 py-1.5 text-sm ${
                parcial === p
                  ? 'border-indigo-600 bg-indigo-600 text-white'
                  : 'border-slate-300 text-slate-600 hover:bg-slate-100'
              }`}
            >
              Parcial {p}
            </button>
          ))}
        </div>
      </div>

      <MensajeError texto={error} />
      {!error && datos?.parcial !== parcial && <p className="text-slate-500">Cargando…</p>}

      {/* La captura se vuelve a crear con cada parcial, para empezar con los datos de ese parcial. */}
      {datos && datos.parcial === parcial && (
        <CapturaDelParcial
          key={parcial}
          idAsignacion={Number(idAsignacion)}
          parcial={parcial}
          minima={datos.minima}
          estudiantes={datos.estudiantes}
        />
      )}
    </section>
  );
}

interface CapturaProps {
  idAsignacion: number;
  parcial: number;
  minima: number;
  estudiantes: FilaCalificacion[];
}

function CapturaDelParcial({ idAsignacion, parcial, minima, estudiantes }: CapturaProps) {
  // Se guardan como texto para poder escribir "8." sin que el campo se borre.
  const [valores, setValores] = useState<Record<number, string>>(() =>
    Object.fromEntries(
      estudiantes.map((e) => [e.id, e.calificacion === null ? '' : String(e.calificacion)]),
    ),
  );
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');

  const capturadas = Object.values(valores).filter((v) => v.trim() !== '').length;

  function cambiar(id: number, valor: string) {
    setValores((actual) => ({ ...actual, [id]: valor }));
    setMensaje('');
  }

  async function guardar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setError('');
    setMensaje('');

    // Los campos vacíos no se envían: el grupo se puede capturar por partes.
    const registros = estudiantes
      .filter((e) => valores[e.id].trim() !== '')
      .map((e) => ({ idEstudiante: e.id, calificacion: Number(valores[e.id]) }));
    if (registros.length === 0) {
      setError('Escribe al menos una calificación.');
      return;
    }

    setGuardando(true);
    try {
      const respuesta = await api<{ guardadas: number }>('/calificaciones/lista', {
        metodo: 'POST',
        cuerpo: { idAsignacion, parcial, registros },
      });
      setMensaje(`Calificaciones guardadas: ${respuesta.guardadas}.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudieron guardar las calificaciones');
    } finally {
      setGuardando(false);
    }
  }

  if (estudiantes.length === 0) {
    return <p className="text-slate-500">Este grupo todavía no tiene estudiantes.</p>;
  }

  return (
    <form onSubmit={guardar} className="space-y-4">
      <p className="text-sm text-slate-500">Calificación mínima aprobatoria: {minima}</p>

      <ul className="divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white shadow-sm">
        {estudiantes.map((est) => {
          const valor = valores[est.id];
          const numero = Number(valor);
          const valida = valor.trim() !== '' && numero >= 0 && numero <= 10;
          return (
            <li key={est.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div>
                <p className="text-slate-800">{est.nombre}</p>
                <p className="text-xs text-slate-500">{est.matricula}</p>
              </div>
              <div className="flex items-center gap-3">
                {valida && (
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      numero >= minima ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                    }`}
                  >
                    {numero >= minima ? 'Aprobado' : 'No aprobado'}
                  </span>
                )}
                <input
                  type="number"
                  inputMode="decimal"
                  min={0}
                  max={10}
                  step="any"
                  aria-label={`Calificación de ${est.nombre}`}
                  value={valor}
                  onChange={(e) => cambiar(est.id, e.target.value)}
                  className="w-24 rounded-lg border border-slate-300 px-3 py-2 text-right outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                />
              </div>
            </li>
          );
        })}
      </ul>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-600">
          Capturadas: {capturadas} de {estudiantes.length}
        </p>
        <button
          type="submit"
          disabled={guardando}
          className="rounded-lg bg-indigo-600 px-5 py-2 font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
        >
          {guardando ? 'Guardando…' : 'Guardar calificaciones'}
        </button>
      </div>

      <MensajeError texto={error} />
      {mensaje && (
        <p role="status" className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {mensaje}
        </p>
      )}
    </form>
  );
}