# Contexto del Proyecto Quirón

> Documento para retomar el trabajo: qué es, cómo está construido, dónde está publicado y qué sigue.
> Última actualización: 29 de septiembre de 2026.

## 1. Qué es
- **Nombre:** Proyecto Quirón. **Lema:** "El guía que acompaña al estudiante y a su familia."
- **Autor:** Felix Arvizu Angel Gabriel, DSM 4-1, Universidad Tecnológica de Hermosillo (UTH).
- **Propósito:** proyecto insignia del portafolio personal.
- **Qué resuelve:** la información del estudiante (asistencia, calificaciones, avisos) llega tarde o dispersa a las familias. El maestro registra una vez y la familia lo ve en su celular.
- **Diferenciador:** acompañamiento sin comparaciones. La app dice en qué destaca el estudiante y qué puede reforzar, comparándolo solo consigo mismo.

## 2. Enlaces
| Qué | Dónde |
|---|---|
| Repositorio (público) | https://github.com/felixarvizuangel/proyecto-quiron |
| Panel web | https://quiron-panel.onrender.com |
| API | https://quiron-api.onrender.com (estado en `/salud`) |
| APK para Android | Release `v1.0.0` en GitHub Releases |

## 3. Roles
- **Director:** altas y bajas, catálogos, asignaciones, avisos generales; ve toda la escuela.
- **Maestro:** pasa lista, califica y publica avisos solo en sus grupos y materias.
- **Padre/Tutor:** se vincula con un código familiar y ve solo a sus hijos, en la app.
- **Estudiante:** solo lo propio. **Psicólogo:** reservado para la Fase 2 (hoy no ve nada).
- El registro abierto solo crea familias. El primer Director se crea con un script.

## 4. Arquitectura y stack
Monorepo con tres partes que se comunican solo por la API:
- `backend/`: Node.js 24 LTS, TypeScript, Express, pg, Zod, argon2, jsonwebtoken, express-rate-limit, cors, dotenv, tsx.
- `web/`: panel para Director y maestros. React, Vite 8, Tailwind CSS 4, React Router.
- `mobile/`: app para familias. Flutter (Dart), http, flutter_secure_storage, intl.
- Base de datos: PostgreSQL 18. En desarrollo, Docker (contenedor `quiron-db`, puerto **5433**); en la nube, Neon.
- Pruebas: Vitest + Supertest. Integración continua: GitHub Actions.

## 5. Base de datos (11 tablas, `backend/db/schema.sql`)
`usuarios` (correo, contraseña argon2, rol, activo) · `materias` · `grupos` · `padres` · `maestros` · `estudiantes` (grupo, matrícula, código familiar) · `estudiante_padre` (relación padre, madre o tutor) · `materia_maestro_grupo` (asignaciones) · `asistencia` (una fila por estudiante, materia y fecha) · `calificaciones` (0 a 10, una por estudiante, materia y parcial) · `avisos` (sin asignación = aviso general).

- El aprobado/reprobado se calcula al leer, con `CALIFICACION_MINIMA`.
- En `db.ts`, BIGINT y NUMERIC llegan como número, y DATE como texto `AAAA-MM-DD`.

## 6. API
Rutas agrupadas en `auth`, `estudiantes`, `maestros`, `materias`, `grupos`, `asignaciones`, `asistencia`, `calificaciones`, `avisos` y `familia`. La tabla completa está en el README.
- Las reglas de acceso viven en `backend/src/auth/permisos.ts` y niegan por defecto.
- `requiereAutenticacion` revisa en cada petición que la cuenta siga activa.
- Límite de 10 intentos fallidos cada 15 minutos en el login y la vinculación.
- Resumen para familias: asistencia de 30 días, promedios, "Destaca en" (hasta 2 materias con promedio ≥ mínima + (10 − mínima)/2) y "Puede reforzar" (promedio < mínima).

## 7. Panel web
- **Director:** Estudiantes, Maestros, Grupos y materias, Asignaciones, Avisos.
- **Maestro:** Mis grupos, Pasar lista, Calificaciones, Avisos.
- La sesión vive en sessionStorage y se cierra sola con un 401.
- En desarrollo, Vite reenvía `/api` a `localhost:3000`; publicado, usa `VITE_API_URL`.

## 8. App para familias
- Pantallas: Login, Crear cuenta, Mis hijos, Vincular hijo y detalle del hijo (Resumen, Asistencia, Calificaciones, Avisos).
- Token en almacenamiento seguro; ante un 401 regresa sola al login; solo acepta el rol padre.
- `API_URL` se pasa con `--dart-define`. Por defecto `http://10.0.2.2:3000` (la computadora vista desde el emulador `Android_API34`).

## 9. Despliegue
| Pieza | Servicio | Configuración |
|---|---|---|
| Base de datos | Neon, plan gratuito, AWS US West 2 (Oregon) | Proyecto `quiron`, rama `production`, base `neondb`. Conexión con `sslmode=verify-full` |
| API | Render, web service gratuito `quiron-api`, Oregon | Root `backend`; build `npm ci && npm run build`; start `npm start`; health check `/salud` |
| Panel | Render, sitio estático `quiron-panel` | Root `web`; build `npm ci && npm run build`; publish `dist`; rewrite `/*` → `/index.html` |
| App | GitHub Releases | `flutter build apk --release --dart-define=API_URL=https://quiron-api.onrender.com` |

