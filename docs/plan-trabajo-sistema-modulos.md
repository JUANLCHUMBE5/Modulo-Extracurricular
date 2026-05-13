# Plan de trabajo del sistema por modulos

## Proyecto

Sistema web con asistente virtual para automatizar el control de programas extracurriculares en la Institucion Matematica San Rafael S.A.C.

## Objetivo general

Desarrollar modulos independientes en React para la gestion de programas extracurriculares del colegio, de manera que puedan ser integrados al sistema principal. Cada modulo debera trabajar mediante llamadas API, sin conectarse directamente a la base de datos desde el frontend.

## Tecnologias consideradas

- React para el desarrollo de las pantallas.
- CSS para los estilos de cada modulo.
- JavaScript para los servicios de conexion API.
- API del sistema principal para consultar, registrar y actualizar datos.
- Python solo para funciones auxiliares si el jefe lo aprueba, como generacion de QR, PDF, Excel o asistente virtual basico.

## Estructura general del proyecto

```text
src/
├── modules/
│   ├── secretaria/
│   │   ├── Secretaria.jsx
│   │   ├── Secretaria.css
│   │   └── secretariaService.js
│   ├── caja/
│   │   ├── Caja.jsx
│   │   ├── Caja.css
│   │   └── cajaService.js
│   ├── coordinacion/
│   │   ├── Coordinacion.jsx
│   │   ├── Coordinacion.css
│   │   └── coordinacionService.js
│   ├── padres/
│   │   ├── Padres.jsx
│   │   ├── Padres.css
│   │   └── padresService.js
│   ├── auxiliar/
│   │   ├── Auxiliar.jsx
│   │   ├── Auxiliar.css
│   │   └── auxiliarService.js
│   ├── direccion/
│   │   ├── Direccion.jsx
│   │   ├── Direccion.css
│   │   └── direccionService.js
│   └── administrador/
│       ├── Administrador.jsx
│       ├── Administrador.css
│       └── administradorService.js
├── services/
│   ├── apiClient.js
│   └── validators.js
└── utils/
    ├── security.js
    └── formatters.js
```

## Principio general de integracion

El sistema no se desarrollara como una aplicacion aislada, sino como un conjunto de modulos independientes que seran llamados desde el sistema principal.

El sistema principal se encargara de:

- Login general.
- Menu principal.
- Base de datos.
- Backend.
- Control global de usuarios.
- Integracion final.

Los modulos desarrollados se encargaran de:

- Mostrar pantallas.
- Validar formularios.
- Enviar informacion mediante API.
- Recibir datos desde API.
- Mostrar resultados al usuario segun su rol.

## Modulos

### Secretaria

Objetivo: gestionar la inscripcion presencial de estudiantes en programas extracurriculares.

Archivos:

- `Secretaria.jsx`
- `Secretaria.css`
- `secretariaService.js`

API necesaria:

- `GET /api/estudiantes/:dni`
- `GET /api/programas?periodo=escolar`
- `GET /api/programas?periodo=verano`
- `POST /api/alumnos-externos`
- `POST /api/inscripciones`
- `GET /api/inscripciones/:id/ficha`

Seguridad principal:

- DNI solo 8 numeros.
- Telefono solo 9 numeros.
- Correo opcional con validacion.
- Bloquear correos temporales.
- Observacion segura sin etiquetas HTML.
- No registrar inscripcion sin programa.
- No registrar inscripcion excepcional sin observacion.
- No registrar alumno externo fuera del ciclo verano.

### Caja

Objetivo: registrar, consultar, revisar y validar pagos de programas extracurriculares.

Archivos:

- `Caja.jsx`
- `Caja.css`
- `cajaService.js`

API necesaria:

- `GET /api/estudiantes/:dni/inscripciones`
- `GET /api/pagos/pendientes`
- `POST /api/pagos`
- `PUT /api/pagos/:id/validar`
- `PUT /api/pagos/:id/rechazar`
- `GET /api/pagos/:id/estado`

API futura:

- `POST /api/pagos/generar-link`
- `POST /api/pagos/generar-qr`
- `GET /api/pagos/pos/:id/estado`
- `POST /api/pagos/webhook`

Seguridad principal:

- Monto positivo.
- Numero de operacion limpio y seguro.
- Comprobante con extension permitida.
- Evitar pagos duplicados.
- Solo Caja puede validar o rechazar pagos.

### Coordinacion

Objetivo: crear y administrar programas, talleres, horarios, grupos, cupos, responsables y plantillas.

Archivos:

- `Coordinacion.jsx`
- `Coordinacion.css`
- `coordinacionService.js`

API necesaria:

- `GET /api/programas`
- `POST /api/programas`
- `PUT /api/programas/:id`
- `PUT /api/programas/:id/habilitar`
- `PUT /api/programas/:id/deshabilitar`
- `POST /api/programas/:id/importar-invitados`
- `GET /api/programas/:id/lista-asistencia`

Seguridad principal:

- No permitir programas sin nombre.
- Cupos positivos.
- Costos positivos o cero si aplica.
- Fecha inicio menor o igual a fecha fin.
- Horarios obligatorios.
- Validar archivos importados.
- Solo Coordinacion puede crear, editar o deshabilitar programas.

### Padres

Objetivo: permitir que el padre de familia consulte informacion y realice procesos desde su portal.

Archivos:

- `Padres.jsx`
- `Padres.css`
- `padresService.js`

API necesaria:

