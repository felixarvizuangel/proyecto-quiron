/// Un estudiante vinculado a la cuenta de la familia.
class Hijo {
  Hijo({
    required this.id,
    required this.nombre,
    required this.grupo,
    required this.relacion,
  });

  final int id;
  final String nombre;
  final String grupo;
  final String relacion; // padre, madre o tutor

  // Los ids llegan como números porque la API los convierte antes de responder.
  factory Hijo.desdeJson(Map<String, dynamic> json) => Hijo(
        id: json['id'] as int,
        nombre: json['nombre'] as String,
        grupo: json['grupo'] as String,
        relacion: json['relacion'] as String,
      );
}