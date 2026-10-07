import { NextResponse } from 'next/server';
import { prisma, masterClient, getClientForTenant } from '@/lib/prisma';
import { getActiveBranch, getActiveUser } from '@/app/actions/auth';
import { getOrRefreshMeliToken } from '@/app/utils/meliToken';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    let branch = await getActiveBranch().catch(() => null);
    let targetBranchId = branch?.id && branch.id !== 'GLOBAL' ? branch.id : null;

    // Buscar integraciones activas de Mercado Libre
    let integrations: any[] = [];
    if (targetBranchId) {
      integrations = await prisma.storeIntegration.findMany({
        where: { branchId: targetBranchId, platform: 'MERCADO_LIBRE', isActive: true }
      });
    }

    if (integrations.length === 0) {
      integrations = await prisma.storeIntegration.findMany({
        where: { platform: 'MERCADO_LIBRE', isActive: true }
      });
    }

    if (integrations.length === 0) {
      return NextResponse.json({ success: true, questions: [] });
    }

    const allQuestionsWithDetails: any[] = [];

    for (const integration of integrations) {
      const token = await getOrRefreshMeliToken(integration.branchId);
      if (!token) continue;

      let sellerId: number | null = null;
      if (integration.metadata) {
        try {
          const meta = JSON.parse(integration.metadata);
          if (meta.userId) sellerId = Number(meta.userId);
        } catch {}
      }

      if (!sellerId) {
        try {
          const meRes = await fetch('https://api.mercadolibre.com/users/me', {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (meRes.ok) {
            const meData = await meRes.json();
            sellerId = meData.id;
          }
        } catch {}
      }

      if (!sellerId) continue;

      // Consultar preguntas no respondidas (UNANSWERED)
      try {
        const questionsResponse = await fetch(`https://api.mercadolibre.com/questions/search?seller_id=${sellerId}&status=UNANSWERED`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!questionsResponse.ok) {
          console.warn(`[MELI QUESTIONS] Respuesta no exitosa al consultar preguntas (${questionsResponse.status})`);
          continue;
        }

        const questionsData = await questionsResponse.json();
        const questions = questionsData.questions || [];

        // Obtener detalles de cada publicación
        for (const q of questions) {
          let itemTitle = 'Publicación en Mercado Libre';
          let itemPermalink = `https://articulo.mercadolibre.com.mx/${q.item_id.replace('MLM', 'MLM-')}`;
          let itemThumbnail = null;
          let itemPrice = null;

          try {
            const itemResponse = await fetch(`https://api.mercadolibre.com/items/${q.item_id}`, {
              headers: { 'Authorization': `Bearer ${token}` }
            });
            if (itemResponse.ok) {
              const itemBody = await itemResponse.json();
              itemTitle = itemBody.title || itemTitle;
              itemPermalink = itemBody.permalink || itemPermalink;
              itemThumbnail = itemBody.thumbnail || itemBody.secure_thumbnail || null;
              itemPrice = itemBody.price || null;
            }
          } catch {}

          allQuestionsWithDetails.push({
            id: String(q.id),
            text: q.text,
            status: q.status,
            date_created: q.date_created,
            from_id: q.from?.id ? String(q.from.id) : null,
            item_id: q.item_id,
            item_title: itemTitle,
            item_permalink: itemPermalink,
            item_thumbnail: itemThumbnail,
            item_price: itemPrice,
            branch_id: integration.branchId
          });
        }
      } catch (qErr) {
        console.error('[MELI QUESTIONS] Error fetching questions for seller:', qErr);
      }
    }

    return NextResponse.json({ success: true, questions: allQuestionsWithDetails });

  } catch (error: any) {
    console.error('[MELI QUESTIONS API] Error:', error);
    return NextResponse.json({ error: error.message || String(error) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { questionId, text, branchId } = await req.json();
    if (!questionId || !text) {
      return NextResponse.json({ error: 'Falta questionId o texto de respuesta.' }, { status: 400 });
    }

    let targetBranchId = branchId;
    if (!targetBranchId) {
      const activeBranch = await getActiveBranch().catch(() => null);
      if (activeBranch?.id && activeBranch.id !== 'GLOBAL') {
        targetBranchId = activeBranch.id;
      }
    }

    // Si aún no tenemos branchId, buscar cualquier integración activa de Mercado Libre
    if (!targetBranchId) {
      const firstInteg = await prisma.storeIntegration.findFirst({
        where: { platform: 'MERCADO_LIBRE', isActive: true }
      });
      targetBranchId = firstInteg?.branchId;
    }

    if (!targetBranchId) {
      return NextResponse.json({ error: 'No se encontró ninguna sucursal con integración de Mercado Libre activa.' }, { status: 400 });
    }

    const token = await getOrRefreshMeliToken(targetBranchId);
    if (!token) {
      return NextResponse.json({ error: 'Token de Mercado Libre no disponible o sesión expirada.' }, { status: 400 });
    }

    console.log(`[MELI QUESTIONS] Enviando respuesta oficial a pregunta ${questionId} en sucursal ${targetBranchId}: "${text}"`);

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
        text: text.trim()
      })
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok || data.error) {
      console.error('[MELI QUESTIONS] Error al responder:', data);
      const errMsg = data.message || data.error || (Array.isArray(data.cause) ? data.cause.map((c: any) => c.message).join(', ') : 'Error al enviar respuesta a Mercado Libre.');
      return NextResponse.json({ error: errMsg }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: 'Respuesta enviada correctamente a Mercado Libre.', data });

  } catch (error: any) {
    console.error('[MELI QUESTIONS API POST] Error:', error);
    return NextResponse.json({ error: error.message || String(error) }, { status: 500 });
  }
}
