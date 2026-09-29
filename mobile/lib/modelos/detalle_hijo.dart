// Datos que muestra el detalle de un hijo. Cada clase sabe leerse desde el JSON de la API.

class ResumenHijo {
  ResumenHijo({
    required this.minima,
    required this.presentes,
    required this.retardos,
    required this.ausencias,
    required this.materias,
    required this.destaca,
    required this.reforzar,
  });

  final num minima;
  final int presentes;
  final int retardos;
  final int ausencias;
  final List<PromedioMateria> materias;
  final List<String> destaca;
  final List<String> reforzar;

  factory ResumenHijo.desdeJson(Map<String, dynamic> json) {
    final asistencia = json['asistencia30Dias'] as Map<String, dynamic>;
    return ResumenHijo(
      minima: json['minima'] as num,
      presentes: asistencia['presentes'] as int,
      retardos: asistencia['retardos'] as int,
      ausencias: asistencia['ausencias'] as int,
      materias: (json['materias'] as List<dynamic>)
          .map((m) => PromedioMateria.desdeJson(m as Map<String, dynamic>))
          .toList(),
      destaca: List<String>.from(json['destaca'] as List<dynamic>),
      reforzar: List<String>.from(json['reforzar'] as List<dynamic>),
    );
  }
}

class PromedioMateria {
  PromedioMateria({required this.materia, required this.promedio, required this.parciales});

  final String materia;
  final double promedio;
  final int parciales;

  factory PromedioMateria.desdeJson(Map<String, dynamic> json) => PromedioMateria(
        materia: json['materia'] as String,
        promedio: (json['promedio'] as num).toDouble(),
        parciales: json['parciales'] as int,
      );
}

class RegistroAsistencia {
  RegistroAsistencia({
    required this.materia,
    required this.fecha,
    required this.estado,
    this.justificacion,
  });

  final String materia;
  final DateTime fecha;
  final String estado; // presente, retardo o ausente
  final String? justificacion;

  // La fecha llega como 'AAAA-MM-DD', sin hora: DateTime.parse la toma como día local.
  factory RegistroAsistencia.desdeJson(Map<String, dynamic> json) => RegistroAsistencia(
        materia: json['materia'] as String,
        fecha: DateTime.parse(json['fecha'] as String),
        estado: json['estado'] as String,
        justificacion: json['justificacion'] as String?,
      );
}

class Calificacion {
  Calificacion({
    required this.materia,
    required this.parcial,
    required this.calificacion,
    required this.aprobado,
  });

  final String materia;
  final int parcial;
  final double calificacion;
  final bool aprobado; // lo calcula la API con la mínima de la escuela

  factory Calificacion.desdeJson(Map<String, dynamic> json) => Calificacion(
        materia: json['materia'] as String,
        parcial: json['parcial'] as int,
        calificacion: (json['calificacion'] as num).toDouble(),
        aprobado: json['estado'] == 'aprobado',
      );
}

class AvisoFamilia {
  AvisoFamilia({
    required this.titulo,
    this.subtitulo,
    required this.cuerpo,
    required this.publicado,
    this.evento,
    required this.origen,
  });

  final String titulo;
  final String? subtitulo;
  final String cuerpo;
  final DateTime publicado;
  final DateTime? evento;
  final String origen; // 'general' o el nombre de la materia

  bool get esGeneral => origen == 'general';

  // Estas fechas sí traen hora y zona (UTC): se convierten a la hora del teléfono.
  factory AvisoFamilia.desdeJson(Map<String, dynamic> json) => AvisoFamilia(
        titulo: json['titulo'] as String,
        subtitulo: json['subtitulo'] as String?,
        cuerpo: json['cuerpo'] as String,
        publicado: DateTime.parse(json['fecha_publicacion'] as String).toLocal(),
        evento: json['fecha_evento'] == null
            ? null
            : DateTime.parse(json['fecha_evento'] as String).toLocal(),
        origen: json['origen'] as String,
      );
}