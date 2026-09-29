import 'package:intl/intl.dart';

// Formatos en español de México. Se crean la primera vez que se usan,
// después de que main.dart cargó los datos del idioma.
final _fechaLarga = DateFormat("EEEE d 'de' MMMM", 'es_MX');
final _fechaCorta = DateFormat("d 'de' MMM", 'es_MX');
final _fechaHora = DateFormat("EEEE d 'de' MMMM, h:mm a", 'es_MX');
final _numero = NumberFormat('0.##', 'es_MX');

/// "Lunes 28 de septiembre"
String fechaLarga(DateTime fecha) => _capitalizar(_fechaLarga.format(fecha));

/// "28 de sep"
String fechaCorta(DateTime fecha) => _fechaCorta.format(fecha);

/// "Lunes 5 de octubre, 8:00 a.m."
String fechaHora(DateTime fecha) => _capitalizar(_fechaHora.format(fecha));

/// 9 → "9", 8.5 → "8.5", 8.75 → "8.75"
String numero(num valor) => _numero.format(valor);

String _capitalizar(String texto) =>
    texto.isEmpty ? texto : texto[0].toUpperCase() + texto.substring(1);