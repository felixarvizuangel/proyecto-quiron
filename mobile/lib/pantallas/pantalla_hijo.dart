import 'package:flutter/material.dart';

import '../api/api_cliente.dart';
import '../modelos/detalle_hijo.dart';
import '../modelos/hijo.dart';
import '../utilidades/formato.dart';
import '../widgets/vista_con_datos.dart';

/// Detalle de un hijo en cuatro pestañas. Cada pestaña pide solo sus datos.
class PantallaHijo extends StatelessWidget {
  const PantallaHijo({super.key, required this.hijo});

  final Hijo hijo;

  @override
  Widget build(BuildContext context) {
    return DefaultTabController(
      length: 4,
      child: Scaffold(
        appBar: AppBar(
          title: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(hijo.nombre),
              Text(hijo.grupo, style: Theme.of(context).textTheme.bodySmall),
            ],
          ),
          bottom: const TabBar(
            isScrollable: true,
            tabAlignment: TabAlignment.start,
            tabs: [
              Tab(text: 'Resumen'),
              Tab(text: 'Asistencia'),
              Tab(text: 'Calificaciones'),
              Tab(text: 'Avisos'),
            ],
          ),
        ),
        body: TabBarView(
          children: [
            _PestanaResumen(idHijo: hijo.id),
            _PestanaAsistencia(idHijo: hijo.id),
            _PestanaCalificaciones(idHijo: hijo.id),
            _PestanaAvisos(idHijo: hijo.id),
          ],
        ),
      ),
    );
  }
}

// ---------- Resumen ----------

class _PestanaResumen extends StatelessWidget {
  const _PestanaResumen({required this.idHijo});

  final int idHijo;

  @override
  Widget build(BuildContext context) {
    final tema = Theme.of(context);
    return VistaConDatos<ResumenHijo>(
      cargar: () async => ResumenHijo.desdeJson(
        await ApiCliente.instancia.get('/familia/hijos/$idHijo/resumen') as Map<String, dynamic>,
      ),
      construir: (context, resumen) => ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(16),
        children: [
          _Seccion(
            titulo: 'Últimos 30 días',
            child: Row(
              children: [
                _Dato(valor: resumen.presentes, etiqueta: 'Asistencias'),
                _Dato(valor: resumen.retardos, etiqueta: 'Retardos'),
                _Dato(valor: resumen.ausencias, etiqueta: 'Faltas'),
              ],
            ),
          ),
          _Seccion(
            titulo: 'Destaca en',
            child: resumen.destaca.isEmpty
                ? const Text('Cuando haya más calificaciones, aquí verás en qué destaca.')
                : _Etiquetas(
                    textos: resumen.destaca,
                    fondo: Colors.green.shade50,
                    color: Colors.green.shade800,
                  ),
          ),
          _Seccion(
            titulo: 'Puede reforzar',
            child: resumen.reforzar.isEmpty
                ? const Text('Por ahora no hay materias que reforzar.')
                : _Etiquetas(
                    textos: resumen.reforzar,
                    fondo: Colors.amber.shade50,
                    color: Colors.amber.shade900,
                  ),
          ),
          _Seccion(
            titulo: 'Promedio por materia',
            child: resumen.materias.isEmpty
                ? const Text('Todavía no hay calificaciones.')
                : Column(
                    children: [
                      for (final m in resumen.materias)
                        ListTile(
                          contentPadding: EdgeInsets.zero,
                          title: Text(m.materia),
                          subtitle: Text(m.parciales == 1 ? '1 parcial' : '${m.parciales} parciales'),
                          trailing: Text(numero(m.promedio), style: tema.textTheme.titleLarge),
                        ),
                    ],
                  ),
          ),
          const SizedBox(height: 8),
          // La decisión de producto, visible para la familia.
          Text(
            'Estas sugerencias comparan al estudiante solo consigo mismo, nunca con sus compañeros. '
            'Calificación mínima aprobatoria: ${numero(resumen.minima)}.',
            style: tema.textTheme.bodySmall?.copyWith(color: tema.colorScheme.onSurfaceVariant),
          ),
        ],
      ),
    );
  }
}

// ---------- Asistencia ----------

class _PestanaAsistencia extends StatelessWidget {
  const _PestanaAsistencia({required this.idHijo});

  final int idHijo;

  @override
  Widget build(BuildContext context) {
    return VistaConDatos<List<RegistroAsistencia>>(
      cargar: () async {
        final datos = await ApiCliente.instancia.get('/asistencia/estudiante/$idHijo') as List<dynamic>;
        return datos.map((e) => RegistroAsistencia.desdeJson(e as Map<String, dynamic>)).toList();
      },
      estaVacio: (registros) => registros.isEmpty,
      textoVacio: 'Todavía no hay registros de asistencia.',
      construir: (context, registros) => ListView.separated(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(16),
        itemCount: registros.length,
        separatorBuilder: (_, _) => const Divider(height: 1),
        itemBuilder: (context, i) {
          final r = registros[i];
          return ListTile(
            contentPadding: EdgeInsets.zero,
            title: Text(fechaLarga(r.fecha)),
            subtitle: Text(r.justificacion == null ? r.materia : '${r.materia} · ${r.justificacion}'),
            trailing: _EstadoAsistencia(estado: r.estado),
          );
        },
      ),
    );
  }
}

// ---------- Calificaciones ----------

class _PestanaCalificaciones extends StatelessWidget {
  const _PestanaCalificaciones({required this.idHijo});

  final int idHijo;

