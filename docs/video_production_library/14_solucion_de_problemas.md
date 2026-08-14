# CATEGORÍA 14 — SOLUCIÓN DE PROBLEMAS (TROUBLESHOOTING)

## Playlist YouTube: `14 — Solución de Problemas CAANMA`

---

### VIDEO 14.1: ¿Por Qué Marca Error la Factura por Código Postal o Régimen Fiscal?

* **Nivel de Dificultad**: Solución de Problemas (Troubleshooting)
* **Duración Estimada**: 03:45
* **Título YouTube**: `CAANMA | Solución: Error de Código Postal o Régimen Fiscal al facturar`
* **Playlist**: 14 — Solución de Problemas CAANMA

#### A. Objetivo
Explicar la causa del rechazo de timbrado por incongruencia con la Lista de LCO/Constancia SAT del cliente y cómo corregirlo de forma inmediata dentro del expediente del cliente en CAANMA.

#### B. Prerrequisitos
Tener un intento de factura rechazado por error de validación fiscal SAT CFDI 4.0.

#### C. Descripción y Capítulos para YouTube
```markdown
Resuelve el error habitual del SAT al timbrar facturas: alineación exacta del Código Postal y Régimen Fiscal con la Constancia de Situación Fiscal en CAANMA ERP.

CAPÍTULOS:
00:00 Introducción y Diagnóstico del Mensaje de Error SAT
01:00 Causa del Problema: Regla de Validación CFDI 4.0
01:45 Edición de la Ficha del Cliente en CAANMA
02:40 Corrección de Código Postal y Régimen Fiscal
03:15 Reintento de Timbrado Exitoso
```

#### D. Guion de Narración y Secuencia UI paso a paso

| Timestamp | Pantalla / Acción UI (1920x1080) | Narración (Voz en Off) |
| :--- | :--- | :--- |
| **00:00 - 01:00** | Cortinilla CAANMA. Se muestra el mensaje de rechazo de timbrado: *"El campo Nombre / Código Postal / Régimen Fiscal del receptor no coincide con la lista del SAT"*. | *"¿Intentas timbrar una factura y el SAT rechaza el documento por error en el Código Postal o Régimen Fiscal? En este video te mostramos cómo solucionarlo en un minuto."* |
| **01:00 - 01:45** | Zoom al error de validación. Explicación didáctica en pantalla. | *"En la versión CFDI 4.0, el SAT exige que la Razón Social (sin S.A. de C.V.), el Código Postal y el Régimen Fiscal coincidan idénticamente carácter por carácter con la Constancia de Situación Fiscal del cliente."* |
| **01:45 - 02:40** | Navegación a `/clientes`. Búsqueda del cliente y clic en "Editar" (`/clientes/[id]/editar`). | *"Para corregirlo, nos dirigimos al módulo de Clientes, buscamos la ficha del cliente emisor y hacemos clic en Editar."* |
| **02:40 - 03:15** | Corrección del CP de `06001` a `06000` y eliminación del régimen obsoleto. Clic en "Guardar". | *"Verificamos la Constancia del cliente y corregimos el Código Postal o el Régimen Fiscal seleccionado. Guardamos los cambios."* |
| **03:15 - 03:45** | Regreso a `/facturas/ventas`. Clic en "Reintentar Timbrado". Mensaje verde con el Folio Fiscal UUID timbrado. | *"Regresamos a la factura rechazada y hacemos clic en Timbrar. CAANMA procesará el comprobante fiscal exitosamente. Error solucionado."* |

#### E. Subtítulos (.srt)
```srt
1
00:00:00,000 --> 00:01:00,000
¿Intentas timbrar una factura y el SAT rechaza el documento por error en los datos?
```

#### F. Indicaciones para Miniatura
* **Texto**: **SOLUCIÓN: ERROR CÓDIGO POSTAL / SAT**
* **Grafismo**: Advertencia roja de error SAT transformándose en Check Verde de Timbrado Exitoso.

---

### VIDEO 14.2: ¿Por Qué mi Efectivo en Caja no Coincide con el Sistema?

* **Nivel de Dificultad**: Solución de Problemas (Troubleshooting)
* **Duración Estimada**: 04:15
* **Título YouTube**: `CAANMA | Solución: Diferencias de efectivo y faltantes en Corte de Caja`
* **Playlist**: 14 — Solución de Problemas CAANMA

#### A. Objetivo
Guía de diagnóstico cuando existe discrepancia (faltante/sobrante) al realizar el corte de caja: auditar cobros con tarjeta registrados erróneamente como efectivo, salidas no declaradas y corrección de arqueo.

#### B. Prerrequisitos
Tener una sesión de caja con diferencia en el balance.

#### C. Descripción y Capítulos para YouTube
```markdown
Diagnostica y corrige las diferencias de dinero en el Corte de Caja con la auditoría de movimientos de turno en CAANMA ERP.

CAPÍTULOS:
00:00 Introducción a Diferencias en Corte de Caja
00:50 Verificación del Histórico de Ventas de la Sesión
01:45 Auditoría de Métodos de Pago (Tarjeta vs Efectivo)
02:50 Revisión de Retiros y Entradas no Registrados
03:40 Ajuste y Regularización de la Sesión de Caja
```

#### D. Guion de Narración y Secuencia UI paso a paso

| Timestamp | Pantalla / Acción UI (1920x1080) | Narración (Voz en Off) |
| :--- | :--- | :--- |
| **00:00 - 00:50** | Cortinilla CAANMA. Transición a la pantalla de Corte de Caja con una diferencia de `-$200.00`. | *"¿Al cerrar tu turno en el corte de caja descubres que el efectivo esperado no coincide con el contado? En este video aprenderemos a auditar y corregir la causa."* |
| **00:50 - 01:45** | Navegación al desglose de movimientos en `/caja/actual`. | *"La causa más frecuente de descuadre ocurre cuando una venta cobrada con tarjeta bancaria se registró por error en el sistema como pago en efectivo."* |
| **01:45 - 02:50** | Revisión del Historial de Ventas del turno (`/ventas`). Filtro por la sesión activa. | *"Revisamos el historial de ventas del turno y comparamos los vauchers bancarios físicos contra las transacciones registradas."* |
| **02:50 - 03:40** | Se identifica una venta de $200 cobrada en tarjeta pero marcada como efectivo. Se corrige el método de pago de la venta. | *"Al identificar la venta mal clasificada, editamos el método de pago a Tarjeta Bancaria con los permisos correspondientes."* |
| **03:40 - 04:15** | Regreso a la pantalla de Cierre de Caja. La diferencia recalcula a `$0.00` (Cuadre Perfecto). | *"Al regresar a la pantalla de Cierre de Caja, el dinero esperado en efectivo se recalcula y la diferencia queda totalmente resuelta en cero. CAANMA garantiza el control transparente de tus arqueos."* |

#### E. Subtítulos (.srt)
```srt
1
00:00:00,000 --> 00:00:50,000
¿Al cerrar tu turno en el corte de caja descubres que el efectivo esperado no coincide?
```

#### F. Indicaciones para Miniatura
* **Texto**: **SOLUCIÓN: DIFERENCIA EN CORTE DE CAJA**
* **Grafismo**: Lupa auditando billetes en caja registradora + Balance cuadrado en cero.
