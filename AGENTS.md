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