- `POST /api/padres/login`
- `GET /api/padres/:dni/resumen`
- `PUT /api/padres/:dni/apoderado`
- `GET /api/padres/:dni/ficha`
- `GET /api/padres/:dni/qr`
- `POST /api/asistente/consulta`

Seguridad principal:

- DNI solo 8 numeros.
- Fecha de nacimiento obligatoria.
- Telefono WhatsApp de 9 numeros.
- Correo opcional valido.
- Bloquear correos temporales.
- El padre solo debe ver informacion del estudiante consultado.
- No mostrar QR si el pago no esta validado.

### Auxiliar

Objetivo: validar el ingreso de estudiantes mediante QR o busqueda manual.

Archivos:

- `Auxiliar.jsx`
- `Auxiliar.css`
- `auxiliarService.js`

API necesaria:

- `GET /api/qr/:codigo`
- `GET /api/estudiantes/:dni/validacion-ingreso`
- `POST /api/asistencias`
- `POST /api/asistencias/:id/observacion`

Seguridad principal:

- QR validado por backend.
- DNI manual solo 8 numeros.
- No registrar asistencia sin pago validado.
- No registrar asistencia fuera de horario.
- No registrar asistencia duplicada.
- Observacion segura sin HTML.

### Direccion

Objetivo: visualizar reportes e indicadores para la toma de decisiones.

Archivos:

- `Direccion.jsx`
- `Direccion.css`
- `direccionService.js`

API necesaria:

- `GET /api/reportes/resumen`
- `GET /api/reportes/programas`
- `GET /api/reportes/pagos`
- `GET /api/reportes/asistencia`
- `GET /api/reportes/incidencias`
- `GET /api/reportes/exportar?formato=pdf`
- `GET /api/reportes/exportar?formato=excel`

Seguridad principal:

- Direccion solo consulta informacion.
- No registra pagos.
- No edita programas.
- Exportaciones por backend.
- No exponer datos sensibles innecesarios.

### Administrador

Objetivo: gestionar usuarios internos, roles, estados y contrasenas.

Archivos:

- `Administrador.jsx`
- `Administrador.css`
- `administradorService.js`

API necesaria:

- `GET /api/usuarios`
- `POST /api/usuarios`
- `PUT /api/usuarios/:id`
- `PUT /api/usuarios/:id/estado`
- `PUT /api/usuarios/:id/password`
- `GET /api/roles`

Seguridad principal:

- Solo Administrador puede gestionar usuarios.
- Usuario no debe repetirse.
- Correo institucional obligatorio.
- Contrasena obligatoria con seguridad minima.
- No desactivar el ultimo administrador activo.
- No guardar contrasenas en texto plano en produccion.

## Seguridad general

- React no se conecta directamente a base de datos.
- Todo registro, consulta o actualizacion pasa por API.
- Validar campos antes de enviar.
- Limpiar textos ingresados por el usuario.
- No permitir etiquetas HTML como `<script>`.
- No guardar contrasenas en el frontend.
- No mostrar errores tecnicos al usuario.
- No hacer consultas SQL desde React.
- No enviar datos sensibles en la URL si no es necesario.
- Usar HTTPS obligatorio en produccion.
- No guardar datos sensibles en `localStorage` si no es necesario.

## Validaciones globales recomendadas

Archivo recomendado: `src/services/validators.js`

- `validarDni()`
- `validarTelefono()`
- `validarCorreoPadre()`
- `validarCorreoInstitucional()`
- `validarTextoSeguro()`
- `validarMonto()`
- `validarFecha()`
- `validarPassword()`

Correos temporales a bloquear:

- `tempmail.com`
- `10minutemail.com`
- `guerrillamail.com`
- `mailinator.com`
- `yopmail.com`
- `trashmail.com`

## Contrato API minimo

### Estudiante

```json
{
  "dni": "12345678",
  "nombres": "Juan Perez Lopez",
  "nivel": "Primaria",
  "grado": "3",
  "seccion": "B",
  "fechaNacimiento": "2017-05-14",
  "estado": "Activo"
}
```

### Programa

```json
{
  "id": "REF-PRI-2026",
  "nombre": "Reforzamiento y nivelacion",
  "periodo": "Ano escolar",
  "grupo": "Primaria 1, 2 y 3",
  "horario": "Lunes y miercoles 3:20 p. m. - 4:50 p. m.",
  "costo": 70,
  "cuposDisponibles": 12,
  "requiereUniforme": false,
  "estado": "Habilitado"
}
```

### Inscripcion

```json
{
  "id": "INS001",
  "dniEstudiante": "12345678",
  "programaId": "REF-PRI-2026",
  "estadoInscripcion": "Pendiente de pago",
  "estadoPago": "Pendiente",
  "apoderado": "Carlos Perez",
  "telefono": "987654321"
}
```

### Pago

```json
{
  "id": "PAG001",
  "dniEstudiante": "12345678",
  "programaId": "REF-PRI-2026",
  "monto": 70,
  "metodo": "Yape",
  "estado": "Pendiente"
}
```

## Orden recomendado de desarrollo

1. Definir estructura React por modulos.
2. Crear `apiClient.js`.
3. Crear `validators.js`.
4. Desarrollar Modulo Secretaria.
5. Desarrollar Modulo Coordinacion.
6. Desarrollar Modulo Caja.
7. Desarrollar Modulo Padres.
8. Desarrollar Modulo Auxiliar.
9. Desarrollar Modulo Direccion.
10. Desarrollar Modulo Administrador.
11. Agregar servicios Python si el jefe lo aprueba.
12. Integrar cada modulo al sistema principal.
13. Probar roles, formularios, seguridad y flujo completo.
