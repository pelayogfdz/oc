import { NextResponse } from 'next/server';
import { getActiveUser } from '@/app/actions/auth';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { aiFunctionDeclarations, executeAiFunction } from './ai-tools';

export async function POST(req: Request) {
  try {
    const { prompt, branchContext, userContext } = await req.json();

    const user = await getActiveUser(branchContext?.id || 'GLOBAL');
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

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
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.5-pro",
      tools: [{ functionDeclarations: aiFunctionDeclarations }]
    });

    const systemPrompt = `
Eres Alina, la Asistente Inteligente oficial del sistema Office City (CAANMA PRO). 
Tu base de usuarios son administradores y gerentes que buscan asesoramiento en retail, inventario, papelería y flujo de caja.

Información de contexto:
- Usuario solicitante: ${userContext?.name} (${userContext?.role})
- Sucursal Activa en interfaz: ${branchContext?.id === 'GLOBAL' ? 'Todas las Sucursales (VISTA GLOBAL)' : branchContext?.name || 'Central'}

Instrucciones Maestras:
1. Eres un sistema 100% integrado a la base de datos de la empresa. **SIEMPRE utiliza las herramientas que se te han proporcionado (function calling) para investigar productos, ventas, deudas, alertas de inventario y gastos de la base real.** 
2. NUNCA digas que "no tienes conexión", "no tienes acceso al sistema", "no puedes acceder a datos comerciales" o "no puedes ver los costos". ESTO ES FALSO. Tu propia arquitectura te permite usar `consultar_inventario`, `obtener_ventas`, etc. para obtener estos datos en tiempo real. 
3. Si el usuario te pregunta por precios, costos, reportes de venta o estadísticas, tu deber es usar obligatoriamente una de tus herramientas de datos y darle una respuesta precisa apoyada en los hechos estadísticos de la BD. 
4. Conoces absolutamente todos los productos. Si alguien pregunta por un producto, llama a la función `consultar_inventario` pasando el string de búsqueda. El resultado incluirá existencias reales, precios y COSTOS de última compra.
5. Puedes consolidar toda información y crear "Reportes de Ventas", "Análisis de Rentabilidad", "Recomendaciones de Compra" juntando datos de tus diferentes herramientas. Formula tu opinión profesional.
6. Responde en español de forma amable, experta en finanzas/retail y concisa. Si te piden un reporte o tabla, usa Markdown para crear tablas elegantes e información estructurada.
`;

    const fullPrompt = `${systemPrompt}\n\nPregunta del usuario:\n${prompt}`;

    const chat = model.startChat();
    const result = await chat.sendMessage(fullPrompt);
    
    let responseText = '';
    const functionCalls = result.response.functionCalls();
    
    if (functionCalls && functionCalls.length > 0) {
      const call = functionCalls[0];
      console.log(`[AI-TOOL-EXEC] Alina solicitó la herramienta: ${call.name}`);
      
      const dbResult = await executeAiFunction(call.name, call.args, branchContext);
      
      const result2 = await chat.sendMessage([{
        functionResponse: {
          name: call.name,
          response: dbResult
        }
      }]);
      
      responseText = result2.response.text();
    } else {
      responseText = result.response.text();
    }

    return NextResponse.json({ text: responseText });
    
  } catch (error: any) {
    console.error('AI Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
