'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  Receipt, ArrowLeft, Printer, CreditCard, Banknote, 
  ArrowRightLeft, Users, CheckCircle2, AlertCircle, Percent, 
  DollarSign, CheckSquare, Square, Split, Sparkles, Clock,
  ChevronRight, Utensils, Check, User
} from 'lucide-react';
import { closeRestaurantOrderAndPay, paySplitItemsOrder } from '@/app/actions/restaurantActions';

export default function CuentaClient({
  order,
  customers,
  activeCashSession
}: {
  order: any;
  customers: Array<{ id: string; name: string; taxId?: string | null }>;
  activeCashSession?: any;
}) {
  const router = useRouter();
  const [tipPercentage, setTipPercentage] = useState<number>(10);
  const [customTip, setCustomTip] = useState<number>(0);
  const [isCustomTipActive, setIsCustomTipActive] = useState<boolean>(false);
  const [splitCount, setSplitCount] = useState<number>(order?.dinersCount || 1);

  // División por Ítems
  const [splitMode, setSplitMode] = useState<'FULL' | 'EQUAL' | 'BY_ITEMS'>('FULL');
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);

  // Cobro Modal
  const [isPayModalOpen, setIsPayModalOpen] = useState<boolean>(false);
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'CARD' | 'TRANSFER' | 'MIXTO'>('CASH');
  const [cashReceived, setCashReceived] = useState<number>(0);
  const [cashAmount, setCashAmount] = useState<number>(0);
  const [cardAmount, setCardAmount] = useState<number>(0);
  const [transferAmount, setTransferAmount] = useState<number>(0);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [orderNotes, setOrderNotes] = useState<string>('');
  const [isProcessingPay, setIsProcessingPay] = useState<boolean>(false);
  const [isPrintMode, setIsPrintMode] = useState<boolean>(false);

  if (!order) return null;

  // Cálculo de totales
  const isItemSplit = splitMode === 'BY_ITEMS';
  const totalBase = isItemSplit && selectedItemIds.length > 0
    ? order.items.filter((i: any) => selectedItemIds.includes(i.id)).reduce((acc: number, item: any) => {
        let p = item.unitPrice * item.quantity;
        item.modifiers.forEach((m: any) => p += (m.extraPrice * item.quantity));
        return acc + p;
      }, 0)
    : order.total || 0;

  const tipAmount = isCustomTipActive 
    ? customTip 
    : (totalBase * (tipPercentage / 100));
    
  const finalTotal = totalBase + tipAmount;
  const perPersonAmount = splitCount > 0 ? (finalTotal / splitCount) : finalTotal;

  // Cambio en efectivo
  const changeAmount = paymentMethod === 'CASH' && cashReceived > finalTotal
    ? cashReceived - finalTotal
    : 0;

  const handleOpenPayModal = () => {
    setCashReceived(Math.ceil(finalTotal));
    setCashAmount(finalTotal);
    setCardAmount(0);
    setTransferAmount(0);
    setIsPayModalOpen(true);
  };

  const handleToggleItemSelection = (id: string) => {
    setSelectedItemIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleSelectAllItems = () => {
    if (selectedItemIds.length === order.items.length) {
      setSelectedItemIds([]);
    } else {
      setSelectedItemIds(order.items.map((i: any) => i.id));
    }
  };

  const handleProcessPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessingPay(true);

    try {
      const payments: Array<{ method: string; amount: number }> = [];

      if (paymentMethod === 'CASH') {
        payments.push({ method: 'CASH', amount: totalBase });
      } else if (paymentMethod === 'CARD') {
        payments.push({ method: 'CARD', amount: totalBase });
      } else if (paymentMethod === 'TRANSFER') {
        payments.push({ method: 'TRANSFER', amount: totalBase });
      } else if (paymentMethod === 'MIXTO') {
        if (cashAmount > 0) payments.push({ method: 'CASH', amount: cashAmount });
        if (cardAmount > 0) payments.push({ method: 'CARD', amount: cardAmount });
        if (transferAmount > 0) payments.push({ method: 'TRANSFER', amount: transferAmount });
      }

      if (isItemSplit && selectedItemIds.length > 0) {
        // Cobro parcial por ítems
        const res = await paySplitItemsOrder({
          orderId: order.id,
          itemIds: selectedItemIds,
          payments,
          cashReceived: paymentMethod === 'CASH' ? cashReceived : undefined,
          tipAmount,
          customerId: selectedCustomerId || undefined,
          notes: orderNotes
        });

        if (res.success) {
          alert(`¡Pago parcial registrado! Folio de venta: ${res.folio}`);
          if (res.isFullyClosed) {
            router.push('/restaurante/mesas');
          } else {
            setIsPayModalOpen(false);
            setSelectedItemIds([]);
            router.refresh();
          }
        } else {
          alert(res.error || 'Error al procesar cobro parcial');
        }
      } else {
        // Cobro completo
        const res = await closeRestaurantOrderAndPay({
          orderId: order.id,
          payments,
          cashReceived: paymentMethod === 'CASH' ? cashReceived : undefined,
          tipAmount,
          customerId: selectedCustomerId || undefined,
          notes: orderNotes
        });

        if (res.success) {
          alert(`¡Cuenta liquidada exitosamente! Folio de venta: ${res.folio}`);
          router.push('/restaurante/mesas');
        } else {
          alert(res.error || 'Error al procesar cobro');
        }
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsProcessingPay(false);
    }
  };

  const handlePrintTicket = () => {
    window.print();
  };

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
      {/* Header CAANMA Style */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white  p-6 rounded-2xl border border-slate-200  shadow-sm print:hidden">
        <div>
          <div className="flex items-center gap-3">
            <Link 
              href="/restaurante/mesas"
              className="p-2 text-slate-500 hover:text-slate-900   rounded-xl hover:bg-slate-100  transition-all"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="p-2.5 bg-emerald-600 text-white rounded-xl shadow-md shadow-emerald-500/20">
              <Receipt className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900  tracking-tight">Cierre de Cuenta</h1>
              <p className="text-sm text-slate-500 ">
                {order.table.name} | Mesero: {order.waiter.name} | {order.dinersCount} Comensales
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handlePrintTicket}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-slate-700  bg-slate-100  hover:bg-slate-200 rounded-xl transition-all"
          >
            <Printer className="w-4 h-4" />
            Imprimir Pre-cuenta
          </button>
          <Link
            href={`/restaurante/comanda/${order.tableId}`}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm transition-all"
          >
            <Utensils className="w-4 h-4" />
            Ver Comanda
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* ========================================================================= */}
        {/* COLUMNA IZQUIERDA: DETALLE DE CONSUMO Y DIVISIÓN (7 Cols) */}
        {/* ========================================================================= */}
        <div className="lg:col-span-7 space-y-5">
          {/* Selector de Modo de Cierre / División */}
          <div className="bg-white  p-2 rounded-2xl border border-slate-200  shadow-sm flex items-center gap-1.5 print:hidden">
            <button
              onClick={() => { setSplitMode('FULL'); setSelectedItemIds([]); }}
              className={`flex-1 py-2.5 px-3 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                splitMode === 'FULL'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                  : 'text-slate-600  hover:bg-slate-100 '
              }`}
            >
              <Receipt className="w-4 h-4" />
              Cuenta Completa
            </button>

            <button
              onClick={() => { setSplitMode('EQUAL'); setSelectedItemIds([]); }}
              className={`flex-1 py-2.5 px-3 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                splitMode === 'EQUAL'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                  : 'text-slate-600  hover:bg-slate-100 '
              }`}
            >
              <Users className="w-4 h-4" />
              Partes Iguales
            </button>

            <button
              onClick={() => setSplitMode('BY_ITEMS')}
              className={`flex-1 py-2.5 px-3 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                splitMode === 'BY_ITEMS'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                  : 'text-slate-600  hover:bg-slate-100 '
              }`}
            >
              <Split className="w-4 h-4" />
              Por Platillos
            </button>
          </div>

          {/* Si está en Partes Iguales: Stepper */}
          {splitMode === 'EQUAL' && (
            <div className="bg-blue-50  p-4 rounded-2xl border border-blue-200  flex items-center justify-between animate-in fade-in">
              <div>
                <span className="text-xs font-bold text-blue-900 ">Dividir entre comensales:</span>
                <p className="text-lg font-extrabold text-blue-600  mt-0.5">
                  ${perPersonAmount.toFixed(2)} <span className="text-xs font-medium text-slate-500">por persona ({splitCount} pers.)</span>
                </p>
              </div>

              <div className="flex items-center gap-2">
                {[2, 3, 4, 5, 6].map(num => (
                  <button
                    key={num}
                    onClick={() => setSplitCount(num)}
                    className={`w-9 h-9 text-xs font-bold rounded-xl border transition-all ${
                      splitCount === num
                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                        : 'bg-white  text-slate-700  border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {num}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Si está en Por Platillos: Botón Seleccionar Todo */}
          {splitMode === 'BY_ITEMS' && (
            <div className="flex items-center justify-between bg-amber-50  p-3 rounded-xl border border-amber-200 ">
              <span className="text-xs font-semibold text-amber-800 ">
                Selecciona los platillos que va a pagar este comensal:
              </span>
              <button
                onClick={handleSelectAllItems}
                className="text-xs font-bold text-amber-700  hover:underline"
              >
                {selectedItemIds.length === order.items.length ? 'Deseleccionar Todo' : 'Seleccionar Todo'}
              </button>
            </div>
          )}

          {/* Lista de Platillos / Consumos */}
          <div className="bg-white  rounded-2xl border border-slate-200  p-5 shadow-sm space-y-3">
            <h3 className="text-sm font-bold text-slate-900  flex items-center gap-2">
              <Utensils className="w-4 h-4 text-emerald-500" />
              Consumo de la Mesa ({order.items.length} ítems)
            </h3>

            <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
              {order.items.map((item: any) => {
                let itemTotal = item.unitPrice * item.quantity;
                item.modifiers.forEach((m: any) => itemTotal += (m.extraPrice * item.quantity));
                const isSelected = selectedItemIds.includes(item.id);

                return (
                  <div
                    key={item.id}
                    onClick={() => isItemSplit && handleToggleItemSelection(item.id)}
                    className={`p-3 rounded-xl border transition-all flex items-center justify-between ${
                      isItemSplit ? 'cursor-pointer hover:border-blue-400' : ''
                    } ${
                      isSelected 
                        ? 'bg-blue-50/70  border-blue-500 ring-2 ring-blue-500/20' 
                        : 'bg-slate-50  border-slate-200 '
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {isItemSplit && (
                        <div className="text-blue-600">
                          {isSelected ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5 text-slate-400" />}
                        </div>
                      )}

                      <div>
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-lg bg-slate-200  text-slate-800  text-xs font-bold flex items-center justify-center">
                            {item.quantity}
                          </span>
                          <span className="text-sm font-bold text-slate-900 ">
                            {item.product.name}
                          </span>
                        </div>

                        {item.variant && (
                          <span className="text-[11px] text-slate-500 ml-8 block">
                            Opción: {item.variant.attribute}
                          </span>
                        )}

                        {item.modifiers.length > 0 && (
                          <div className="ml-8 text-[11px] text-amber-600 ">
                            {item.modifiers.map((m: any) => m.name).join(', ')}
                          </div>
                        )}

                        {item.notes && (
                          <span className="text-[11px] text-slate-400 italic ml-8 block">
                            "{item.notes}"
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-sm font-bold text-slate-900  block">
                        ${itemTotal.toFixed(2)}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        ${item.unitPrice.toFixed(2)} c/u
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* COLUMNA DERECHA: TICKET FINANCIERO, PROPINAS Y COBRO (5 Cols) */}
        {/* ========================================================================= */}
        <div className="lg:col-span-5 space-y-5">
          {/* Card de Pre-cuenta y Propinas */}
          <div className="bg-white  rounded-2xl border border-slate-200  p-6 shadow-sm space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100  pb-3">
              <span className="text-sm font-bold text-slate-900 ">Resumen de Cuenta</span>
              <span className="text-xs font-semibold text-emerald-600  bg-emerald-50  px-2.5 py-0.5 rounded-full border border-emerald-200">
                {isItemSplit ? `${selectedItemIds.length} platillos sel.` : 'Total Mesa'}
              </span>
            </div>

            {/* Selector Táctil de Propinas */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700  flex items-center justify-between">
                <span>Propina para el Servicio</span>
                <span className="text-emerald-600 ">${tipAmount.toFixed(2)}</span>
              </label>

              <div className="grid grid-cols-4 gap-2">
                {[0, 10, 15, 20].map(pct => (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => {
                      setIsCustomTipActive(false);
                      setTipPercentage(pct);
                    }}
                    className={`py-2 text-xs font-bold rounded-xl border transition-all text-center ${
                      !isCustomTipActive && tipPercentage === pct
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-500/20'
                        : 'bg-slate-50  text-slate-700  border-slate-200  hover:bg-slate-100'
                    }`}
                  >
                    <div>{pct === 0 ? 'Sin Propina' : `${pct}%`}</div>
                    <div className="text-[10px] font-normal opacity-80">
                      ${(totalBase * (pct / 100)).toFixed(0)}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Totales */}
            <div className="space-y-2 pt-2 border-t border-slate-100  text-sm">
              <div className="flex justify-between text-slate-600 ">
                <span>Subtotal Consumo:</span>
                <span className="font-semibold text-slate-900 ">${totalBase.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-600 ">
                <span>Propina ({isCustomTipActive ? 'Monto' : `${tipPercentage}%`}):</span>
                <span className="font-semibold text-emerald-600 ">+${tipAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-lg font-black text-slate-900  pt-2 border-t border-slate-200 ">
                <span>Total a Cobrar:</span>
                <span className="text-emerald-600 ">${finalTotal.toFixed(2)}</span>
              </div>
            </div>

            {/* Botón Principal de Cobro */}
            <button
              onClick={handleOpenPayModal}
              disabled={isItemSplit && selectedItemIds.length === 0}
              className={`w-full py-4 text-base font-extrabold text-white rounded-2xl shadow-xl transition-all flex items-center justify-center gap-2 ${
                isItemSplit && selectedItemIds.length === 0
                  ? 'bg-slate-300  cursor-not-allowed text-slate-500'
                  : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/25 active:scale-[0.98]'
              }`}
            >
              <Banknote className="w-5 h-5" />
              {isItemSplit 
                ? `Cobrar Selección ($${finalTotal.toFixed(2)})` 
                : `Cobrar Cuenta Completa ($${finalTotal.toFixed(2)})`
              }
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL DE COBRO RÁPIDO ORGÁNICO */}
      {/* ========================================================================= */}
      {isPayModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white  rounded-3xl border border-slate-200  p-6 md:p-8 max-w-xl w-full shadow-2xl animate-in zoom-in-95 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100  pb-4">
              <div>
                <h3 className="text-xl font-bold text-slate-900 ">Liquidar y Cerrar Cuenta</h3>
                <p className="text-xs text-slate-500 ">{order.table.name} | Total con Propina: ${finalTotal.toFixed(2)}</p>
              </div>
              <span className="text-2xl font-black text-emerald-600 ">${finalTotal.toFixed(2)}</span>
            </div>

            <form onSubmit={handleProcessPayment} className="space-y-5">
              {/* Selector de Método de Pago con Botones Grandes */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 ">Método de Pago</label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { id: 'CASH', label: 'Efectivo', icon: Banknote },
                    { id: 'CARD', label: 'Tarjeta', icon: CreditCard },
                    { id: 'TRANSFER', label: 'Transferencia', icon: ArrowRightLeft },
                    { id: 'MIXTO', label: 'Mixto', icon: Split }
                  ].map(m => {
                    const Icon = m.icon;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setPaymentMethod(m.id as any)}
                        className={`py-3 px-2 text-xs font-bold rounded-2xl border transition-all flex flex-col items-center gap-1.5 ${
                          paymentMethod === m.id
                            ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/20'
                            : 'bg-slate-50  text-slate-700  border-slate-200  hover:bg-slate-100'
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                        <span>{m.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Si es Efectivo: Denominaciones Rápidas & Cambio */}
              {paymentMethod === 'CASH' && (
                <div className="p-4 bg-slate-50  rounded-2xl border border-slate-200  space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700 ">Efectivo Recibido</label>
                    {changeAmount > 0 && (
                      <span className="text-xs font-black text-emerald-600  bg-emerald-100  px-3 py-1 rounded-full">
                        Cambio: ${changeAmount.toFixed(2)}
                      </span>
                    )}
                  </div>

                  <input
                    type="number"
                    step="any"
                    min={finalTotal}
                    value={cashReceived}
                    onChange={(e) => setCashReceived(parseFloat(e.target.value) || 0)}
                    className="w-full px-4 py-3 text-xl font-bold bg-white  border border-slate-200  rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500  text-right"
                  />

                  {/* Billetes rápidos */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setCashReceived(Math.ceil(finalTotal))}
                      className="flex-1 py-1.5 text-xs font-bold rounded-lg bg-white  border border-slate-200  hover:bg-slate-100"
                    >
                      Exacto
                    </button>
                    {[100, 200, 500, 1000].map(bill => (
                      <button
                        key={bill}
                        type="button"
                        onClick={() => setCashReceived(bill)}
                        className="flex-1 py-1.5 text-xs font-bold rounded-lg bg-white  border border-slate-200  hover:bg-slate-100"
                      >
                        ${bill}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Si es Mixto */}
              {paymentMethod === 'MIXTO' && (
                <div className="grid grid-cols-3 gap-3 p-4 bg-slate-50  rounded-2xl border border-slate-200 ">
                  <div>
                    <label className="text-[11px] font-bold text-slate-600  block mb-1">Efectivo</label>
                    <input
                      type="number"
                      step="any"
                      value={cashAmount}
                      onChange={(e) => setCashAmount(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 text-sm font-bold bg-white  border border-slate-200  rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-600  block mb-1">Tarjeta</label>
                    <input
                      type="number"
                      step="any"
                      value={cardAmount}
                      onChange={(e) => setCardAmount(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 text-sm font-bold bg-white  border border-slate-200  rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-600  block mb-1">Transferencia</label>
                    <input
                      type="number"
                      step="any"
                      value={transferAmount}
                      onChange={(e) => setTransferAmount(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 text-sm font-bold bg-white  border border-slate-200  rounded-xl"
                    />
                  </div>
                </div>
              )}

              {/* Cliente para Facturación / Puntos */}
              <div>
                <label className="text-xs font-semibold text-slate-700  block mb-1">
                  Cliente (Opcional para Factura o Puntos)
                </label>
                <select
                  value={selectedCustomerId}
                  onChange={(e) => setSelectedCustomerId(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm bg-slate-50  border border-slate-200  rounded-xl "
                >
                  <option value="">Público en General / Sin Cliente</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.taxId ? `(${c.taxId})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-100 ">
                <button
                  type="button"
                  onClick={() => setIsPayModalOpen(false)}
                  className="px-5 py-2.5 text-sm font-semibold text-slate-600  hover:bg-slate-100 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isProcessingPay}
                  className="flex items-center gap-2 px-8 py-3 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-lg shadow-emerald-500/20 active:scale-95 transition-all"
                >
                  <CheckCircle2 className="w-5 h-5" />
                  {isProcessingPay ? 'Procesando Venta...' : 'Completar Cobro y Liberar Mesa'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
