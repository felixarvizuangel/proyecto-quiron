import 'package:flutter/material.dart';

/// Recuadro de error con el mismo estilo en toda la app.
/// liveRegion hace que el lector de pantalla lo anuncie en cuanto aparece.
class MensajeError extends StatelessWidget {
  const MensajeError({super.key, required this.texto});

  final String texto;

  @override
  Widget build(BuildContext context) {
    final colores = Theme.of(context).colorScheme;
    return Semantics(
      liveRegion: true,
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: colores.errorContainer,
          borderRadius: BorderRadius.circular(12),
        ),
        child: Text(texto, style: TextStyle(color: colores.onErrorContainer)),
      ),
    );
  }
}