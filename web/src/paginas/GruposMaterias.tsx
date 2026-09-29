import { useState, type FormEvent } from 'react';
import { api } from '../api';
import { useApi } from '../useApi';
import { Entrada, MensajeError } from '../componentes/Formulario';

interface Grupo {
  id: number;
  nombre: string;
  grado: number;
}

interface Materia {
  id: number;
  nombre: string;
}

const CLASE_BOTON =
  'w-full rounded-lg bg-indigo-600 py-2 font-medium text-white hover:bg-indigo-700 disabled:opacity-60';

export function GruposMaterias() {
  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-800">Grupos y materias</h1>
        <p className="text-slate-500">Los catálogos de la escuela. Después se combinan en Asignaciones.</p>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <SeccionGrupos />
        <SeccionMaterias />
      </div>
    </section>
  );
}

function SeccionGrupos() {
  const { datos: grupos, error, recargar } = useApi<Grupo[]>('/grupos');
  const [nombre, setNombre] = useState('');
  const [grado, setGrado] = useState('');
  const [errorAlta, setErrorAlta] = useState('');
  const [guardando, setGuardando] = useState(false);

  async function agregar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setErrorAlta('');
    setGuardando(true);
    try {
      await api('/grupos', { metodo: 'POST', cuerpo: { nombre: nombre.trim(), grado: Number(grado) } });
      setNombre('');
      setGrado('');
      recargar();
    } catch (e) {
      setErrorAlta(e instanceof Error ? e.message : 'No se pudo agregar el grupo');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="h-fit space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="font-medium text-slate-800">Grupos</h2>
      <MensajeError texto={error} />
      <ul className="divide-y divide-slate-100">
        {grupos?.map((g) => (
          <li key={g.id} className="flex items-center justify-between py-2 text-sm">
            <span className="text-slate-800">{g.nombre}</span>
            <span className="text-slate-500">Grado {g.grado}</span>
          </li>
        ))}
        {grupos?.length === 0 && <li className="py-2 text-sm text-slate-500">Aún no hay grupos.</li>}
      </ul>
      <form onSubmit={agregar} className="space-y-3 border-t border-slate-100 pt-4">
        <div className="grid grid-cols-[1fr_6rem] gap-3">
          <Entrada
            etiqueta="Nombre"
            required
            placeholder="DSM 4-2"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
          />
          <Entrada
            etiqueta="Grado"
            type="number"
            required
            min={1}
            value={grado}
            onChange={(e) => setGrado(e.target.value)}
          />
        </div>
        <MensajeError texto={errorAlta} />
        <button type="submit" disabled={guardando} className={CLASE_BOTON}>
          {guardando ? 'Guardando…' : 'Agregar grupo'}
        </button>
      </form>
    </div>
  );
}

function SeccionMaterias() {
  const { datos: materias, error, recargar } = useApi<Materia[]>('/materias');
  const [nombre, setNombre] = useState('');
  const [errorAlta, setErrorAlta] = useState('');
  const [guardando, setGuardando] = useState(false);

  async function agregar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setErrorAlta('');
    setGuardando(true);
    try {
      await api('/materias', { metodo: 'POST', cuerpo: { nombre: nombre.trim() } });
      setNombre('');
      recargar();
    } catch (e) {
      setErrorAlta(e instanceof Error ? e.message : 'No se pudo agregar la materia');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="h-fit space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="font-medium text-slate-800">Materias</h2>
      <MensajeError texto={error} />
      <ul className="divide-y divide-slate-100">
        {materias?.map((m) => (
          <li key={m.id} className="py-2 text-sm text-slate-800">
            {m.nombre}
          </li>
        ))}
        {materias?.length === 0 && <li className="py-2 text-sm text-slate-500">Aún no hay materias.</li>}
      </ul>
      <form onSubmit={agregar} className="space-y-3 border-t border-slate-100 pt-4">
        <Entrada
          etiqueta="Nombre"
          required
          placeholder="Bases de Datos"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
        />
        <MensajeError texto={errorAlta} />
        <button type="submit" disabled={guardando} className={CLASE_BOTON}>
          {guardando ? 'Guardando…' : 'Agregar materia'}
        </button>
      </form>
    </div>
  );
}