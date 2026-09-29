import { NavLink, Outlet } from 'react-router';
import { useSesion, type Rol } from '../sesion';

// Menú de cada rol. Para agregar una sección nueva basta con sumar una línea aquí
// y su ruta en App.tsx.
const MENU: Record<Rol, { ruta: string; texto: string }[]> = {
  director: [
    { ruta: '/estudiantes', texto: 'Estudiantes' },
    { ruta: '/maestros', texto: 'Maestros' },
    { ruta: '/grupos-materias', texto: 'Grupos y materias' },
    { ruta: '/asignaciones', texto: 'Asignaciones' },
    { ruta: '/avisos', texto: 'Avisos' },
  ],
  maestro: [
    { ruta: '/mis-grupos', texto: 'Mis grupos' },
    { ruta: '/avisos', texto: 'Avisos' },
  ],
};

export function Layout() {
  const { rol, cerrar } = useSesion();
  if (!rol) return null;

  return (
    <div className="min-h-screen bg-slate-50 md:flex">
      <aside className="border-b border-slate-200 bg-white md:w-60 md:shrink-0 md:border-r md:border-b-0">
        <div className="flex items-center justify-between gap-4 px-5 py-4">
          <div>
            <p className="text-lg font-semibold text-slate-800">Quirón</p>
            <p className="text-xs capitalize text-slate-500">{rol}</p>
          </div>
          <button onClick={cerrar} className="text-sm text-slate-500 hover:text-slate-800">
            Salir
          </button>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-3 md:flex-col">
          {MENU[rol].map((opcion) => (
            <NavLink
              key={opcion.ruta}
              to={opcion.ruta}
              className={({ isActive }) =>
                `whitespace-nowrap rounded-lg px-3 py-2 text-sm ${
                  isActive ? 'bg-indigo-50 font-medium text-indigo-700' : 'text-slate-600 hover:bg-slate-100'
                }`
              }
            >
              {opcion.texto}
            </NavLink>
          ))}
        </nav>
      </aside>
      <main className="flex-1 p-4 md:p-8">
        <Outlet />
      </main>
    </div>
  );
}