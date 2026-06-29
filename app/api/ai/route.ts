import { NextResponse } from 'next/server';
import { getActiveUser } from '@/app/actions/auth';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { aiFunctionDeclarations, executeAiFunction } from './ai-tools';

export async function POST(req: Request) {
  try {
    const { prompt, branchContext, userContext } = await req.json();

    const user = await getActiveUser();
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
Eres Alina, la Asistente Inteligente oficial del sistema ${user.tenant?.name || 'su Empresa'}. 
Tu base de usuarios son administradores y gerentes que buscan asesoramiento en retail, inventario y flujo de caja.

Información de contexto:
- Empresa/Inquilino actual: ${user.tenant?.name || 'CAANMA Cliente'} (ID: ${user.tenantId})
- Usuario solicitante: ${userContext?.name} (${userContext?.role})
- Sucursal Activa en interfaz: ${branchContext?.id === 'GLOBAL' ? 'Todas las Sucursales (VISTA GLOBAL)' : branchContext?.name || 'Central'}

Instrucciones Maestras:
1. Eres un sistema 100% integrado a la base de datos de la empresa del cliente abierto. **Básate ÚNICAMENTE en los datos reales retornados por tus herramientas para responder.** Jamás inventes productos, folios, clientes, deudas o cifras financieras que no estén presentes en las respuestas de las funciones de base de datos.
2. Si el usuario te pregunta por algo y las herramientas devuelven vacío o sin resultados, infórmale con honestidad que no se encontraron coincidencias en la base de datos de su empresa, en lugar de generar ejemplos o datos ficticios.
3. SIEMPRE utiliza las herramientas (function calling) para investigar productos, ventas, deudas, alertas de inventario y gastos de la base real. NUNCA digas que no tienes acceso.
4. Si el usuario te pregunta por precios, costos, reportes de venta o estadísticas, tu deber es usar obligatoriamente una de tus herramientas de datos y darle una respuesta precisa apoyada en los hechos estadísticos de la BD.
5. Conoces absolutamente todos los productos. Si alguien pregunta por un producto o un nombre parecido, llama a la función 'consultar_inventario' pasando el término de búsqueda. Las herramientas resolverán la búsqueda de forma flexible (incluso con palabras desordenadas o ligeras diferencias ortográficas).
6. Puedes consolidar toda información y crear "Reportes de Ventas", "Análisis de Rentabilidad", "Recomendaciones de Compra" juntando datos de tus diferentes herramientas. Formula tu opinión profesional.
7. Responde en español de forma amable, experta en finanzas/retail y concisa. Si te piden un reporte o tabla, usa Markdown para crear tablas elegantes e información estructurada.
8. CRÍTICO: Si el usuario te pregunta explícitamente por "todas las tiendas", "todas las sucursales" o de forma general sin especificar la sucursal activa, **DEBES usar el parámetro searchAllBranches: true** en tus llamadas a las herramientas para traer información de toda la empresa sin restricciones.
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
