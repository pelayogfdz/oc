export const PERMISSION_MODULES = [
  {
    id: 'pos',
    name: 'Ventas y Punto de Venta (POS)',
    submodules: [
      {
        id: 'pos_terminal',
        name: 'Terminal',
        permissions: [
          { id: 'pos_access', label: 'Acceder a Punto de Venta' },
          { id: 'pos_discount', label: 'Autorizar Descuentos' },
          { id: 'pos_price_change', label: 'Modificar Precio en Caja' },
          { id: 'pos_change_customer', label: 'Cambiar Cliente en Caja' },
          { id: 'pos_manual_discount', label: 'Asignar Descuento Manual' },
          { id: 'pos_price_list_change', label: 'Cambiar Lista de Precios' },
          { id: 'pos_assign_promotions', label: 'Asignar/Modificar Promociones' },
        ]
      },
      {
        id: 'pos_tickets',
        name: 'Tickets',
        permissions: [
          { id: 'pos_cancel', label: 'Cancelar Tickets' },
          { id: 'pos_returns', label: 'Procesar Devoluciones' },
          { id: 'pos_view_history', label: 'Ver Historial de Ventas' }
        ]
      }
    ]
  },
  {
    id: 'inventory',
    name: 'Inventario',
    submodules: [
      {
        id: 'inv_catalog',
        name: 'Catálogo de Productos',
        permissions: [
          { id: 'inv_view', label: 'Ver Catálogo y Stock' },
          { id: 'inv_edit', label: 'Crear / Editar Productos' },
          { id: 'inv_delete', label: 'Eliminar Productos Permanentemente' },
          { id: 'inv_cost', label: 'Ver Costos de Compra (Margen)' },
          { id: 'inv_export', label: 'Exportar Inventario (CSV/Excel)' }
        ]
      },
      {
        id: 'inv_movements',
        name: 'Movimientos',
        permissions: [
          { id: 'inv_adjust', label: 'Realizar Ajustes de Stock' },
          { id: 'inv_transfer', label: 'Crear / Recibir Traspasos' }
        ]
      }
    ]
  },
  {
    id: 'cash',
    name: 'Caja y Efectivo',
    submodules: [
      {
        id: 'cash_ops',
        name: 'Operaciones',
        permissions: [
          { id: 'cash_open_close', label: 'Abrir y Cerrar Caja' },
          { id: 'cash_movements', label: 'Registrar Retiros / Depósitos' },
          { id: 'cash_audit', label: 'Visualizar Arqueos de Otros' }
        ]
      }
    ]
  },
  {
    id: 'admin',
    name: 'Administración Global',
    submodules: [
      {
        id: 'admin_customers',
        name: 'Clientes',
        permissions: [
          { id: 'admin_customers_view', label: 'Ver y Editar Clientes' }
        ]
      },
      {
        id: 'admin_quotes',
        name: 'Cotizaciones',
        permissions: [
          { id: 'admin_quotes_access', label: 'Crear / Imprimir Cotizaciones' }
        ]
      }
    ]
  },
  {
    id: 'compras_gastos',
    name: 'Compras y Gastos',
    submodules: [
      {
        id: 'purchases_ops',
        name: 'Operaciones de Compras',
        permissions: [
          { id: 'admin_purchases_access', label: 'Acceso General a Compras' },
          { id: 'purchases_requests', label: 'Ver y Gestionar Solicitudes de Compra' },
          { id: 'purchases_orders', label: 'Ver y Gestionar Pedidos a Proveedores' },
          { id: 'purchases_suppliers', label: 'Ver y Gestionar Directorio de Proveedores' }
        ]
      },
      {
        id: 'expenses_ops',
        name: 'Operaciones de Gastos',
        permissions: [
          { id: 'expenses_view', label: 'Ver Registro de Gastos' },
          { id: 'expenses_create', label: 'Registrar Nuevos Gastos' }
        ]
      },
      {
        id: 'purchases_alerts',
        name: 'Alertas',
        permissions: [
          { id: 'purchases_expiration', label: 'Ver Control de Caducidades' }
        ]
      }
    ]
  },
  {
    id: 'logistica',
    name: 'Logística y Entregas',
    submodules: [
      {
        id: 'log_manage',
        name: 'Gestión',
        permissions: [
          { id: 'logistica_access', label: 'Acceso General a Logística' },
          { id: 'logistica_rutas', label: 'Ver y Gestionar Entregas y Rutas' },
          { id: 'logistica_chofer', label: 'Acceso a Mi Ruta (Portal de Chofer)' },
          { id: 'logistica_combustibles', label: 'Ver y Gestionar Logística de Combustibles (Fletes)' }
        ]
      }
    ]
  },
  {
    id: 'panaderia',
    name: 'Procesos (Producción / Panadería)',
    submodules: [
      {
        id: 'panaderia_ops',
        name: 'Operaciones de Producción',
        permissions: [
          { id: 'panaderia_access', label: 'Ver y Gestionar Procesos / Órdenes de Producción' },
          { id: 'procesos_tareas', label: 'Ver e Interactuar con Tareas' },
          { id: 'procesos_formulas', label: 'Ver y Crear/Editar Fórmulas e Insumos' }
        ]
      }
    ]
  },
  {
    id: 'reports',
    name: 'Centro de Reportes',
    submodules: [
      {
        id: 'rep_general',
        name: 'Acceso General',
        permissions: [
          { id: 'admin_reports_access', label: 'Acceso General a Reportes' }
        ]
      },
      {
        id: 'rep_sales',
        name: 'Reportes de Ventas',
        permissions: [
          { id: 'report_sales_breakdown', label: 'Resumen / Desglose de Ventas' },
          { id: 'report_sales_by_product', label: 'Ventas por Producto' },
          { id: 'report_top_products', label: 'Top Productos' },
          { id: 'report_top_clients', label: 'Top Clientes' },
          { id: 'report_top_categories', label: 'Top Categorías' },
          { id: 'report_sales_by_seller', label: 'Ventas por Vendedor' },
          { id: 'report_seller_commissions', label: 'Comisiones de Vendedores' }
        ]
      },
      {
        id: 'rep_inventory',
        name: 'Reportes de Inventario',
        permissions: [
          { id: 'report_valued_inventory', label: 'Inventario Valorizado' },
          { id: 'report_costs_prices', label: 'Costos y Precios' },
          { id: 'report_replenishment', label: 'Reporte de Resurtido' },
          { id: 'report_inventory_log', label: 'Bitácora de Inventario' },
          { id: 'report_consignments', label: 'Reporte de Consignaciones' }
        ]
      },
      {
        id: 'rep_production',
        name: 'Reportes de Producción',
        permissions: [
          { id: 'report_supplies', label: 'Reporte de Insumos (Materia Prima)' },
          { id: 'report_production', label: 'Reporte de Producción (Fabricación)' },
          { id: 'report_tasks', label: 'Rendimiento de Tareas' }
        ]
      },
      {
        id: 'rep_finance',
        name: 'Reportes Financieros y Operativos',
        permissions: [
          { id: 'report_utility', label: 'Utilidad y Márgenes de Ganancia' },
          { id: 'report_taxes', label: 'Impuestos y Facturación' },
          { id: 'report_expenses', label: 'Reporte de Gastos' },
          { id: 'report_cash_cut', label: 'Corte de Caja' },
          { id: 'report_shifts', label: 'Reporte de Turnos (Cortes)' }
        ]
      }
    ]
  },
  {
    id: 'sysadmin',
    name: 'Preferencias (Sysadmin)',
    submodules: [
      {
        id: 'sys_settings',
        name: 'Ajustes',
        permissions: [
          { id: 'sys_settings_access', label: 'Modificar Configuraciones de Tienda' },
          { id: 'sys_users', label: 'Administrar Usuarios y Permisos' },
          { id: 'sys_branches', label: 'Administrar Múltiples Sucursales' },
          { id: 'sys_integrations', label: 'Integraciones (MercadoLibre, Shopify)' }
        ]
      }
    ]
  },
  {
    id: 'facturacion',
    name: 'Facturas',
    submodules: [
      {
        id: 'fact_cfdi',
        name: 'Facturación Electrónica',
        permissions: [
          { id: 'fact_cfdi_access', label: 'Ver Facturación CFDI 4.0' },
          { id: 'fact_global_access', label: 'Ver Factura Global' },
          { id: 'fact_rep_access', label: 'Ver Complementos de Pago (REP)' }
        ]
      }
    ]
  },
  {
    id: 'rh',
    name: 'Recursos Humanos',
    submodules: [
      {
        id: 'rh_asistencia',
        name: 'Control de Asistencia',
        permissions: [
          { id: 'rh_monitoreo', label: 'Ver Monitoreo de Asistencia' },
          { id: 'rh_calendario', label: 'Ver Calendario de Incidencias' },
          { id: 'rh_reportes', label: 'Ver Reportes Históricos' },
          { id: 'rh_gps', label: 'Ver Ubicaciones GPS' }
        ]
      },
      {
        id: 'rh_payroll',
        name: 'Nómina y Avisos',
        permissions: [
          { id: 'rh_tramites', label: 'Ver Trámites y Avisos' },
          { id: 'rh_nomina', label: 'Ver Cálculo de Nómina' }
        ]
      }
    ]
  },
  {
    id: 'finanzas',
    name: 'Finanzas',
    submodules: [
      {
        id: 'fin_ops',
        name: 'Operaciones Financieras',
        permissions: [
          { id: 'fin_conciliacion', label: 'Ver Conciliación Bancaria' },
          { id: 'fin_cxc', label: 'Ver Cuentas por Cobrar (CxC)' },
          { id: 'fin_cxp', label: 'Ver Cuentas por Pagar (CxP)' }
        ]
      }
    ]
  },
  {
    id: 'ventas_online',
    name: 'Ventas Online',
    submodules: [
      {
        id: 'online_ops',
        name: 'Operaciones Online',
        permissions: [
          { id: 'online_b2c', label: 'Ver Catálogo en Línea B2C' },
          { id: 'online_b2b', label: 'Ver Portal de Clientes B2B' },
          { id: 'online_autofact', label: 'Ver Portal de Autofacturación' },
          { id: 'online_integrations', label: 'Ver Integraciones (Mercado Libre/Amazon/Shopify)' },
          { id: 'online_orders', label: 'Ver Órdenes Web' }
        ]
      }
    ]
  },
  {
    id: 'kiosko',
    name: 'Asistencia (Kiosko)',
    submodules: [
      {
        id: 'kiosko_ops',
        name: 'Kiosko de Asistencia',
        permissions: [
          { id: 'kiosko_access', label: 'Acceso al Kiosko de Asistencia' }
        ]
      }
    ]
  }
];

