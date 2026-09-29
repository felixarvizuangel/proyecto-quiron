import { BrowserRouter, Navigate, Route, Routes } from 'react-router';
import { SesionProvider, useSesion } from './sesion';
import { Layout } from './componentes/Layout';
import { Estudiantes } from './paginas/Estudiantes';
import { Login } from './paginas/Login';
import { Maestros } from './paginas/Maestros';
import { MisGrupos } from './paginas/MisGrupos';
import { PasarLista } from './paginas/PasarLista';
import { Pendiente } from './paginas/Pendiente';

// Cada rol solo tiene registradas sus propias rutas. Si un maestro escribe
// /estudiantes en la barra, esa ruta no existe para él y lo regresa a su inicio.
function Rutas() {
  const { rol } = useSesion();

  if (!rol) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  const inicio = rol === 'director' ? '/estudiantes' : '/mis-grupos';

  return (
    <Routes>
      <Route element={<Layout />}>
        {rol === 'director' && (
          <>
            <Route path="/estudiantes" element={<Estudiantes />} />
            <Route path="/maestros" element={<Maestros />} />
            <Route path="/grupos-materias" element={<Pendiente titulo="Grupos y materias" />} />
            <Route path="/asignaciones" element={<Pendiente titulo="Asignaciones" />} />
          </>
        )}
        {rol === 'maestro' && (
          <>
            <Route path="/mis-grupos" element={<MisGrupos />} />
            <Route path="/mis-grupos/:idAsignacion/lista" element={<PasarLista />} />
          </>
        )}
        <Route path="/avisos" element={<Pendiente titulo="Avisos" />} />
      </Route>
      <Route path="*" element={<Navigate to={inicio} replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <SesionProvider>
      <BrowserRouter>
        <Rutas />
      </BrowserRouter>
    </SesionProvider>
  );
}