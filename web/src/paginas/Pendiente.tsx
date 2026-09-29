// Marcador temporal para las secciones que se construyen en los siguientes bloques.
export function Pendiente({ titulo }: { titulo: string }) {
  return (
    <section className="space-y-2">
      <h1 className="text-2xl font-semibold text-slate-800">{titulo}</h1>
      <p className="text-slate-500">Esta sección se construye en el siguiente paso.</p>
    </section>
  );
}