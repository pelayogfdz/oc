/**
 * Utilidad de compresión de imágenes en el cliente (navegador/móvil).
 * Reduce fotografías de alta resolución (cámaras de 12MP - 108MP de smartphones)
 * a una resolución óptima para auditoría/evidencia (~1280px máx) y formato JPEG comprimido.
 * Evita errores 413 (Payload Too Large / Body exceeded limit) y bloqueos en redes móviles.
 */

export async function compressImageFile(
  file: File | Blob,
  maxDimension = 1280,
  quality = 0.75
): Promise<string> {
  return new Promise((resolve, reject) => {
    // Si no es imagen, intentar leer directamente como DataURL
    if (file.type && !file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
      return;
    }

    const reader = new FileReader();
    reader.onerror = (err) => reject(err);
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => {
        // Fallback en caso de que no se pueda decodificar la imagen
        resolve(e.target?.result as string);
      };
      img.onload = () => {
        try {
          let width = img.naturalWidth || img.width;
          let height = img.naturalHeight || img.height;

          // Si la imagen es más grande que maxDimension en cualquier eje, redimensionar proporcionalmente
          if (width > maxDimension || height > maxDimension) {
            if (width > height) {
              height = Math.round((height * maxDimension) / width);
              width = maxDimension;
            } else {
              width = Math.round((width * maxDimension) / height);
              height = maxDimension;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(e.target?.result as string);
            return;
          }

          // Dibujar en canvas con suavizado
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, width, height);

          // Convertir a JPEG comprimido
          const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
          resolve(compressedDataUrl);
        } catch (err) {
          console.warn('Error durante compresión en canvas, usando fallback:', err);
          resolve(e.target?.result as string);
        }
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}