- **Variables de la API en Render:** `DATABASE_URL`, `JWT_SECRET` (distinto al de desarrollo), `CALIFICACION_MINIMA=6`, `CORS_ORIGEN` (dirección del panel), `PROXIES_CONFIABLES=1`, `NODE_VERSION=24`.
- **Variables del panel en Render:** `VITE_API_URL` (dirección de la API, sin diagonal final) y `NODE_VERSION=24`.
- **Los secretos viven solo en Render.** Si una contraseña se filtra: Neon → Roles → Reset password, y actualizar `DATABASE_URL` en Render.
- **Planes gratuitos:** la API se duerme tras 15 minutos sin uso (tarda cerca de un minuto en despertar); Neon se suspende tras unos minutos sin uso. Si se agota algún límite, el servicio se pausa; no hay cobros.

## 10. Datos de demostración
Cargados con `npm run demo -- --confirmar`. Contraseña de todas las cuentas: `QuironDemo2026`.
- Director `director@quiron-demo.test`; maestros `maestra.mendez@quiron-demo.test` (Matemáticas en 1° A y 1° B) y `maestro.salazar@quiron-demo.test` (Español en 1° A, Ciencias en 1° B).
- Familias `familia.ramirez@quiron-demo.test` (Sofía y Mateo) y `familia.torres@quiron-demo.test` (Diego).
- Código libre para probar la vinculación: `W8E2JU5A` (Camila Flores).

## 11. Pruebas e integración continua
- 16 pruebas en `backend/test/` contra la base `quiron_test`, que se crea sola y se vacía en cada corrida: registro, permisos, altas, calificaciones, acompañamiento, familias, bajas y límite de intentos.
- `.github/workflows/pruebas.yml`, en cada push: API (compila y corre las pruebas con un PostgreSQL temporal), panel (compila) y app (`flutter analyze --no-fatal-infos`).

## 12. Cómo se ejecuta en desarrollo
| Parte | Carpeta | Comando |
|---|---|---|
| Base de datos | raíz | `docker compose up -d` |
| API | `backend` | `npm run dev` |
| Panel | `web` | `npm run dev` |
| App | `mobile` | `flutter emulators --launch Android_API34`, luego `flutter run` |
| Pruebas | `backend` | `npm test` |

Scripts de `backend`: `build`, `start`, `crear-director -- correo "clave"`, `esquema` (crea tablas faltantes sin borrar) y `demo -- --confirmar` (borra todo y carga la demo; sin `--confirmar` solo muestra la base destino).

Datos de desarrollo local (ficticios, solo en Docker; contraseña `Prueba1234`): director `director@quiron.test`, maestros Carlos López y Marta García, familia Laura Pérez (Ana y José), estudiantes Ana Pérez, José Ramírez, María José Núñez y Luis Hernández.

## 13. Convenciones de trabajo
- Todo en español. Al modificar un archivo se entrega completo; el README, siempre completo.
- Antes de pegar código, revisar la ruta arriba del editor (hay varios `router.ts`).
- Un commit por bloque: `feat:`, `fix:`, `docs:`, `test:`, `ci:`, `chore:`.
- `npm run dev` y `npm test` van dentro de `backend` o `web`; `flutter run` dentro de `mobile`; Git y Docker en la raíz.
- En PowerShell, el JSON con acentos se envía con la función `Invoke-JsonPost` del `$PROFILE`.

## 14. Lecciones aprendidas
- El PostgreSQL nativo de Windows ocupa el 5432; por eso Docker usa el 5433.
- PowerShell 5.1 no manda UTF-8 por defecto: de ahí `Invoke-JsonPost`.
- Cambiar el `.env` exige reiniciar la API; `tsx watch` solo recarga con cambios en archivos `.ts`.
- *Cannot GET /* en la dirección de la API es normal: solo responde en sus rutas.
- La traducción automática de Chrome alteró identificadores en la consola de Neon: desactivarla antes de copiar datos técnicos.
- Una dirección de conexión nunca se pega en un chat ni en una captura; si pasa, se cambia la contraseña.
- TypeScript no distingue con `in` dos formas de objeto que comparten propiedades; se revisa el valor de la propiedad.
- `sslmode=require` genera un aviso en `pg`; `sslmode=verify-full` deja explícita la verificación completa.

## 15. Estado y roadmap
✅ Hecho · ⬜ Pendiente

**Hecho (1 a 27):** planeación y base de datos · API completa · panel web · app para familias · README y capturas · pruebas automatizadas · integración continua · despliegue (Neon, Render y Releases) · repositorio público · contraseña de Neon renovada · este archivo de contexto.

**Siguiente:**
- ⬜ 28. Agregar Quirón al portafolio personal
- ⬜ 29. Contraseñas: cambiar la propia y restablecimiento por el Director
- ⬜ 30. Familias desde el panel: ver vinculadas, desvincular y generar un código nuevo
- ⬜ 31. Editar datos: cambiar de grupo, corregir nombres y correos
- ⬜ 32. Ciclos escolares
- ⬜ 33. Rediseño UX/UI con caso de estudio
- ⬜ 34. Notificaciones push
- ⬜ 35. Plataforma para varias escuelas, incluida la escala de 0 a 100
- ⬜ 36. Versión para escuelas reales: aviso de privacidad, consentimiento y Google Play
- ⬜ 37. Fase 1.5: modo sin conexión
- ⬜ 38. Fase 2: orientación vocacional con psicólogo
- ⬜ 39. Fase 3: estadísticas y notificaciones por urgencia