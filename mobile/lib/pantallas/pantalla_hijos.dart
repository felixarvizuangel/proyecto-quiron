import 'package:flutter/material.dart';

import '../api/api_cliente.dart';
import '../modelos/hijo.dart';
import 'pantalla_login.dart';
import 'pantalla_vincular.dart';

class PantallaHijos extends StatefulWidget {
  const PantallaHijos({super.key});

  @override
  State<PantallaHijos> createState() => _PantallaHijosState();
}

class _PantallaHijosState extends State<PantallaHijos> {
  late Future<List<Hijo>> _hijos;

  @override
  void initState() {
    super.initState();
    _hijos = _cargar();
  }

  Future<List<Hijo>> _cargar() async {
    final datos = await ApiCliente.instancia.get('/familia/hijos') as List<dynamic>;
    return datos.map((e) => Hijo.desdeJson(e as Map<String, dynamic>)).toList();
  }

  Future<void> _recargar() async {
    final nuevo = _cargar();
    setState(() {
      _hijos = nuevo;
    });
    try {
      await nuevo;
    } catch (_) {
      // El error ya lo muestra el FutureBuilder.
    }
  }

  Future<void> _vincular() async {
    final nombre = await Navigator.of(context).push<String>(
      MaterialPageRoute(builder: (_) => const PantallaVincular()),
    );
    if (nombre == null) return;
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('Listo: $nombre ya aparece en tu lista.')),
    );
    _recargar();
  }

  Future<void> _salir() async {
    await ApiCliente.instancia.cerrarSesion();
    if (!mounted) return;
    Navigator.of(context).pushAndRemoveUntil(
      MaterialPageRoute(builder: (_) => const PantallaLogin()),
      (_) => false,
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Mis hijos'),
        actions: [
          IconButton(onPressed: _salir, icon: const Icon(Icons.logout), tooltip: 'Cerrar sesión'),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _vincular,
        icon: const Icon(Icons.link),
        label: const Text('Vincular hijo'),
      ),
      // Jalar hacia abajo vuelve a pedir la lista.
      body: RefreshIndicator(
        onRefresh: _recargar,
        child: FutureBuilder<List<Hijo>>(
          future: _hijos,
          builder: (context, estado) {
            if (estado.connectionState != ConnectionState.done) {
              return const Center(child: CircularProgressIndicator());
            }
            if (estado.hasError) {
              return _Mensaje(texto: estado.error.toString());
            }
            final hijos = estado.data!;
            if (hijos.isEmpty) {
              return const _Mensaje(
                texto: 'Todavía no has vinculado a ningún hijo.\n'
                    'Pide a la escuela su código familiar y toca "Vincular hijo".',
              );
            }
            return ListView.separated(
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 96),
              itemCount: hijos.length,
              separatorBuilder: (_, __) => const SizedBox(height: 12),
              itemBuilder: (context, i) => _TarjetaHijo(hijo: hijos[i]),
            );
          },
        ),
      ),
    );
  }
}

class _TarjetaHijo extends StatelessWidget {
  const _TarjetaHijo({required this.hijo});

  final Hijo hijo;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: ListTile(
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        leading: CircleAvatar(child: Text(hijo.nombre.isNotEmpty ? hijo.nombre[0] : '?')),
        title: Text(hijo.nombre),
        subtitle: Text('${hijo.grupo} · Eres su ${hijo.relacion}'),
        trailing: const Icon(Icons.chevron_right),
        // El detalle de cada hijo llega en el siguiente bloque.
        onTap: () => ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('El detalle de cada hijo llega en el siguiente paso.')),
        ),
      ),
    );
  }
}

/// Mensaje centrado que también se puede jalar hacia abajo para recargar.
class _Mensaje extends StatelessWidget {
  const _Mensaje({required this.texto});

  final String texto;

  @override
  Widget build(BuildContext context) {
    return ListView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.all(32),
      children: [
        const SizedBox(height: 80),
        Text(texto, textAlign: TextAlign.center, style: Theme.of(context).textTheme.bodyLarge),
      ],
    );
  }
}