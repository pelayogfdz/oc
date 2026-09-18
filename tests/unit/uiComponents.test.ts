import { describe, it, expect } from 'vitest';
import React from 'react';
import { Badge } from '@/app/components/ui/Badge';
import { Card, CardTitle } from '@/app/components/ui/Card';
import { StatCard } from '@/app/components/ui/StatCard';
import { Button } from '@/app/components/ui/Button';

describe('Atomic UI Components', () => {
  describe('Badge', () => {
    it('debe contener las clases de estilo según la variante', () => {
      const badgeDefault = Badge({ children: 'Activo', variant: 'default' });
      expect(badgeDefault.props.className).toContain('bg-slate-100');

      const badgeSuccess = Badge({ children: 'Completado', variant: 'success' });
      expect(badgeSuccess.props.className).toContain('bg-emerald-50');
      expect(badgeSuccess.props.className).toContain('text-emerald-700');

      const badgeDanger = Badge({ children: 'Riesgo', variant: 'danger' });
      expect(badgeDanger.props.className).toContain('bg-rose-50');
      expect(badgeDanger.props.className).toContain('text-rose-700');
    });
  });

  describe('Card', () => {
    it('debe aplicar esquinas redondeadas y bordes sutiles', () => {
      const card = Card({ children: 'Contenido', hoverEffect: true });
      expect(card.props.className).toContain('rounded-2xl');
      expect(card.props.className).toContain('border-slate-100');
      expect(card.props.className).toContain('hover:shadow-md');
    });

    it('CardTitle debe incluir tipografía en negrita y color pizarra', () => {
      const title = CardTitle({ children: 'Título Principal' });
      expect(title.props.className).toContain('font-bold');
      expect(title.props.className).toContain('text-slate-800');
    });
  });

  describe('StatCard', () => {
    it('debe estructurar el KPI con título, valor e icono', () => {
      const stat = StatCard({
        title: 'Ingresos',
        value: '$150,000.00',
        icon: '💰',
        badgeText: 'Hoy',
        badgeVariant: 'success'
      });

      expect(stat.props.className).toContain('rounded-2xl');
      expect(stat.props.className).toContain('p-5');
    });
  });

  describe('Button', () => {
    it('debe incluir las clases de variante y tamaño', () => {
      const btnPrimary = Button({ children: 'Guardar', variant: 'primary', size: 'md' });
      expect(btnPrimary.props.className).toContain('bg-purple-600');
      expect(btnPrimary.props.className).toContain('rounded-xl');

      const btnDanger = Button({ children: 'Eliminar', variant: 'danger', size: 'sm' });
      expect(btnDanger.props.className).toContain('bg-rose-600');
      expect(btnDanger.props.className).toContain('text-xs');
    });
  });
});
