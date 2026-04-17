import { FunctionDeclaration, SchemaType } from '@google/generative-ai';
import { prisma } from '@/lib/prisma';
import { subDays, startOfDay, endOfDay } from 'date-fns';

export const aiFunctionDeclarations: FunctionDeclaration[] = [
  {
    name: "obtener_ventas",
    description: "Extrae el total de ventas y la cantidad de tickets generados en un período. No proveer fecha usará las ventas de hoy por defecto.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        diasAtras: {
          type: SchemaType.NUMBER,
          description: "Número de días atrás a reportar. Ejemplo: 0 para hoy, 7 para la última semana. Por defecto es 0."
        }
      }
    }
  },
  {
    name: "consultar_inventario",
    description: "Busca un producto por nombre o SKU para confirmar si existe, cuál es su precio, cantidad en stock y marca.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        query: {
          type: SchemaType.STRING,
          description: "Término de búsqueda, nombre del producto o parte del código SKU."
        }
      },
      required: ["query"]
    }
  },
  {
    name: "alertas_stock",
    description: "Busca todos los productos en la sucursal actual cuyo inventario esté en cero o por debajo de su mínimo configurado.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {}
    }
  },
  {
    name: "deudas_clientes",
    description: "Obtiene una lista de los clientes que le deben dinero a la empresa (saldo a favor en contra).",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {}
    }
  },
  {
    name: "obtener_gastos",
    description: "Calcula los gastos operativos egresados de la empresa en los últimos N días.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        diasAtras: {
          type: SchemaType.NUMBER,
          description: "Número de días atrás. Ejemplo 0 es hoy, 30 es el último mes. Por defecto 0."
        }
      }
    }
  }
];

export async function executeAiFunction(functionName: string, callArgs: any, branchContext: any) {
  const branchId = branchContext?.id === 'GLOBAL' ? undefined : branchContext?.id;
  const whereBranch = branchId ? { branchId } : {};

  switch (functionName) {
    case 'obtener_ventas': {
      let diasAtras = typeof callArgs.diasAtras === 'number' ? callArgs.diasAtras : 0;
      let targetDate = startOfDay(subDays(new Date(), diasAtras));
      let endDate = endOfDay(new Date());

      const sales = await prisma.sale.findMany({
        where: {
          ...whereBranch,
          status: 'COMPLETED',
          createdAt: {
            gte: targetDate,
            lte: endDate
          }
        },
        select: { total: true }
      });

      const totalValue = sales.reduce((acc, sale) => acc + sale.total, 0);
      return { 
        mensaje: `Se encontraron ${sales.length} ventas en el periodo.`,
        totalMontoMonedaLocal: totalValue,
        ticketsRealizados: sales.length,
        nota: "Informa al usuario estos montos y felicítalo si superan un buen rendimiento."
      };
    }

    case 'consultar_inventario': {
      const q = callArgs.query;
      const products = await prisma.product.findMany({
        where: {
          ...whereBranch,
          isActive: true,
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { sku: { contains: q, mode: 'insensitive' } }
          ]
        },
        take: 10,
        select: { name: true, sku: true, stock: true, price: true, cost: true, brand: true, minStock: true }
      });

      return {
        resultados: products,
        nota: products.length > 0 ? "Preséntale esta información formateada al usuario." : "Dile que no encontramos ningún producto con ese nombre."
      };
    }

    case 'alertas_stock': {
      const dbProducts = await prisma.product.findMany({
        where: {
          ...whereBranch,
          isActive: true
        },
        select: { name: true, sku: true, stock: true, minStock: true }
      });

      const alerts = dbProducts.filter(p => p.stock <= p.minStock).slice(0, 50); // limit to 50 for ai payload size

      return {
        cantidadProductosBajoStock: alerts.length,
        ejemplosProblemasAlmacen: alerts.slice(0, 10), // solo devuelve 10 al modelo para no saturarlo
        nota: "Haz un breve resumen de los principales productos que faltan."
      };
    }

    case 'deudas_clientes': {
      const debitCustomers = await prisma.customer.findMany({
        where: {
          ...whereBranch,
          creditBalance: { gt: 0 }
        },
        select: { name: true, creditBalance: true, creditDays: true },
        take: 20
      });

      const totalDebt = debitCustomers.reduce((acc, c) => acc + c.creditBalance, 0);

      return {
        totalDineroQueNosDeben: totalDebt,
        cantidadClientesMorosos: debitCustomers.length,
        detalleCartera: debitCustomers,
        nota: "Puedes hacer una lista en formato Markdown destacando quién debe más."
      };
    }

    case 'obtener_gastos': {
      let diasAtras = typeof callArgs.diasAtras === 'number' ? callArgs.diasAtras : 0;
      let targetDate = startOfDay(subDays(new Date(), diasAtras));

      const expenses = await prisma.expense.findMany({
        where: {
          ...whereBranch,
          createdAt: { gte: targetDate }
        },
        select: { category: true, amount: true, reason: true }
      });

      const totalGastos = expenses.reduce((acc, current) => acc + current.amount, 0);
      
      const grouped = expenses.reduce((acc, current) => {
        const cat = current.category || 'Otros';
        acc[cat] = (acc[cat] || 0) + current.amount;
        return acc;
      }, {} as Record<string, number>);

      return {
        montoTotalEgresos: totalGastos,
        gastoPorCategorias: grouped,
        detalleTopOperacionales: expenses.slice(0, 5)
      };
    }

    default:
      return { error: "Función de base de datos no reconocida o no soportada aún." };
  }
}
