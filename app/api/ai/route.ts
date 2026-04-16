import { NextResponse } from 'next/server';
import { getAuthUser } from '@/app/actions/auth';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function POST(req: Request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { prompt, branchContext, userContext } = await req.json();

    if (!prompt) {
      return NextResponse.json({ error: 'El prompt es requerido' }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    
    if (!apiKey || apiKey === 'tu_clave_aqui') {
      return NextResponse.json({ 
        error: 'La clave de Gemini API (GEMINI_API_KEY) no está configurada en .env. Cópiala desde Google AI Studio e insértala.'
      }, { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-pro" });

    const systemPrompt = `
Eres el Asistente Inteligente oficial del sistema Office City (CAANMA PRO). 
Tu base de usuarios son administradores y gerentes que buscan asesoramiento en retail, inventario, papelería y flujo de caja.

Información de contexto:
- Usuario solicitante: ${userContext?.name} (${userContext?.role})
- Sucursal Activa en interfaz: ${branchContext?.id === 'GLOBAL' ? 'Todas las Sucursales (VISTA GLOBAL)' : branchContext?.name || 'Central'}

Instrucciones:
1. Responde en español de forma profesional, amable y concisa.
2. Si te piden formato tabla, usa el estándar Markdown para crear tablas hermosas.
3. El módulo todavía no inyecta en vivo toda la base de datos a ti, así que si preguntan datos exactos que no conoces, dilo claramente. Pídeles que te pongan los montos o copien/peguen los datos y tú los procesarás.
`;

    const fullPrompt = `${systemPrompt}\n\nPregunta del usuario:\n${prompt}`;

    const result = await model.generateContent(fullPrompt);
    const responseText = result.response.text();

    return NextResponse.json({ text: responseText });
    
  } catch (error: any) {
    console.error('AI Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
