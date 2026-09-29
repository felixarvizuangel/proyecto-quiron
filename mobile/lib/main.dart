import 'package:flutter/material.dart';
import 'package:intl/date_symbol_data_local.dart';

import 'api/api_cliente.dart';
import 'pantallas/pantalla_hijos.dart';
import 'pantallas/pantalla_login.dart';

// Llave del navegador: permite regresar al login desde cualquier pantalla
// cuando la API avisa que la sesión terminó.
final navegador = GlobalKey<NavigatorState>();

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Nombres de días y meses en español de México, para las fechas de la app.
  await initializeDateFormatting('es_MX');

  final haySesion = await ApiCliente.instancia.cargarSesion();

  ApiCliente.instancia.alExpirarSesion = () {
    navegador.currentState?.pushAndRemoveUntil(
      MaterialPageRoute(
        builder: (_) => const PantallaLogin(mensaje: 'Tu sesión terminó. Vuelve a entrar.'),
      ),
      (_) => false,
    );
  };

  runApp(QuironApp(haySesion: haySesion));
}

class QuironApp extends StatelessWidget {
  const QuironApp({super.key, required this.haySesion});

  final bool haySesion;

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Quirón',
      navigatorKey: navegador,
      debugShowCheckedModeBanner: false,
      // El mismo índigo del panel web, para que las dos partes se sientan del mismo sistema.
      theme: ThemeData(colorSchemeSeed: const Color(0xFF4F46E5)),
      home: haySesion ? const PantallaHijos() : const PantallaLogin(),
    );
  }
}