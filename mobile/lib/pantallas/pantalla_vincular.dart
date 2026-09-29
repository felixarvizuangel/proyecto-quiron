import 'package:flutter/material.dart';

import '../api/api_cliente.dart';
import '../widgets/mensaje_error.dart';

class PantallaVincular extends StatefulWidget {
  const PantallaVincular({super.key});

  @override
  State<PantallaVincular> createState() => _PantallaVincularState();
}

class _PantallaVincularState extends State<PantallaVincular> {
  final _formulario = GlobalKey<FormState>();
  final _codigo = TextEditingController();
  String _relacion = 'madre';
  bool _cargando = false;
  String? _error;

  @override
  void dispose() {
    _codigo.dispose();
    super.dispose();
  }

  Future<void> _vincular() async {
    if (!_formulario.currentState!.validate()) return;
    setState(() {
      _cargando = true;
      _error = null;
    });
    try {
      // La API limpia espacios y minúsculas; aquí solo se manda lo escrito.
      final datos = await ApiCliente.instancia.post('/familia/vincular', {
        'codigo': _codigo.text,
        'relacion': _relacion,
      });
      if (!mounted) return;
      Navigator.of(context).pop(datos['nombre'] as String);
    } on ApiError catch (e) {
      setState(() => _error = e.mensaje);
    } finally {
      if (mounted) setState(() => _cargando = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Vincular hijo')),
      body: SafeArea(
        child: Form(
          key: _formulario,
          child: ListView(
            padding: const EdgeInsets.all(24),
            children: [
              const Text('Escribe el código familiar de 8 caracteres que te dio la escuela.'),
              const SizedBox(height: 24),
              TextFormField(
                controller: _codigo,
                textCapitalization: TextCapitalization.characters,
                autocorrect: false,
                maxLength: 8,
                style: const TextStyle(letterSpacing: 4, fontFamily: 'monospace'),
                decoration: const InputDecoration(labelText: 'Código familiar', border: OutlineInputBorder()),
                validator: (v) => (v == null || v.trim().length != 8) ? 'El código tiene 8 caracteres' : null,
              ),
              const SizedBox(height: 16),
              const Text('¿Qué eres del estudiante?'),
              const SizedBox(height: 8),
              SegmentedButton<String>(
                segments: const [
                  ButtonSegment(value: 'madre', label: Text('Madre')),
                  ButtonSegment(value: 'padre', label: Text('Padre')),
                  ButtonSegment(value: 'tutor', label: Text('Tutor')),
                ],
                selected: {_relacion},
                onSelectionChanged: (seleccion) => setState(() => _relacion = seleccion.first),
              ),
              if (_error != null) ...[
                const SizedBox(height: 16),
                MensajeError(texto: _error!),
              ],
              const SizedBox(height: 24),
              FilledButton(
                onPressed: _cargando ? null : _vincular,
                child: Padding(
                  padding: const EdgeInsets.symmetric(vertical: 12),
                  child: Text(_cargando ? 'Vinculando…' : 'Vincular'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}