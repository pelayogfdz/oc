# CATEGORÍA 06 — PUNTO DE VENTA Y MANEJO DE CAJA

## Playlist YouTube: `06 — Punto de Venta y Caja`

---

### VIDEO 6.1: Apertura de Caja, Movimientos de Efectivo y Fondo Inicial

* **Nivel de Dificultad**: Básico
* **Duración Estimada**: 04:45
* **Título YouTube**: `CAANMA | Apertura de caja, depósitos y retiros de efectivo`
* **Playlist**: 06 — Punto de Venta y Caja

#### A. Objetivo
Aprender a iniciar turno operativamente realizando la Apertura de Caja con fondo inicial (`CashSession`), registrar Entradas (depósitos) y Salidas (retiros para pago de servicios o gastos menores).

#### B. Prerrequisitos
Permiso `cash_open_close` y `cash_movements`.

#### C. Descripción y Capítulos para YouTube
```markdown
Aprende a realizar la apertura diaria de caja y registrar los movimientos de dinero durante la jornada laboral en CAANMA ERP.

CAPÍTULOS:
00:00 Introducción al Manejo de Caja
00:40 Apertura de Turno de Caja y Fondo Inicial
02:00 Registro de Entradas Directas de Dinero (Depósitos)
03:15 Registro de Salidas / Retiros de Caja (Gastos Menores)
04:15 Resumen del Balance de Turno
```

#### D. Guion de Narración y Secuencia UI paso a paso

| Timestamp | Pantalla / Acción UI (1920x1080) | Narración (Voz en Off) |
| :--- | :--- | :--- |
| **00:00 - 00:40** | Cortinilla CAANMA. Transición a `/caja/actual`. | *"En este tutorial aprenderemos a realizar la apertura de turno de caja e ingresar movimientos de efectivo en CAANMA ERP."* |
| **00:40 - 02:00** | Pantalla de Apertura de Caja. Captura en `Monto Inicial / Fondo`: `$1,000.00`. Clic en "Abrir Caja". | *"Al iniciar operaciones, el sistema nos solicitará declarar el fondo inicial de efectivo. Ingresamos el monto y hacemos clic en Abrir Caja."* |
| **02:00 - 03:15** | Clic en el botón "Ingresar Dinero (Depósito)". Captura de Monto `$500.00` y Concepto *"Fondo de Morralla Adicional"*. | *"Si durante el turno recibes efectivo adicional para morralla, registramos una Entrada de Dinero indicando el monto y el motivo."* |
| **03:15 - 04:15** | Clic en "Retirar Dinero (Retiro)". Captura de Monto `$200.00` y Concepto *"Pago de Flete Local / Garrafones de Agua"*. | *"Para realizar pagos menores de la sucursal, seleccionamos Retiro de Dinero, especificamos la cantidad extraída y la justificación correspondiente."* |
| **04:15 - 04:45** | Muestra de la tabla de movimientos en `/caja/actual` con el balance proyectado. | *"Todos los movimientos quedan registrados en la bitacora de la sesión activa para garantizar la transparencia del arqueo final."* |

#### E. Subtítulos (.srt)
```srt
1
00:00:00,000 --> 00:00:40,000
En este tutorial aprenderemos a realizar la apertura de turno de caja e ingresar movimientos.
```

#### F. Indicaciones para Miniatura
* **Texto**: **APERTURA Y MOVIMIENTOS DE CAJA**
* **Grafismo**: Caja registradora abierta + Billetes y monedas de morralla.

---

### VIDEO 6.2: Arqueo, Desglose por Denominación y Corte de Caja

* **Nivel de Dificultad**: Intermedio
* **Duración Estimada**: 06:15
* **Título YouTube**: `CAANMA | Cómo hacer el Arqueo y Corte de Caja al cerrar turno`
* **Playlist**: 06 — Punto de Venta y Caja

#### A. Objetivo
Aprender a realizar el Cierre de Caja al finalizar el turno, conteo físico de billetes y monedas por denominación, cálculo automático de diferencia (sobrante/faltante) e impresión del ticket de corte (`/imprimir-corte`).

#### B. Prerrequisitos
Tener una sesión de caja abierta con ventas realizadas durante el turno.

#### C. Descripción y Capítulos para YouTube
```markdown
Paso a paso para realizar el conteo de dinero, declarar denominaciones y realizar el corte de caja transparente en CAANMA ERP.

CAPÍTULOS:
00:00 Introducción al Corte de Caja
00:45 Acceso al Módulo de Cierre de Sesión
01:45 Conteo Físico por Denominación de Billetes y Monedas
03:30 Verificación de Totales en Efectivo, Tarjeta y Transferencia
04:45 Cálculo de Diferencias (Faltantes / Sobrantes)
05:30 Impresión del Ticket de Cierre y Finalización
```

#### D. Guion de Narración y Secuencia UI paso a paso

| Timestamp | Pantalla / Acción UI (1920x1080) | Narración (Voz en Off) |
| :--- | :--- | :--- |
| **00:00 - 00:45** | Cortinilla CAANMA. Transición a `/caja/actual`. | *"En este tutorial aprenderemos a realizar el arqueo y cierre de caja al finalizar tu turno de trabajo en CAANMA ERP."* |
| **00:45 - 01:45** | Clic en el botón "Cerrar Caja". Se despliega el formulario de desglose de efectivo. | *"Al concluir las operaciones, seleccionamos la opción Cerrar Caja."* |
| **01:45 - 03:30** | Captura del desglose por billetes: 5 billetes de $500, 10 de $200, 15 de $100, etc. El sistema calcula el acumulado total. | *"Utilizamos la calculadora de denominaciones ingresando el número de billetes y monedas contados físicamente en el cajón."* |
| **03:30 - 04:45** | Se revisa la columna de `Esperado` vs `Declarado`. Si coincide, la diferencia marca `$0.00`. | *"CAANMA comparará el dinero ingresado contra el total de ventas y movimientos registrados, calculando si existe alguna diferencia o si el arqueo es exacto."* |
| **04:45 - 05:30** | Se agregan notas de observaciones opcionales y se da clic en "Confirmar Cierre de Caja". | *"Ingresamos observaciones si hubiese algún evento relevante durante el turno y confirmamos el cierre definitivo de la sesión."* |
| **05:30 - 06:15** | Ventana emergente con la impresión del Ticket de Corte de Caja (`/imprimir-corte`). | *"El sistema emitirá el comprobante de corte de caja listo para imprimirse o guardarse para auditoría administrativa. Has realizado el corte de caja en CAANMA."* |

#### E. Subtítulos (.srt)
```srt
1
00:00:00,000 --> 00:00:45,000
En este tutorial aprenderemos a realizar el arqueo y cierre de caja al finalizar tu turno.
```

#### F. Indicaciones para Miniatura
* **Texto**: **CORTE DE CAJA PASO A PASO**
* **Grafismo**: Reporte de cierre de caja con sello "Cierre OK" + Calculadora.
