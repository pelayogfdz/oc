export const PERMISSION_MODULES = [
  {
    id: 'pos',
    name: 'Punto de Venta (POS)',
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
        id: 'admin_purchases',
        name: 'Compras y Proveedores',
        permissions: [
          { id: 'admin_purchases_access', label: 'Modulo de Compras y Proveedores' }
        ]
      },
      {
        id: 'admin_reports',
        name: 'Reportes',
        permissions: [
          { id: 'admin_reports_access', label: 'Ver Reportes y Finanzas' }
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
    id: 'logistica',
    name: 'Logística y Entregas',
    submodules: [
      {
        id: 'log_manage',
        name: 'Gestión',
        permissions: [
          { id: 'logistica_access', label: 'Ver y Gestionar Entregas (Choferes, Etiquetas)' }
        ]
      }
    ]
  },
  {
    id: 'panaderia',
    name: 'Panadería (Fabricación)',
    submodules: [
      {
        id: 'panaderia_ops',
        name: 'Operaciones',
        permissions: [
          { id: 'panaderia_access', label: 'Ver Ordenes de Producción y Avanzar Pasos' }
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
