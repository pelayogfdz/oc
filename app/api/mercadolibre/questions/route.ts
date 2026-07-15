import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getActiveBranch } from '@/app/actions/auth';
import { getOrRefreshMeliToken } from '@/app/utils/meliToken';

export async function GET(req: Request) {
  try {
    const branch = await getActiveBranch();
    const token = await getOrRefreshMeliToken(branch.id);

    if (!token) {
      return NextResponse.json({ error: 'Configuración de Mercado Libre no encontrada o desconectada.' }, { status: 400 });
    }

    // 1. Obtener ID de usuario de Mercado Libre
    const meResponse = await fetch('https://api.mercadolibre.com/users/me', {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!meResponse.ok) {
      console.error('[MELI QUESTIONS] Error al conectar con cuenta de ML:', await meResponse.text());
      return NextResponse.json({ error: 'Error al autenticar con Mercado Libre.' }, { status: 400 });
    }

    const meData = await meResponse.json();
    const sellerId = meData.id;

    // 2. Traer las preguntas sin responder
    const questionsResponse = await fetch(`https://api.mercadolibre.com/questions/search?seller_id=${sellerId}&status=UNANSWERED`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!questionsResponse.ok) {
      console.error('[MELI QUESTIONS] Error al obtener preguntas:', await questionsResponse.text());
      return NextResponse.json({ error: 'Error al consultar preguntas de Mercado Libre.' }, { status: 400 });
    }

    const questionsData = await questionsResponse.json();
    const questions = questionsData.questions || [];

    // 3. De cada pregunta, intentar obtener el detalle del item relacionado (título, link, etc.)
    const questionsWithDetails = [];
    for (const q of questions) {
      const itemResponse = await fetch(`https://api.mercadolibre.com/items/${q.item_id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      let itemTitle = 'Publicación Desconocida';
      let itemPermalink = '#';

      if (itemResponse.ok) {
        const itemBody = await itemResponse.json();
        itemTitle = itemBody.title;
        itemPermalink = itemBody.permalink;
      }

      questionsWithDetails.push({
        id: q.id,
        text: q.text,
        status: q.status,
        date_created: q.date_created,
        item_id: q.item_id,
        item_title: itemTitle,
        item_permalink: itemPermalink
      });
    }

    return NextResponse.json({ success: true, questions: questionsWithDetails });

  } catch (error: any) {
    console.error('[MELI QUESTIONS API] Error:', error);
    return NextResponse.json({ error: error.message || String(error) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const branch = await getActiveBranch();
    const token = await getOrRefreshMeliToken(branch.id);

    if (!token) {
      return NextResponse.json({ error: 'Configuración o token de Mercado Libre no encontrado.' }, { status: 400 });
    }

    const { questionId, text } = await req.json();
    if (!questionId || !text) {
      return NextResponse.json({ error: 'Falta questionId o texto de respuesta.' }, { status: 400 });
    }

    console.log(`[MELI QUESTIONS] Enviando respuesta a pregunta ${questionId}: "${text}"`);

    // Enviar respuesta a la API de Mercado Libre
    const response = await fetch('https://api.mercadolibre.com/answers', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        question_id: Number(questionId),
        text: text
      })
    });

    const data = await response.json();

    if (!response.ok || data.error) {
      console.error('[MELI QUESTIONS] Error al responder:', data);
      return NextResponse.json({ error: data.message || data.error || 'Error al enviar respuesta.' }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: 'Respuesta enviada correctamente.', data });

  } catch (error: any) {
    console.error('[MELI QUESTIONS API POST] Error:', error);
    return NextResponse.json({ error: error.message || String(error) }, { status: 500 });
  }
}