  @override
  Widget build(BuildContext context) {
    final tema = Theme.of(context);
    return VistaConDatos<List<Calificacion>>(
      cargar: () async {
        final datos = await ApiCliente.instancia.get('/calificaciones/estudiante/$idHijo') as List<dynamic>;
        return datos.map((e) => Calificacion.desdeJson(e as Map<String, dynamic>)).toList();
      },
      estaVacio: (lista) => lista.isEmpty,
      textoVacio: 'Todavía no hay calificaciones.',
      construir: (context, lista) {
        // Se agrupan por parcial para leerlas como una boleta.
        final porParcial = <int, List<Calificacion>>{};
        for (final c in lista) {
          porParcial.putIfAbsent(c.parcial, () => []).add(c);
        }
        final parciales = porParcial.keys.toList()..sort();

        return ListView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.all(16),
          children: [
            for (final p in parciales)
              _Seccion(
                titulo: 'Parcial $p',
                child: Column(
                  children: [
                    for (final c in porParcial[p]!)
                      ListTile(
                        contentPadding: EdgeInsets.zero,
                        title: Text(c.materia),
                        subtitle: Text(
                          c.aprobado ? 'Aprobado' : 'No aprobado',
                          style: TextStyle(
                            color: c.aprobado ? Colors.green.shade800 : Colors.amber.shade900,
                          ),
                        ),
                        trailing: Text(numero(c.calificacion), style: tema.textTheme.titleLarge),
                      ),
                  ],
                ),
              ),
          ],
        );
      },
    );
  }
}

// ---------- Avisos ----------

class _PestanaAvisos extends StatelessWidget {
  const _PestanaAvisos({required this.idHijo});

  final int idHijo;

  @override
  Widget build(BuildContext context) {
    final tema = Theme.of(context);
    return VistaConDatos<List<AvisoFamilia>>(
      cargar: () async {
        final datos = await ApiCliente.instancia.get('/avisos/estudiante/$idHijo') as List<dynamic>;
        return datos.map((e) => AvisoFamilia.desdeJson(e as Map<String, dynamic>)).toList();
      },
      estaVacio: (avisos) => avisos.isEmpty,
      textoVacio: 'No hay avisos por ahora.',
      construir: (context, avisos) => ListView.builder(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(16),
        itemCount: avisos.length,
        itemBuilder: (context, i) {
          final a = avisos[i];
          return Card(
            margin: const EdgeInsets.only(bottom: 12),
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Flexible(
                        child: _Etiqueta(
                          texto: a.esGeneral ? 'Toda la escuela' : a.origen,
                          fondo: tema.colorScheme.primaryContainer,
                          color: tema.colorScheme.onPrimaryContainer,
                        ),
                      ),
                      const SizedBox(width: 8),
                      Text(fechaCorta(a.publicado), style: tema.textTheme.bodySmall),
                    ],
                  ),
                  const SizedBox(height: 12),
                  Text(a.titulo, style: tema.textTheme.titleMedium),
                  if (a.subtitulo != null) ...[
                    const SizedBox(height: 2),
                    Text(
                      a.subtitulo!,
                      style: tema.textTheme.bodyMedium?.copyWith(color: tema.colorScheme.onSurfaceVariant),
                    ),
                  ],
                  const SizedBox(height: 8),
                  Text(a.cuerpo),
                  if (a.evento != null) ...[
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        Icon(Icons.event, size: 18, color: tema.colorScheme.primary),
                        const SizedBox(width: 6),
                        Expanded(child: Text(fechaHora(a.evento!))),
                      ],
                    ),
                  ],
                ],
              ),
            ),
          );
        },
      ),
    );
  }
}

// ---------- Piezas compartidas ----------

class _Seccion extends StatelessWidget {
  const _Seccion({required this.titulo, required this.child});

  final String titulo;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(titulo, style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 12),
            child,
          ],
        ),
      ),
    );
  }
}

class _Dato extends StatelessWidget {
  const _Dato({required this.valor, required this.etiqueta});

  final int valor;
  final String etiqueta;

  @override
  Widget build(BuildContext context) {
    final tema = Theme.of(context);
    return Expanded(
      child: Column(
        children: [
          Text('$valor', style: tema.textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w600)),
          Text(etiqueta, style: tema.textTheme.bodySmall),
        ],
      ),
    );
  }
}

class _EstadoAsistencia extends StatelessWidget {
  const _EstadoAsistencia({required this.estado});

  final String estado;

  @override
  Widget build(BuildContext context) {
    // Color y texto juntos: el estado nunca depende solo del color.
    final (texto, fondo, color) = switch (estado) {
      'presente' => ('Presente', Colors.green.shade50, Colors.green.shade800),
      'retardo' => ('Retardo', Colors.amber.shade50, Colors.amber.shade900),
      _ => ('Falta', Colors.red.shade50, Colors.red.shade800),
    };
    return _Etiqueta(texto: texto, fondo: fondo, color: color);
  }
}

class _Etiqueta extends StatelessWidget {
  const _Etiqueta({required this.texto, required this.fondo, required this.color});

  final String texto;
  final Color fondo;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(color: fondo, borderRadius: BorderRadius.circular(999)),
      child: Text(texto, style: TextStyle(color: color, fontWeight: FontWeight.w500)),
    );
  }
}

class _Etiquetas extends StatelessWidget {
  const _Etiquetas({required this.textos, required this.fondo, required this.color});

  final List<String> textos;
  final Color fondo;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Wrap(
      spacing: 8,
      runSpacing: 8,
      children: [for (final t in textos) _Etiqueta(texto: t, fondo: fondo, color: color)],
    );
  }
}