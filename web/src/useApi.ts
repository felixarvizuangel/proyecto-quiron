import { useEffect, useState } from 'react';
import { api } from './api';

// Pide datos a la API al abrir una página y lleva el estado de carga y de error.
// Todas las páginas de consulta del panel lo reutilizan.
export function useApi<T>(ruta: string) {
  const [datos, setDatos] = useState<T | null>(null);
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    let vigente = true; // evita actualizar una página que ya se cerró
    api<T>(ruta)
      .then((resultado) => {
        if (vigente) setDatos(resultado);
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
  }, [ruta]);

  return { datos, error, cargando };
}