export function hasPermission(userPermissions: Record<string, boolean>, permissionId: string): boolean {
  let foundModuleId: string | null = null;
  let foundSubmoduleId: string | null = null;
  let isModuleKey = false;
  let isSubmoduleKey = false;

  for (const mod of PERMISSION_MODULES) {
    if (mod.id === permissionId) {
      isModuleKey = true;
      break;
    }
    
    if (mod.submodules) {
      for (const submod of mod.submodules) {
        if (submod.id === permissionId) {
          isSubmoduleKey = true;
          foundModuleId = mod.id;
          break;
        }
        
        const hasPerm = submod.permissions?.some((p: any) => p.id === permissionId);
        if (hasPerm) {
          foundModuleId = mod.id;
          foundSubmoduleId = submod.id;
          break;
        }
      }
    }
    if (foundModuleId) break;
  }

  // Check if the permission key itself is enabled
  if (!userPermissions[permissionId]) {
    return false;
  }

  // If it's a module key, it only requires itself to be true
  if (isModuleKey) {
    return true;
  }

  // If it's a submodule key, it requires the parent module to be true
  if (isSubmoduleKey) {
    return foundModuleId ? !!userPermissions[foundModuleId] : true;
  }

  // If it's an individual permission, it requires both parent module and parent submodule to be true
  const isModActive = foundModuleId ? !!userPermissions[foundModuleId] : true;
  const isSubmodActive = foundSubmoduleId ? !!userPermissions[foundSubmoduleId] : true;

  return isModActive && isSubmodActive;
}

export function hasNodeAccess(
  userPermissions: Record<string, boolean>,
  requiredPermission: string | string[] | undefined,
  isSuperAdmin = false,
  userRole = 'USER'
): boolean {
  if (isSuperAdmin || userRole === 'OWNER' || userRole === 'ADMIN') {
    return true;
  }
  if (!requiredPermission) {
    return true;
  }
  const reqs = Array.isArray(requiredPermission) ? requiredPermission : [requiredPermission];
  return reqs.some(req => hasPermission(userPermissions, req));
}
