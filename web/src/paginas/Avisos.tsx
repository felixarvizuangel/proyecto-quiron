import { useState, type FormEvent } from 'react';
import { api } from '../api';
import { useApi } from '../useApi';
import { useSesion } from '../sesion';
import { AreaTexto, Entrada, MensajeError, Selector } from '../componentes/Formulario';

interface Aviso {
  id: number;
  titulo: string;
  subtitulo: string | null;
  cuerpo: string;
  fecha_publicacion: string;
  fecha_evento: string | null;
  general: boolean;
  destino: string | null;
  autor: string;
  propio: boolean;
}

interface AsignacionPropia {
  id: number;
  materia: string;
  grupo: string;
}

function formatoFecha(iso: string) {
  return new Date(iso).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' });
}

export function Avisos() {
  const { rol } = useSesion();
  const { datos: avisos, error, cargando, recargar } = useApi<Aviso[]>('/avisos');
  const [errorAccion, setErrorAccion] = useState('');

  async function borrar(aviso: Aviso) {
    if (!window.confirm(`¿Borrar el aviso "${aviso.titulo}"? Dejará de verse para todos.`)) return;
    setErrorAccion('');
    try {
      await api(`/avisos/${aviso.id}`, { metodo: 'DELETE' });
      recargar();
    } catch (e) {
      setErrorAccion(e instanceof Error ? e.message : 'No se pudo borrar el aviso');
    }
  }

  return (
    <section className="space-y-6">
      <h1 className="text-2xl font-semibold text-slate-800">Avisos</h1>

      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <div className="space-y-4">
          {cargando && <p className="text-slate-500">Cargando…</p>}
          <MensajeError texto={error || errorAccion} />
          {avisos?.length === 0 && <p className="text-slate-500">Todavía no hay avisos publicados.</p>}

          {avisos?.map((aviso) => (
            <article
              key={aviso.id}
              className="space-y-2 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    aviso.general ? 'bg-indigo-50 text-indigo-700' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {aviso.general ? 'Toda la escuela' : aviso.destino}
                </span>
                <span className="text-xs text-slate-500">
                  {aviso.autor} · {formatoFecha(aviso.fecha_publicacion)}
                </span>
              </div>
              <h2 className="text-lg font-medium text-slate-800">{aviso.titulo}</h2>
              {aviso.subtitulo && <p className="text-sm text-slate-600">{aviso.subtitulo}</p>}
              <p className="whitespace-pre-line text-sm text-slate-700">{aviso.cuerpo}</p>
              {aviso.fecha_evento && (
                <p className="text-sm text-slate-600">Fecha del evento: {formatoFecha(aviso.fecha_evento)}</p>
              )}
              {(aviso.propio || rol === 'director') && (
                <div className="text-right">
                  <button
                    type="button"
                    onClick={() => borrar(aviso)}
                    className="text-sm text-red-600 hover:underline"
                  >
                    Borrar
                  </button>
                </div>
              )}
            </article>
          ))}
        </div>

        {rol === 'director' ? (
          <FormularioAviso alPublicar={recargar} />
        ) : (
          <PublicarDeGrupo alPublicar={recargar} />
        )}
      </div>
    </section>
  );
}

// El maestro solo puede publicar en sus propias asignaciones: se cargan aquí para el selector.
function PublicarDeGrupo({ alPublicar }: { alPublicar: () => void }) {
  const { datos: asignaciones } = useApi<AsignacionPropia[]>('/asignaciones/mias');
  return <FormularioAviso asignaciones={asignaciones ?? []} alPublicar={alPublicar} />;
}

const VACIO = { idAsignacion: '', titulo: '', subtitulo: '', cuerpo: '', fechaEvento: '' };

interface FormularioProps {
  asignaciones?: AsignacionPropia[]; // solo llega para maestros
  alPublicar: () => void;
}

function FormularioAviso({ asignaciones, alPublicar }: FormularioProps) {
  const [formulario, setFormulario] = useState(VACIO);
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [guardando, setGuardando] = useState(false);

  function cambiar(campo: keyof typeof VACIO, valor: string) {
    setFormulario((actual) => ({ ...actual, [campo]: valor }));
    setMensaje('');
  }

  async function publicar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setError('');
    setMensaje('');
    setGuardando(true);
    try {
      const datos = {
        titulo: formulario.titulo.trim(),
        subtitulo: formulario.subtitulo.trim() || undefined,
        cuerpo: formulario.cuerpo.trim(),
        // datetime-local no trae zona horaria: el navegador la toma como hora local
        // y toISOString la convierte a UTC, que es lo que espera la API.
        fechaEvento: formulario.fechaEvento ? new Date(formulario.fechaEvento).toISOString() : undefined,
        ...(asignaciones ? { idAsignacion: Number(formulario.idAsignacion) } : {}),
      };
      await api(asignaciones ? '/avisos/grupo' : '/avisos/general', { metodo: 'POST', cuerpo: datos });
      setFormulario(VACIO);
      setMensaje('Aviso publicado.');
      alPublicar();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo publicar el aviso');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <form
      onSubmit={publicar}
      className="h-fit space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
    >
      <h2 className="font-medium text-slate-800">Publicar aviso</h2>

      {asignaciones ? (
        <Selector
          etiqueta="Para"
          required
          value={formulario.idAsignacion}
          onChange={(e) => cambiar('idAsignacion', e.target.value)}
        >
          <option value="">Elige grupo y materia</option>
          {asignaciones.map((a) => (
            <option key={a.id} value={a.id}>
              {a.materia} · {a.grupo}
            </option>
          ))}
        </Selector>
      ) : (
        <p className="text-sm text-slate-600">
          Para: <strong>toda la escuela</strong>
        </p>
      )}

      <Entrada
        etiqueta="Título"
        required
        maxLength={150}
        value={formulario.titulo}
        onChange={(e) => cambiar('titulo', e.target.value)}
      />
      <Entrada
        etiqueta="Subtítulo (opcional)"
        maxLength={200}
        value={formulario.subtitulo}
        onChange={(e) => cambiar('subtitulo', e.target.value)}
      />
      <AreaTexto
        etiqueta="Mensaje"
        required
        rows={5}
        value={formulario.cuerpo}
        onChange={(e) => cambiar('cuerpo', e.target.value)}
      />
      <Entrada
        etiqueta="Fecha del evento (opcional)"
        type="datetime-local"
        value={formulario.fechaEvento}
        onChange={(e) => cambiar('fechaEvento', e.target.value)}
      />

      <MensajeError texto={error} />
      {mensaje && (
        <p role="status" className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {mensaje}
        </p>
      )}

      <button
        type="submit"
        disabled={guardando}
        className="w-full rounded-lg bg-indigo-600 py-2 font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
      >
        {guardando ? 'Publicando…' : 'Publicar'}
      </button>
    </form>
  );
}