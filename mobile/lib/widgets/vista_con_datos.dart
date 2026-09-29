import 'package:flutter/material.dart';

/// Carga datos de la API y muestra el estado: cargando, error, vacío o el contenido.
/// Jalar hacia abajo vuelve a pedirlos. Es el equivalente a useApi del panel web.
/// Importante: `construir` debe devolver una lista desplazable (ListView)
/// para que funcione el "jalar para recargar".
class VistaConDatos<T> extends StatefulWidget {
  const VistaConDatos({
    super.key,
    required this.cargar,
    required this.construir,
    this.estaVacio,
    this.textoVacio,
  });

  final Future<T> Function() cargar;
  final Widget Function(BuildContext context, T datos) construir;
  final bool Function(T datos)? estaVacio;
  final String? textoVacio;

  @override
  State<VistaConDatos<T>> createState() => _VistaConDatosState<T>();
}

class _VistaConDatosState<T> extends State<VistaConDatos<T>> with AutomaticKeepAliveClientMixin {
  late Future<T> _datos;

  // Mantiene la pestaña cargada al cambiar a otra, para no pedir los datos de nuevo.
  @override
  bool get wantKeepAlive => true;

  @override
  void initState() {
    super.initState();
    _datos = widget.cargar();
  }

  Future<void> _recargar() async {
    final nuevo = widget.cargar();
    setState(() {
      _datos = nuevo;
    });
    try {
      await nuevo;
    } catch (_) {
      // El error ya lo muestra el FutureBuilder.
    }
  }

  @override
  Widget build(BuildContext context) {
    super.build(context);
    return RefreshIndicator(
      onRefresh: _recargar,
      child: FutureBuilder<T>(
        future: _datos,
        builder: (context, estado) {
          if (estado.connectionState != ConnectionState.done) {
            return const Center(child: CircularProgressIndicator());
          }
          if (estado.hasError) {
            return _Mensaje(texto: estado.error.toString());
          }
          final datos = estado.data as T;
          if (widget.estaVacio?.call(datos) ?? false) {
            return _Mensaje(texto: widget.textoVacio ?? 'Todavía no hay información.');
          }
          return widget.construir(context, datos);
        },
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