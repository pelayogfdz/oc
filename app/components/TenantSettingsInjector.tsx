'use client';

import { useEffect } from 'react';

export default function TenantSettingsInjector({ decimals }: { decimals: number }) {
  useEffect(() => {
    (window as any).__TENANT_DECIMALS__ = decimals;
  }, [decimals]);

  return null;
}
