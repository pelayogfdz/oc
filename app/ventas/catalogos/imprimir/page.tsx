import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { decrypt } from '@/lib/session';
import PrintControls from './PrintControls';

export const dynamic = 'force-dynamic';

interface PrintPageProps {
  searchParams: Promise<{
    type?: string;
    brands?: string;
    categories?: string;
    ids?: string;
    limit?: string;
  }>;
}

export default async function PrintCatalogPage({ searchParams }: PrintPageProps) {
  let products: any[] = [];
  let branchName = 'Sucursal Principal';
  let tenantName = 'CAANMA';
  let type: 'brands' | 'special' | 'promotions' = 'brands';

  const params = (await searchParams) || {};
  type = (params.type || 'brands') as 'brands' | 'special' | 'promotions';

  // Normalización segura de parámetros de búsqueda para evitar caídas por arreglos u objetos inesperados
  const getParamString = (val: any): string => {
    if (!val) return '';
    if (Array.isArray(val)) return val.join(',');
    return String(val);
  };

  const brands = getParamString(params.brands).split(',').filter(Boolean);
  const categories = getParamString(params.categories).split(',').filter(Boolean);
  const selectedIds = getParamString(params.ids).split(',').filter(Boolean);
  const limit = params.limit ? parseInt(String(params.limit)) || 100 : 100;

  // Obtener sesión y cookies directamente sin llamar a Server Actions externas
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('session')?.value;
  if (!sessionCookie) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)',
        color: 'white',
        fontFamily: "'Outfit', sans-serif",
        padding: '2rem',
        boxSizing: 'border-box'
      }}>
        <div style={{
          backgroundColor: 'rgba(255, 255, 255, 0.03)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '24px',
          padding: '3rem 2rem',
          maxWidth: '500px',
          width: '100%',
          textAlign: 'center',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)'
        }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.5rem auto'
          }}>
            <svg style={{ width: '32px', height: '32px', stroke: '#ef4444', strokeWidth: 2, fill: 'none' }} viewBox="0 0 24 24">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
            </svg>
          </div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: '0 0 1rem 0', background: 'linear-gradient(to right, #ffedd5, #fca5a5)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Acceso Restringido
          </h1>
          <p style={{ color: '#94a3b8', fontSize: '1rem', lineHeight: '1.6', margin: '0 0 2rem 0' }}>
            No se encontró una sesión activa en este navegador. Para poder exportar y descargar el catálogo en PDF, debes iniciar sesión en la plataforma.
          </p>
          <a href="/login" style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#7c3aed',
            color: 'white',
            fontWeight: 'bold',
            padding: '0.85rem 2rem',
            borderRadius: '50px',
            textDecoration: 'none',
            fontSize: '0.95rem',
            boxShadow: '0 10px 20px rgba(124, 58, 237, 0.3)',
            transition: 'all 0.2s hover'
          }}>
            Iniciar Sesión
          </a>
        </div>
      </div>
    );
  }

  const session = await decrypt(sessionCookie);
  if (!session?.userId || !session?.tenantId) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)',
        color: 'white',
        fontFamily: "'Outfit', sans-serif",
        padding: '2rem',
        boxSizing: 'border-box'
      }}>
        <div style={{
          backgroundColor: 'rgba(255, 255, 255, 0.03)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '24px',
          padding: '3rem 2rem',
          maxWidth: '500px',
          width: '100%',
          textAlign: 'center',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)'
        }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.5rem auto'
          }}>
            <svg style={{ width: '32px', height: '32px', stroke: '#ef4444', strokeWidth: 2, fill: 'none' }} viewBox="0 0 24 24">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
              <line x1="12" y1="9" x2="12" y2="13"></line>
              <line x1="12" y1="17" x2="12.01" y2="17"></line>
            </svg>
          </div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: '0 0 1rem 0', background: 'linear-gradient(to right, #ffedd5, #fca5a5)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Sesión Expirada
          </h1>
          <p style={{ color: '#94a3b8', fontSize: '1rem', lineHeight: '1.6', margin: '0 0 2rem 0' }}>
            Tu sesión no es válida o ha caducado por motivos de seguridad. Vuelve a ingresar tus credenciales para continuar.
          </p>
          <a href="/login" style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#7c3aed',
            color: 'white',
            fontWeight: 'bold',
            padding: '0.85rem 2rem',
            borderRadius: '50px',
            textDecoration: 'none',
            fontSize: '0.95rem',
            boxShadow: '0 10px 20px rgba(124, 58, 237, 0.3)'
          }}>
            Volver a Iniciar Sesión
          </a>
        </div>
      </div>
    );
  }

  const branchCookie = cookieStore.get('caanma_active_branch')?.value;
  
  // Obtener la sucursal activa
  let activeBranch: any = null;
  if (branchCookie && branchCookie !== 'GLOBAL') {
    try {
      activeBranch = await prisma.branch.findFirst({
        where: { id: branchCookie, isActive: true, tenantId: session.tenantId }
      });
    } catch (e) {
      console.error('Error fetching active branch:', e);
    }
  }

  if (!activeBranch) {
    try {
      // Fallback a la primera sucursal activa del Tenant
      activeBranch = await prisma.branch.findFirst({
        where: { tenantId: session.tenantId, isActive: true }
      });
    } catch (e) {
      console.error('Error fetching fallback active branch:', e);
    }
  }

  if (!activeBranch) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)',
        color: 'white',
        fontFamily: "'Outfit', sans-serif",
        padding: '2rem',
        boxSizing: 'border-box'
      }}>
        <div style={{
          backgroundColor: 'rgba(255, 255, 255, 0.03)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '24px',
          padding: '3rem 2rem',
          maxWidth: '500px',
          width: '100%',
          textAlign: 'center',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)'
        }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            backgroundColor: 'rgba(234, 179, 8, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.5rem auto'
          }}>
            <svg style={{ width: '32px', height: '32px', stroke: '#eab308', strokeWidth: 2, fill: 'none' }} viewBox="0 0 24 24">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
              <circle cx="12" cy="10" r="3"></circle>
            </svg>
          </div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: '0 0 1rem 0', background: 'linear-gradient(to right, #fef08a, #fcd34d)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Sucursal Inactiva
          </h1>
          <p style={{ color: '#94a3b8', fontSize: '1rem', lineHeight: '1.6', margin: '0 0 2rem 0' }}>
            No se detectó ninguna sucursal activa asignada a tu cuenta de cliente. Por favor, selecciona una sucursal en el panel principal antes de intentar generar este catálogo.
          </p>
          <a href="/ventas/catalogos" style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#7c3aed',
            color: 'white',
            fontWeight: 'bold',
            padding: '0.85rem 2rem',
            borderRadius: '50px',
            textDecoration: 'none',
            fontSize: '0.95rem',
            boxShadow: '0 10px 20px rgba(124, 58, 237, 0.3)'
          }}>
            Regresar al Panel
          </a>
        </div>
      </div>
    );
  }

  // Obtener los datos del tenant/branch para la portada
  try {
    const branchInfo = await prisma.branch.findUnique({
      where: { id: activeBranch.id },
      include: { tenant: true }
    });

    if (branchInfo) {
      branchName = branchInfo.name;
      tenantName = branchInfo.tenant?.name || 'CAANMA';
    }
  } catch (e) {
    console.error('Error fetching branch info:', e);
  }

  const whereClause: any = {
    branchId: activeBranch.id,
    isActive: true
  };

  if (type === 'brands') {
    if (brands.length > 0) {
      whereClause.brand = { in: brands };
    }
    if (categories.length > 0) {
      whereClause.category = { in: categories };
    }
  } else if (type === 'special') {
    if (selectedIds.length === 0) {
      products = [];
    } else {
      whereClause.id = { in: selectedIds };
    }
  } else if (type === 'promotions') {
    whereClause.specialPrice = { gt: 0 };
  }

  // Ejecutar consulta Prisma directamente en el Server Component
  if (type !== 'special' || selectedIds.length > 0) {
    try {
      const dbProducts = await prisma.product.findMany({
        where: whereClause,
        select: {
          id: true,
          sku: true,
          name: true,
          description: true,
          price: true,
          specialPrice: true,
          brand: true,
          category: true,
          imageUrl: true
        },
        orderBy: [
          { brand: 'asc' },
          { name: 'asc' }
        ],
        take: limit
      });

      products = dbProducts;

      // Filtrar promociones si por alguna razón specialPrice >= price
      if (type === 'promotions') {
        products = dbProducts.filter(p => p.specialPrice !== null && p.specialPrice < p.price);
      }
    } catch (error) {
      console.error('Error al renderizar catálogo imprimible:', error);
      products = [];
    }
  }

  // Group products by brand for editorial index & separators
  const brandGroups: Record<string, typeof products> = {};
  products.forEach(p => {
    const brandName = (p.brand || 'Otras Marcas').toUpperCase();
    if (!brandGroups[brandName]) {
      brandGroups[brandName] = [];
    }
    brandGroups[brandName].push(p);
  });

  return (
    <>
      <style dangerouslySetInnerHTML={{__html: `
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;700;800;900&family=Playfair+Display:ital,wght@0,600;0,800;1,600&display=swap');

        @media print {
          @page { 
            size: letter portrait; 
            margin: 0; 
          }
          body { 
            -webkit-print-color-adjust: exact; 
            print-color-adjust: exact; 
            background: white; 
          }
          .no-print { 
            display: none !important; 
          }
          .page-break { 
            page-break-before: always; 
            break-before: page; 
            height: 0; 
            margin: 0; 
            border: none; 
          }
          .a4-page {
            margin: 0 !important;
            box-shadow: none !important;
            width: 21.59cm !important;
            height: 27.94cm !important;
            page-break-after: always;
            break-after: page;
          }
        }

        body { 
          font-family: 'Outfit', sans-serif; 
          background: #f8fafc; 
          margin: 0; 
          padding: 2rem 0; 
          color: #0f172a; 
          line-height: 1.5; 
        }

        .a4-page { 
          width: 21.59cm; 
          height: 27.94cm; 
          margin: 0 auto 2rem auto; 
          background: white; 
          box-shadow: 0 4px 20px rgba(0,0,0,0.06); 
          position: relative; 
          box-sizing: border-box; 
          overflow: hidden; 
          padding: 1.5cm; 
        }

        /* 1. Portada Revista Editorial */
        .cover-page { 
          display: flex; 
          flex-direction: column; 
          justify-content: space-between; 
          background: linear-gradient(135deg, #1e1b4b 0%, #311042 40%, #581c87 100%); 
          color: white; 
          padding: 3cm 2cm 2cm 2cm !important; 
        }

        .cover-top { 
          text-align: center; 
        }

        .cover-logo-wrapper {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          margin-bottom: 2rem;
        }

        .cover-logo-icon {
          width: 36px;
          height: 36px;
          background: linear-gradient(135deg, #7c3aed 0%, #db2777 100%);
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 900;
          font-size: 20px;
          color: white;
        }

        .cover-brand { 
          font-size: 1.5rem; 
          font-weight: 800; 
          letter-spacing: 4px; 
          text-transform: uppercase; 
          color: #a78bfa; 
        }

        .cover-title { 
          font-family: 'Playfair Display', serif; 
          font-size: 4rem; 
          font-weight: 900; 
          line-height: 1.1; 
          margin: 3rem 0 1rem 0; 
          background: linear-gradient(to right, #ffffff, #f472b6); 
          -webkit-background-clip: text; 
          -webkit-text-fill-color: transparent; 
        }

        .cover-subtitle { 
          font-size: 1.25rem; 
          font-weight: 300; 
          color: #c084fc; 
          max-width: 450px; 
          margin: 0 auto; 
          line-height: 1.6; 
        }

        .cover-footer { 
          border-top: 1px solid rgba(255,255,255,0.15); 
          padding-top: 2rem; 
          display: flex; 
          justify-content: space-between; 
          align-items: flex-end; 
        }

        .cover-info-block span { 
          display: block; 
          font-size: 0.75rem; 
          text-transform: uppercase; 
          letter-spacing: 1.5px; 
          color: #94a3b8; 
        }

        .cover-info-block strong { 
          font-size: 1.1rem; 
          color: white; 
        }

        /* 2. Banners de Separación de Marcas */
        .brand-separator-page { 
          display: flex; 
          flex-direction: column; 
          justify-content: center; 
          align-items: center; 
          background: #0f172a; 
          color: white; 
          text-align: center; 
          padding: 2cm !important; 
        }

        .brand-separator-title { 
          font-family: 'Playfair Display', serif; 
          font-size: 4.5rem; 
          font-weight: 900; 
          margin: 0 0 1rem 0; 
          letter-spacing: 2px; 
          background: linear-gradient(135deg, #a78bfa 0%, #db2777 100%); 
          -webkit-background-clip: text; 
          -webkit-text-fill-color: transparent; 
        }

        /* 3. Cuadrícula e Items */
        .page-header { 
          display: flex; 
          justify-content: space-between; 
          align-items: center; 
          border-bottom: 2px solid #f1f5f9; 
          padding-bottom: 1rem; 
          margin-bottom: 1.5rem; 
          height: 1.2cm; 
        }

        .page-header-logo {
          font-weight: 900;
          font-size: 1.25rem;
          color: #7c3aed;
          letter-spacing: 1px;
        }

        .page-header-title { 
          font-size: 0.85rem; 
          color: #64748b; 
          text-transform: uppercase; 
          letter-spacing: 2px; 
          font-weight: 600; 
        }

        .page-footer { 
          position: absolute; 
          bottom: 1.5cm; 
          left: 1.5cm; 
          right: 1.5cm; 
          display: flex; 
          justify-content: space-between; 
          font-size: 0.75rem; 
          color: #94a3b8; 
          border-top: 1px solid #f1f5f9; 
          padding-top: 0.75rem; 
          height: 0.8cm; 
        }

        .catalog-grid { 
          display: grid; 
          grid-template-columns: 1fr 1fr; 
          grid-template-rows: 1fr 1fr; 
          gap: 1.5cm 1.2cm; 
          height: 23cm; 
          box-sizing: border-box; 
        }

        .catalog-item { 
          border: 1px solid #f1f5f9; 
          border-radius: 12px; 
          padding: 1rem; 
          display: flex; 
          flex-direction: column; 
          justify-content: space-between; 
          box-sizing: border-box; 
          background: #ffffff; 
          position: relative; 
          height: 100%; 
        }

        .item-image-wrapper { 
          height: 5.5cm; 
          display: flex; 
          align-items: center; 
          justify-content: center; 
          background: #f8fafc; 
          border-radius: 8px; 
          margin-bottom: 0.75rem; 
          overflow: hidden; 
          position: relative; 
        }

        .item-image { 
          max-height: 100%; 
          max-width: 100%; 
          object-fit: contain; 
        }

        .item-image-placeholder { 
          width: 100%; 
          height: 100%; 
          display: flex; 
          flex-direction: column; 
          align-items: center; 
          justify-content: center; 
          background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%); 
          color: #94a3b8; 
        }

        .item-brand-badge { 
          position: absolute; 
          top: 8px; 
          left: 8px; 
          background: rgba(15, 23, 42, 0.05); 
          color: #475569; 
          font-size: 0.65rem; 
          font-weight: 800; 
          padding: 0.2rem 0.5rem; 
          border-radius: 4px; 
          text-transform: uppercase; 
          letter-spacing: 0.5px; 
        }

        .item-sku-badge { 
          position: absolute; 
          top: 8px; 
          right: 8px; 
          background: rgba(255,255,255,0.9); 
          border: 1px solid #e2e8f0; 
          color: #64748b; 
          font-size: 0.65rem; 
          font-weight: 600; 
          padding: 0.2rem 0.5rem; 
          border-radius: 4px; 
        }

        .item-info { 
          flex: 1; 
          display: flex; 
          flex-direction: column; 
          justify-content: flex-start; 
        }

        .item-name { 
          font-size: 0.95rem; 
          font-weight: 700; 
          color: #0f172a; 
          margin: 0 0 0.5rem 0; 
          line-height: 1.3; 
          display: -webkit-box; 
          WebkitLineClamp: 2; 
          WebkitBoxOrient: 'vertical'; 
          overflow: hidden; 
        }

        .item-desc { 
          font-size: 0.75rem; 
          color: #64748b; 
          margin: 0; 
          line-height: 1.4; 
          display: -webkit-box; 
          WebkitLineClamp: 3; 
          WebkitBoxOrient: 'vertical'; 
          overflow: hidden; 
        }

        .item-price-section { 
          margin-top: 1rem; 
          display: flex; 
          justify-content: space-between; 
          align-items: center; 
          border-top: 1px dashed #f1f5f9; 
          padding-top: 0.75rem; 
        }

        .price-label { 
          font-size: 0.65rem; 
          color: #94a3b8; 
          text-transform: uppercase; 
          font-weight: bold; 
        }

        .price-box { 
          text-align: right; 
        }

        .price-regular { 
          font-size: 1.25rem; 
          font-weight: 800; 
          color: #0f172a; 
        }

        .price-old { 
          font-size: 0.85rem; 
          color: #94a3b8; 
          text-decoration: line-through; 
          margin-right: 0.5rem; 
          font-weight: 600; 
        }

        .price-promo { 
          font-size: 1.35rem; 
          font-weight: 800; 
          color: #dc2626; 
        }

        .promo-badge { 
          background: #fee2e2; 
          color: #dc2626; 
          font-size: 0.65rem; 
          font-weight: 800; 
          padding: 0.15rem 0.4rem; 
          border-radius: 4px; 
          margin-left: 0.25rem; 
          vertical-align: middle; 
          text-transform: uppercase; 
        }

        /* 4. Panel flotante no-print */
        .floating-controls { 
          position: fixed; 
          bottom: 2rem; 
          right: 2rem; 
          display: flex; 
          gap: 0.75rem; 
          z-index: 9999; 
        }

        .btn-control { 
          display: inline-flex; 
          align-items: center; 
          gap: 0.5rem; 
          padding: 0.75rem 1.5rem; 
          border-radius: 50px; 
          border: none; 
          font-weight: bold; 
          cursor: pointer; 
          box-shadow: 0 10px 25px rgba(0,0,0,0.15); 
          font-size: 0.9rem; 
          transition: all 0.2s; 
        }

        .btn-print { 
          background: linear-gradient(135deg, #7c3aed 0%, #db2777 100%); 
          color: white; 
        }

        .btn-close { 
          background: white; 
          color: #475569; 
          border: 1px solid #cbd5e1; 
        }

        .svg-icon {
          width: 18px;
          height: 18px;
          fill: none;
          stroke: currentColor;
          stroke-width: 2;
          stroke-linecap: round;
          stroke-linejoin: round;
        }
      `}} />

      {/* Floating controls for interactive screen view */}
      <PrintControls />

      {/* PÁGINA 1: PORTADA DE REVISTA EDITORIAL */}
      <div className="a4-page cover-page">
        <div className="cover-top">
          <div className="cover-logo-wrapper">
            <div className="cover-logo-icon">C</div>
            <span className="cover-brand">{tenantName}</span>
          </div>
          
          <h1 className="cover-title">
            {type === 'promotions' ? 'Catálogo de Promociones' : 'Catálogo de Artículos'}
          </h1>
          <p className="cover-subtitle">
            {type === 'promotions' 
              ? 'Colección exclusiva de productos con precios especiales de descuento y ofertas de temporada.'
              : `Descubre nuestra selecta colección de artículos líderes, fabricados bajo estándares internacionales de excelencia.`}
          </p>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', margin: '2rem 0', opacity: 0.15 }}>
          <svg style={{ width: '80px', height: '80px', fill: 'none', stroke: 'white', strokeWidth: '1.5' }} viewBox="0 0 24 24">
            <path d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.3-6.3l-.7.7M6.7 17.3l-.7.7m12.6 0l-.7-.7M6.7 6.7l-.7-.7"></path>
            <path d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z"></path>
          </svg>
        </div>

        <div className="cover-footer">
          <div className="cover-info-block">
            <span>Sucursal Emisora</span>
            <strong>{branchName.toUpperCase()}</strong>
          </div>
          <div className="cover-info-block" style={{ textAlign: 'right' }}>
            <span>Fecha de Edición</span>
            <strong>{new Date().toLocaleDateString('es-MX', { year: 'numeric', month: 'long' }).toUpperCase()}</strong>
          </div>
        </div>
      </div>

      {/* Renderizado de Separadores y Productos */}
      {Object.entries(brandGroups).map(([brandName, brandProducts]) => {
        // Chunk products into pages of 4 items each (2x2 grid)
        const chunks: typeof products[] = [];
        for (let i = 0; i < brandProducts.length; i += 4) {
          chunks.push(brandProducts.slice(i, i + 4));
        }

        return (
          <div key={brandName}>
            {/* SEPARADOR DE MARCA (PÁGINA EXCLUSIVA DE PRESENTACIÓN DE MARCA) */}
            <div className="page-break" />
            <div className="a4-page brand-separator-page">
              <div style={{
                padding: '2.5rem',
                border: '2px solid rgba(255,255,255,0.1)',
                borderRadius: '24px',
                backgroundColor: 'rgba(255,255,255,0.02)',
                backdropFilter: 'blur(10px)',
                width: '80%'
              }}>
                <span style={{ fontSize: '0.9rem', color: '#a78bfa', textTransform: 'uppercase', letterSpacing: '4px', fontWeight: 'bold' }}>
                  Presentación de Línea
                </span>
                <h2 className="brand-separator-title">
                  {brandName}
                </h2>
                <div style={{ width: '80px', height: '4px', background: 'linear-gradient(90deg, #7c3aed, #db2777)', margin: '1.5rem auto' }} />
                <p style={{ color: '#94a3b8', fontSize: '1rem', maxWidth: '400px', margin: '0 auto', lineHeight: '1.6' }}>
                  Calidad excepcional y rendimiento superior garantizado en cada una de sus soluciones comerciales.
                </p>
              </div>
            </div>

            {/* PÁGINAS DE PRODUCTOS */}
            {chunks.map((chunk, chunkIdx) => (
              <div key={chunkIdx}>
                <div className="page-break" />
                <div className="a4-page">
                  {/* Header of Page */}
                  <div className="page-header">
                    <span className="page-header-logo">C <span style={{ fontSize: '0.75rem', fontWeight: 'normal', color: '#94a3b8' }}>{tenantName}</span></span>
                    <span className="page-header-title">{brandName}</span>
                  </div>

                  {/* 2x2 grid */}
                  <div className="catalog-grid">
                    {chunk.map(product => {
                      const hasPromo = product.specialPrice !== null && product.specialPrice > 0 && product.specialPrice < product.price;
                      return (
                        <div key={product.id} className="catalog-item">
                          
                          {/* Image Wrapper */}
                          <div className="item-image-wrapper">
                            {product.brand && <span className="item-brand-badge">{product.brand}</span>}
                            <span className="item-sku-badge">SKU: {product.sku}</span>
                            
                            {product.imageUrl ? (
                              <img src={product.imageUrl} alt={product.name} className="item-image" />
                            ) : (
                              <div className="item-image-placeholder">
                                <svg style={{ width: '32px', height: '32px', stroke: 'currentColor', strokeWidth: '1.5', fill: 'none', marginBottom: '0.5rem', opacity: 0.5 }} viewBox="0 0 24 24">
                                  <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path>
                                  <line x1="7" y1="7" x2="7.01" y2="7"></line>
                                </svg>
                                <span style={{ fontSize: '0.75rem', fontWeight: '600' }}>CAANMA PRO</span>
                              </div>
                            )}
                          </div>

                          {/* Info */}
                          <div className="item-info">
                            <h4 className="item-name" title={product.name}>
                              {product.name}
                            </h4>
                            {product.description && (
                              <p className="item-desc">
                                {product.description}
                              </p>
                            )}
                          </div>

                          {/* Price */}
                          <div className="item-price-section">
                            <span className="price-label">Precio Catálogo</span>
                            <div className="price-box">
                              {hasPromo ? (
                                <>
                                  <span className="price-old">${(product.price ?? 0).toFixed(2)}</span>
                                  <span className="price-promo">
                                    ${(product.specialPrice ?? 0).toFixed(2)}
                                    <span className="promo-badge">OFERTA</span>
                                  </span>
                                </>
                              ) : (
                                <span className="price-regular">${(product.price ?? 0).toFixed(2)}</span>
                              )}
                            </div>
                          </div>

                        </div>
                      );
                    })}
                  </div>

                  {/* Footer of Page */}
                  <div className="page-footer">
                    <span>CAANMA PRO © {new Date().getFullYear()}</span>
                    <span>Página {chunkIdx + 1} de {chunks.length}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        );
      })}

      {products.length === 0 && (
        <div style={{ textAlign: 'center', padding: '10rem 2rem', color: '#64748b', fontFamily: 'sans-serif' }}>
          <h2>No se encontraron artículos para este catálogo</h2>
          <p>Selecciona otros filtros en el panel de control o asegúrate de tener productos activos.</p>
        </div>
      )}
    </>
  );
}
