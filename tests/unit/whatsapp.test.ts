import { describe, it, expect } from "vitest";

describe("WhatsApp Features and Utilities", () => {
  const getInitials = (name?: string) => {
    if (!name) return "WA";
    const clean = name.trim().replace(/^[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ]+/, '');
    const parts = clean.split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  };

  const getExtensionFromMimetype = (mimetype: string): string => {
    if (!mimetype) return '';
    const mime = mimetype.toLowerCase();
    if (mime.includes('pdf')) return '.pdf';
    if (mime.includes('excel') || mime.includes('spreadsheetml') || mime.includes('sheet') || mime.includes('csv')) return '.xlsx';
    if (mime.includes('word') || mime.includes('officedocument.wordprocessingml') || mime.includes('msword')) return '.docx';
    if (mime.includes('powerpoint') || mime.includes('presentationml')) return '.pptx';
    if (mime.includes('jpeg') || mime.includes('jpg')) return '.jpg';
    if (mime.includes('png')) return '.png';
    if (mime.includes('webp')) return '.webp';
    if (mime.includes('gif')) return '.gif';
    if (mime.includes('mp4')) return '.mp4';
    if (mime.includes('audio/ogg') || mime.includes('opus')) return '.ogg';
    if (mime.includes('audio/mpeg') || mime.includes('mp3')) return '.mp3';
    return '';
  };

  const ensureExtension = (filename: string, mimetype: string): string => {
    if (!filename) filename = 'archivo';
    const ext = getExtensionFromMimetype(mimetype);
    if (ext && !filename.toLowerCase().endsWith(ext)) {
      const hasAnyExtension = /\.[a-zA-Z0-9]{2,4}$/.test(filename);
      if (!hasAnyExtension) {
        return `${filename}${ext}`;
      }
    }
    return filename;
  };

  const parseMediaMsg = (body: string) => {
    if (!body) return { isMedia: false, type: "", caption: "", filename: "", base64Data: "" };

    let raw = body.trim();
    let type = "";
    let rest = "";
    let isMedia = false;
    let filename = "";

    const tagMatch = raw.match(/^(?:📎|📷|🖼️|📄|🎥|🎵|📇)?\s*\[(Imagen|Video|Audio|Documento|Archivo|Sticker|Nota de voz)(?::\s*([^\]]*))?\](?::?\s*([\s\S]*))?$/i);

    if (tagMatch) {
      isMedia = true;
      type = tagMatch[1];
      filename = tagMatch[2]?.trim() || "";
      rest = tagMatch[3]?.trim() || "";
      if (type.toLowerCase() === 'nota de voz') type = 'Audio';
    }

    return {
      isMedia,
      type,
      caption: rest,
      filename: filename || (type === "Imagen" ? "imagen.jpg" : "archivo")
    };
  };

  it("extracts correct contact initials", () => {
    expect(getInitials("Juan Pérez")).toBe("JP");
    expect(getInitials("Office City")).toBe("OC");
    expect(getInitials("Alimentos")).toBe("AL");
    expect(getInitials("")).toBe("WA");
    expect(getInitials("  ✨ Pedro Infante  ")).toBe("PI");
  });

  it("ensures correct file extensions from mime types", () => {
    expect(ensureExtension("factura", "application/pdf")).toBe("factura.pdf");
    expect(ensureExtension("factura.pdf", "application/pdf")).toBe("factura.pdf");
    expect(ensureExtension("foto", "image/jpeg")).toBe("foto.jpg");
    expect(ensureExtension("foto.png", "image/png")).toBe("foto.png");
    expect(ensureExtension("reporte", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")).toBe("reporte.xlsx");
  });

  it("parses WhatsApp media tags and captions", () => {
    const parsedImg = parseMediaMsg("📷 [Imagen: captura.jpg]: Mira este comprobante");
    expect(parsedImg.isMedia).toBe(true);
    expect(parsedImg.type).toBe("Imagen");
    expect(parsedImg.filename).toBe("captura.jpg");
    expect(parsedImg.caption).toBe("Mira este comprobante");

    const parsedDoc = parseMediaMsg("📄 [Documento: cotizacion_123.pdf]");
    expect(parsedDoc.isMedia).toBe(true);
    expect(parsedDoc.type).toBe("Documento");
    expect(parsedDoc.filename).toBe("cotizacion_123.pdf");
  });

  it("handles non-media normal messages", () => {
    const parsedText = parseMediaMsg("Hola, ¿tienen tóner para HP?");
    expect(parsedText.isMedia).toBe(false);
  });
});
