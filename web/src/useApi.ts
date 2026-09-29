import { useEffect, useState } from 'react';
import { api } from './api';

// Pide datos a la API al abrir una página y lleva el estado de carga y de error.
// recargar() los vuelve a pedir, por ejemplo después de dar de alta un registro.
export function useApi<T>(ruta: string) {
  const [datos, setDatos] = useState<T | null>(null);
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(true);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let vigente = true; // evita actualizar una página que ya se cerró
    api<T>(ruta)
      .then((resultado) => {
        if (!vigente) return;
        setDatos(resultado);
        setError('');
      })
      .catch((e: Error) => {
        if (vigente) setError(e.message);
      })
      .finally(() => {
        if (vigente) setCargando(false);
      });
    return () => {
      vigente = false;
    };
  }, [ruta, version]);

  function recargar() {
    setVersion((v) => v + 1);
  }

  return { datos, error, cargando, recargar };
}