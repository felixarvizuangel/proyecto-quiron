import 'package:flutter/material.dart';

import '../api/api_cliente.dart';
import '../widgets/mensaje_error.dart';
import 'pantalla_hijos.dart';

class PantallaRegistro extends StatefulWidget {
  const PantallaRegistro({super.key});

  @override
  State<PantallaRegistro> createState() => _PantallaRegistroState();
}

class _PantallaRegistroState extends State<PantallaRegistro> {
  final _formulario = GlobalKey<FormState>();
  final _nombre = TextEditingController();
  final _correo = TextEditingController();
  final _telefono = TextEditingController();
  final _password = TextEditingController();
  final _confirmacion = TextEditingController();
  bool _cargando = false;
  String? _error;

  @override
  void dispose() {
    _nombre.dispose();
    _correo.dispose();
    _telefono.dispose();
    _password.dispose();
    _confirmacion.dispose();
    super.dispose();
  }

  Future<void> _registrar() async {
    if (!_formulario.currentState!.validate()) return;
    setState(() {
      _cargando = true;
      _error = null;
    });
    try {
      final api = ApiCliente.instancia;
      final correo = _correo.text.trim();
      await api.post('/auth/registro', {
        'nombre': _nombre.text.trim(),
        'correo': correo,
        if (_telefono.text.trim().isNotEmpty) 'telefono': _telefono.text.trim(),
        'password': _password.text,
      });
      // Con la cuenta creada, se inicia sesión de una vez.
      final sesion = await api.post('/auth/login', {'correo': correo, 'password': _password.text});
      await api.guardarToken(sesion['token'] as String);
      if (!mounted) return;
      Navigator.of(context).pushAndRemoveUntil(
        MaterialPageRoute(builder: (_) => const PantallaHijos()),
        (_) => false,
      );
    } on ApiError catch (e) {
      setState(() => _error = e.mensaje);
    } finally {
      if (mounted) setState(() => _cargando = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Crear cuenta')),
      body: SafeArea(
        child: Form(
          key: _formulario,
          child: ListView(
            padding: const EdgeInsets.all(24),
            children: [
              const Text(
                'Crea tu cuenta de familia. Después podrás vincularte con tus hijos '
                'usando el código familiar que te dé la escuela.',
              ),
              const SizedBox(height: 24),
              TextFormField(
                controller: _nombre,
                textCapitalization: TextCapitalization.words,
                decoration: const InputDecoration(labelText: 'Nombre completo', border: OutlineInputBorder()),
                validator: (v) => (v == null || v.trim().isEmpty) ? 'Escribe tu nombre' : null,
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: _correo,
                keyboardType: TextInputType.emailAddress,
                decoration: const InputDecoration(labelText: 'Correo', border: OutlineInputBorder()),
                validator: (v) => (v == null || !v.contains('@')) ? 'Escribe un correo válido' : null,
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: _telefono,
                keyboardType: TextInputType.phone,
                decoration: const InputDecoration(labelText: 'Teléfono (opcional)', border: OutlineInputBorder()),
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: _password,
                obscureText: true,
                decoration: const InputDecoration(labelText: 'Contraseña', border: OutlineInputBorder()),
                validator: (v) => (v == null || v.length < 8) ? 'Usa al menos 8 caracteres' : null,
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: _confirmacion,
                obscureText: true,
                decoration: const InputDecoration(labelText: 'Confirma la contraseña', border: OutlineInputBorder()),
                validator: (v) => v != _password.text ? 'Las contraseñas no coinciden' : null,
              ),
              if (_error != null) ...[
                const SizedBox(height: 16),
                MensajeError(texto: _error!),
              ],
              const SizedBox(height: 24),
              FilledButton(
                onPressed: _cargando ? null : _registrar,
                child: Padding(
                  padding: const EdgeInsets.symmetric(vertical: 12),
                  child: Text(_cargando ? 'Creando cuenta…' : 'Crear cuenta'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}