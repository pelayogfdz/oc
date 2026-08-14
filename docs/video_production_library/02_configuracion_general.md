# CATEGORÍA 02 — CONFIGURACIÓN GENERAL Y SISTEMA

## Playlist YouTube: `02 — Configuración y Preferencias`

---

### VIDEO 2.1: Configuración Inicial de la Empresa y Datos Fiscales

* **Nivel de Dificultad**: Avanzado
* **Duración Estimada**: 07:45
* **Título YouTube**: `CAANMA | Cómo configurar tu empresa, RFC y régimen fiscal`
* **Playlist**: 02 — Configuración y Preferencias

#### A. Objetivo
Aprender a parametrizar la información de la empresa, Razón Social, RFC, Régimen Fiscal, Zona Horaria, Decimales y Certificados del SAT (CSD).

#### B. Prerrequisitos
Acceso con rol de Administrador Global / Propietario.

#### C. Descripción y Capítulos para YouTube
```markdown
Aprende a realizar la configuración inicial de tu empresa en CAANMA ERP para emitir comprobantes fiscales y establecer parámetros operativos.

CAPÍTULOS:
00:00 Introducción a la Configuración de Empresa
00:45 Acceso a Preferencias Generales
01:30 Captura de Razón Social y RFC
03:00 Régimen Fiscal y Código Postal
04:30 Decimales de Operación y Zona Horaria
06:15 Configuración de Certificados CSD del SAT
07:15 Cierre y Verificación
```

#### D. Guion de Narración y Secuencia UI paso a paso

| Timestamp | Pantalla / Acción UI (1920x1080) | Narración (Voz en Off) |
| :--- | :--- | :--- |
| **00:00 - 00:45** | Cortinilla CAANMA. Transición a `/preferencias/general`. | *"En este tutorial aprenderemos a configurar los datos fiscales e identitarios de tu empresa en CAANMA ERP."* |
| **00:45 - 01:30** | Se resalta la pestaña `General` dentro del menú de Preferencias. Zoom al formulario. | *"Nos dirigimos al menú lateral, seleccionamos Preferencias y posteriormente la sección General."* |
| **01:30 - 03:00** | Captura de datos demo: Razón Social `Empresa Demo CAANMA S.A. de C.V.`, RFC `EKU9003173C9`. | *"En el campo Razón Social ingresamos el nombre legal completo tal como aparece en tu Constancia de Situación Fiscal. A continuación capturamos el RFC a 12 o 13 caracteres."* |
| **03:00 - 04:30** | Selección de Régimen Fiscal `601 - General de Ley Personas Morales` y Código Postal `06000`. | *"Seleccionamos el Régimen Fiscal que corresponde a tu actividad ante el SAT e indicamos el Código Postal del domicilio fiscal principal."* |
| **04:30 - 06:15** | Ajuste del campo `Decimales` a `2` y Zona Horaria `America/Mexico_City`. | *"Establecemos los decimales con los que operará el sistema para el cálculo de precios e impuestos, así como la zona horaria oficial."* |
| **06:15 - 07:15** | Clic en `/preferencias/facturacion`. Muestra la carga de archivos `.cer` y `.key` de los CSD. | *"En la pestaña Facturación puedes cargar tus Certificados de Sello Digital para habilitar la timbración de facturas CFDI 4.0."* |
| **07:15 - 07:45** | Clic en "Guardar Cambios". Mensaje de confirmación en verde. | *"Damos clic en Guardar Cambios. Tu empresa ha quedado configurada correctamente en CAANMA."* |

#### E. Subtítulos (.srt)
```srt
1
00:00:00,000 --> 00:00:45,000
En este tutorial aprenderemos a configurar los datos fiscales e identitarios de tu empresa.
```

#### F. Indicaciones para Miniatura
* **Texto**: **CONFIGURACIÓN FISCAL Y EMPRESA**
* **Grafismo**: Icono de engrane dorado + Sello SAT / Certificado digital.

---

### VIDEO 2.2: Configuración de Usuarios, Roles y Permisos Granulares

* **Nivel de Dificultad**: Avanzado
* **Duración Estimada**: 08:30
* **Título YouTube**: `CAANMA | Cómo crear usuarios y asignar permisos por módulo`
* **Playlist**: 02 — Configuración y Preferencias

#### A. Objetivo
Enseñar a crear nuevos usuarios, asignar sucursal predeterminada, definir roles personalizados y habilitar/deshabilitar permisos específicos en la matriz de seguridad.

#### B. Prerrequisitos
Permiso `sys_users` o rol Administrador.

#### C. Descripción y Capítulos para YouTube
```markdown
Paso a paso para dar de alta usuarios y controlar accesos mediante el sistema de roles y permisos granulares de CAANMA ERP.

CAPÍTULOS:
00:00 Introducción a Control de Acceso y Usuarios
00:40 Módulo de Usuarios y Roles
01:45 Creación de un Nuevo Usuario
03:15 Configuración de Roles Personalizados (Matriz de Permisos)
05:30 Asignación de Permisos de POS, Inventario y Compras
07:15 Forzar Cambio de Contraseña y Foto Base
08:00 Prueba de Acceso del Nuevo Usuario
```

#### D. Guion de Narración y Secuencia UI paso a paso

| Timestamp | Pantalla / Acción UI (1920x1080) | Narración (Voz en Off) |
| :--- | :--- | :--- |
| **00:00 - 00:40** | Cortinilla CAANMA. Transición a `/preferencias/usuarios`. | *"En este video aprenderemos a gestionar el personal de tu empresa, creando usuarios y asignando permisos de seguridad personalizados."* |
| **00:40 - 01:45** | Clic en "Nuevo Usuario". Se abre la vista de formulario. | *"Ingresamos a Preferencias > Usuarios y hacemos clic en el botón Nuevo Usuario."* |
| **01:45 - 03:15** | Llenado de campos: Nombre `Laura Gómez`, Correo `laura@empresa.com`, Sucursal `Matriz Centro`. | *"Capturamos el nombre completo del colaborador, su correo electrónico institucional y seleccionamos la sucursal en la que operará habitualmente."* |
| **03:15 - 05:30** | Navegación a `/preferencias/roles`. Clic en "Nuevo Rol". Muestra la matriz de permisos granulares (`PERMISSION_MODULES`). | *"Para un control preciso, nos dirigimos a Roles y creamos una regla como 'Cajero Senior'. Aquí podemos activar o desactivar permisos específicos como Autorizar Descuentos o Cancelar Tickets."* |
| **05:30 - 07:15** | Se activa la casilla `pos_access`, `pos_returns` y se desactiva `inv_delete`. | *"En este ejemplo concedemos acceso a la Terminal de Ventas y Devoluciones, pero restringimos la eliminación permanente de productos del inventario."* |
| **07:15 - 08:00** | Se activa la opción `Forzar cambio de contraseña` y se guarda. | *"Activamos la casilla de cambio obligatorio de contraseña en el primer ingreso para mayor seguridad y guardamos el registro."* |
| **08:00 - 08:30** | Muestra de la tabla de usuarios con Laura Gómez creada exitosamente. | *"Como observamos, el nuevo usuario ha sido creado y su perfil de permisos ha quedado configurado en CAANMA."* |

#### E. Subtítulos (.srt)
```srt
1
00:00:00,000 --> 00:00:40,000
En este video aprenderemos a gestionar usuarios y permisos de seguridad personalizados.
```

#### F. Indicaciones para Miniatura
* **Texto**: **USUARIOS Y PERMISOS DE ACCESO**
* **Grafismo**: Candado de seguridad + Tarjeta de usuario con fotocheck.
