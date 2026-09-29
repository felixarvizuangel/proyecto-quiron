import type { InputHTMLAttributes, SelectHTMLAttributes } from 'react';

// Piezas de formulario con el mismo estilo en todo el panel.
// Las siguientes pantallas (maestros, asignaciones, avisos) también las usan.
const CLASE_CAMPO =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200';

interface EntradaProps extends InputHTMLAttributes<HTMLInputElement> {
  etiqueta: string;
}

export function Entrada({ etiqueta, ...props }: EntradaProps) {
  return (
    <label className="block space-y-1">
      <span className="text-sm font-medium text-slate-700">{etiqueta}</span>
      <input {...props} className={CLASE_CAMPO} />
    </label>
  );
}

interface SelectorProps extends SelectHTMLAttributes<HTMLSelectElement> {
  etiqueta: string;
}

export function Selector({ etiqueta, children, ...props }: SelectorProps) {
  return (
    <label className="block space-y-1">
      <span className="text-sm font-medium text-slate-700">{etiqueta}</span>
      <select {...props} className={CLASE_CAMPO}>
        {children}
      </select>
    </label>
  );
}

export function MensajeError({ texto }: { texto: string }) {
  if (!texto) return null;
  return (
    <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
      {texto}
    </p>
  );
}