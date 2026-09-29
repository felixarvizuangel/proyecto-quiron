import 'dart:async';
import 'dart:convert';

import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:http/http.dart' as http;

/// Error con un mensaje listo para mostrarse al usuario.
class ApiError implements Exception {
  ApiError(this.mensaje, {this.codigo});

  final String mensaje;
  final int? codigo;

  @override
  String toString() => mensaje;
}

/// Todas las llamadas a la API pasan por aquí: agrega el token,
/// decodifica en UTF-8 y convierte los errores en mensajes legibles.
class ApiCliente {
  ApiCliente._();
  static final instancia = ApiCliente._();

  // En el emulador de Android, 10.0.2.2 apunta a la computadora donde corre la API.
  // Para un celular real se pasa la IP de la computadora con --dart-define=API_URL=...
  static const _base = String.fromEnvironment('API_URL', defaultValue: 'http://10.0.2.2:3000');

  // El token se guarda cifrado por el sistema (Keystore en Android), no en texto plano.
  final _almacen = const FlutterSecureStorage();
  String? _token;

  /// Se llama cuando la API rechaza el token (venció o la cuenta se dio de baja).
  void Function()? alExpirarSesion;

  Future<bool> cargarSesion() async {
    _token = await _almacen.read(key: 'token');
    return _token != null;
  }

  Future<void> guardarToken(String token) async {
    _token = token;
    await _almacen.write(key: 'token', value: token);
  }

  Future<void> cerrarSesion() async {
    _token = null;
    await _almacen.delete(key: 'token');
  }

  Future<dynamic> get(String ruta) => _enviar('GET', ruta);

  Future<dynamic> post(String ruta, Map<String, dynamic> cuerpo) => _enviar('POST', ruta, cuerpo);

  Future<dynamic> _enviar(String metodo, String ruta, [Map<String, dynamic>? cuerpo]) async {
    final uri = Uri.parse('$_base$ruta');
    final encabezados = {
      'Content-Type': 'application/json; charset=utf-8',
      if (_token != null) 'Authorization': 'Bearer $_token',
    };

    http.Response respuesta;
    try {
      final peticion = metodo == 'GET'
          ? http.get(uri, headers: encabezados)
          : http.post(uri, headers: encabezados, body: jsonEncode(cuerpo));
      respuesta = await peticion.timeout(const Duration(seconds: 10));
    } on TimeoutException {
      throw ApiError('El servidor tardó demasiado en responder.');
    } catch (_) {
      throw ApiError('No se pudo conectar con el servidor. Revisa tu conexión.');
    }

    // Se decodifica a mano en UTF-8 para que los acentos siempre lleguen bien.
    final texto = utf8.decode(respuesta.bodyBytes);
    dynamic datos;
    try {
      datos = texto.isEmpty ? null : jsonDecode(texto);
    } on FormatException {
      datos = null;
    }

    // Si mandamos un token y la API lo rechaza, la sesión terminó.
    if (respuesta.statusCode == 401 && _token != null) {
      await cerrarSesion();
      alExpirarSesion?.call();
    }

    if (respuesta.statusCode >= 400) {
      final mensaje = datos is Map && datos['error'] is String
          ? datos['error'] as String
          : 'Ocurrió un error inesperado.';
      throw ApiError(mensaje, codigo: respuesta.statusCode);
    }
    return datos;
  }
}