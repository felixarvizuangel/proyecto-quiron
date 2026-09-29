import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

// Roles que pueden entrar al panel.
export type Rol = 'director' | 'maestro';

interface Sesion {
  rol: Rol | null;
  iniciar: (token: string, rol: Rol) => void;
  cerrar: () => void;
}

const SesionContext = createContext<Sesion | null>(null);

// Guarda quién inició sesión y lo comparte con cualquier página que lo necesite.
export function SesionProvider({ children }: { children: ReactNode }) {
  const [rol, setRol] = useState<Rol | null>(() => sessionStorage.getItem('rol') as Rol | null);

  function iniciar(token: string, nuevoRol: Rol) {
    sessionStorage.setItem('token', token);
    sessionStorage.setItem('rol', nuevoRol);
    setRol(nuevoRol);
  }

  function cerrar() {
    sessionStorage.clear();
    setRol(null);
  }

  // api.ts lanza este evento cuando el token venció: la sesión se cierra sola.
  useEffect(() => {
    function alExpirar() {
      sessionStorage.clear();
      setRol(null);
    }
    window.addEventListener('sesion-expirada', alExpirar);
    return () => window.removeEventListener('sesion-expirada', alExpirar);
  }, []);

  return <SesionContext value={{ rol, iniciar, cerrar }}>{children}</SesionContext>;
}

export function useSesion() {
  const sesion = useContext(SesionContext);
  if (!sesion) {
    throw new Error('useSesion debe usarse dentro de SesionProvider');
  }
  return sesion;
}