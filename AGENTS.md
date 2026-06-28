<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Política de Despliegue de CAANMA (A partir del 1 de Junio de 2026, 1:00 AM)

Para cualquier desarrollo, cambio o mejora en el proyecto CAANMA, se debe respetar estrictamente la siguiente directiva de despliegue y pruebas:

1. **Trabajo estrictamente Local**:
   - Todos los cambios, optimizaciones, correcciones o características nuevas se deben desarrollar y probar en el entorno local (`localhost`).

2. **Ventana de Despliegue a Netlify**:
   - El empuje (push/deploy) a Netlify de los cambios acumulados durante el día se realizará **únicamente a las 11:50 PM** de ese mismo día.
   - Antes de realizar el despliegue a las 11:50 PM, se debe llevar a cabo una suite completa de pruebas locales para verificar que la aplicación funcione a la perfección.

3. **Excepción de Publicación Inmediata**:
   - La única manera de omitir esta restricción horaria y publicar de inmediato en Netlify es si el usuario introduce explícitamente el comando: **`PUBLICAAHORA`**.

---

# Directivas para Evitar Regresiones (No Romper Funciones Existentes)

Para garantizar la estabilidad del sistema y evitar que nuevas características o correcciones descompongan funcionalidades previas que ya operan al 100%, los agentes deben seguir estrictamente estas reglas:

1. **Aislamiento de Cambios y No Destrucción de Código**:
   - Al modificar archivos (especialmente componentes compartidos de alta complejidad como `POSClient.tsx`), no se debe alterar, simplificar o eliminar código, estados de React, manejadores de eventos o clases de CSS que no tengan relación directa con el cambio solicitado.
   - Conservar la lógica de compatibilidad offline (IndexedDB), stashing de pestañas (`localStorage`), cálculo de comisiones, y soporte para precios especiales (público/mayoreo/especial) intactos.

2. **Validación en Módulos Compartidos**:
   - Si un componente o archivo de acción es reutilizado por más de una vista (por ejemplo, `POSClient.tsx` que es el núcleo para **Nueva Venta**, **Nueva Cotización** y **Nueva Consignación**), el agente tiene la obligación de probar y validar el funcionamiento del cambio en **todas** las secciones afectadas, no únicamente en la que reportó el usuario.

3. **Compilación Estática Obligatoria**:
   - Siempre, tras finalizar cualquier cambio de código, se debe ejecutar localmente el comando `npx tsc --noEmit` (o equivalente de TypeScript) para certificar que el proyecto compila a la perfección y no introduce referencias rotas, importaciones incorrectas o fallas de tipos.

4. **Preservar la Configuración de Entornos**:
   - No se deben alterar credenciales, llaves de API (ej. Facturapi) ni configuraciones de base de datos que ya estén funcionales.

