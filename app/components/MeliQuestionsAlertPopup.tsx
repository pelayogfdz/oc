'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  HelpCircle, X, Send, ExternalLink, MessageSquare, 
  CheckCircle2, Loader2, Sparkles 
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface MeliQuestion {
  id: string;
  text: string;
  status: string;
  date_created: string;
  from_id?: string | null;
  item_id: string;
  item_title: string;
  item_permalink: string;
  item_thumbnail?: string | null;
  item_price?: number | null;
  branch_id?: string;
}

export default function MeliQuestionsAlertPopup() {
  const [questions, setQuestions] = useState<MeliQuestion[]>([]);
  const [activeQuestion, setActiveQuestion] = useState<MeliQuestion | null>(null);
  const [answerText, setAnswerText] = useState<string>('');
  const [isSending, setIsSending] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const checkPendingQuestions = async () => {
    try {
      const res = await fetch('/api/mercadolibre/questions', { cache: 'no-store' });
      if (!res.ok) return;
      const data = await res.json();
      const fetched: MeliQuestion[] = data.questions || [];

      if (fetched.length === 0) {
        setQuestions([]);
        if (activeQuestion) setActiveQuestion(null);
        return;
      }

      // Obtener preguntas ya descartadas o respondidas en esta sesión
      let dismissedQuestions: string[] = [];
      try {
        const stored = localStorage.getItem('dismissedMeliQuestions');
        if (stored) dismissedQuestions = JSON.parse(stored);
      } catch (e) {}

      // Filtrar no descartadas
      const pending = fetched.filter(q => !dismissedQuestions.includes(q.id));
      setQuestions(pending);

      if (pending.length > 0) {
        // Si no hay una activa actualmente o la activa ya no está en pendientes, poner la primera
        if (!activeQuestion || !pending.some(q => q.id === activeQuestion.id)) {
          setActiveQuestion(pending[0]);
          setAnswerText('');
          setSuccessMessage(null);
          setErrorMessage(null);

          // Sonido de notificación suave
          try {
            const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-600.wav');
            audio.volume = 0.45;
            audio.play().catch(() => {});
          } catch (e) {}
        }
      } else {
        setActiveQuestion(null);
      }
    } catch (err) {
      console.error('[MeliQuestionsAlertPopup] Error checking questions:', err);
    }
  };

  useEffect(() => {
    // Sondeo inicial a los 4 segundos
    const initialTimer = setTimeout(checkPendingQuestions, 4000);
    // Sondeo periódico cada 25 segundos
    const interval = setInterval(checkPendingQuestions, 25000);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(interval);
    };
  }, []);

  const handleDismiss = (qId?: string) => {
    const idToDismiss = qId || activeQuestion?.id;
    if (!idToDismiss) return;

    try {
      let dismissedQuestions: string[] = [];
      const stored = localStorage.getItem('dismissedMeliQuestions');
      if (stored) dismissedQuestions = JSON.parse(stored);
      if (!dismissedQuestions.includes(idToDismiss)) {
        dismissedQuestions.push(idToDismiss);
        localStorage.setItem('dismissedMeliQuestions', JSON.stringify(dismissedQuestions));
      }
    } catch (e) {}

    const remaining = questions.filter(q => q.id !== idToDismiss);
    setQuestions(remaining);
    if (remaining.length > 0) {
      setActiveQuestion(remaining[0]);
      setAnswerText('');
      setSuccessMessage(null);
      setErrorMessage(null);
    } else {
      setActiveQuestion(null);
    }
  };

  const handleSendAnswer = async () => {
    if (!activeQuestion || !answerText.trim() || isSending) return;

    setIsSending(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = await fetch('/api/mercadolibre/questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionId: activeQuestion.id,
          text: answerText.trim(),
          branchId: activeQuestion.branch_id
        })
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setSuccessMessage('¡Respuesta enviada con éxito a Mercado Libre!');
        
        // Guardar como descartada/respondida
        handleDismiss(activeQuestion.id);
      } else {
        setErrorMessage(data.error || 'No se pudo enviar la respuesta a Mercado Libre.');
      }
    } catch (err: any) {
      setErrorMessage('Error de conexión: ' + (err.message || String(err)));
    } finally {
      setIsSending(false);
    }
  };

  const setQuickTemplate = (text: string) => {
    setAnswerText(text);
  };

  if (!activeQuestion) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: '24px',
      left: '24px',
      width: '430px',
      maxWidth: 'calc(100vw - 32px)',
      backgroundColor: '#ffffff',
      borderRadius: '16px',
      boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.1), 0 0 0 1px rgba(0,0,0,0.06)',
      borderLeft: '6px solid #f59e0b',
      padding: '1.25rem',
      zIndex: 99998,
      animation: 'slideInQuestionAlert 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
      fontFamily: 'var(--font-geist-sans), system-ui, -apple-system, sans-serif'
    }}>
      <style>{`
        @keyframes slideInQuestionAlert {
          from { transform: translateY(80px) scale(0.92); opacity: 0; }
          to { transform: translateY(0) scale(1); opacity: 1; }
        }
        @keyframes pulseQuestionIcon {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.15); }
        }
      `}</style>

      {/* Cabecera del Popup */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#d97706' }}>
          <HelpCircle size={22} style={{ animation: 'pulseQuestionIcon 2s infinite ease-in-out' }} />
          <span style={{ fontWeight: '800', fontSize: '0.95rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            ¡Nueva Pregunta en Mercado Libre!
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          {questions.length > 1 && (
            <span style={{
              fontSize: '0.75rem',
              fontWeight: '700',
              backgroundColor: '#fef3c7',
              color: '#92400e',
              padding: '0.15rem 0.5rem',
              borderRadius: '999px'
            }}>
              1 de {questions.length}
            </span>
          )}
          <button 
            onClick={() => handleDismiss()}
            style={{
              background: 'none',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              padding: '4px',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background-color 0.15s'
            }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f1f5f9'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
            title="Descartar Pregunta"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Publicación Asociada */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.65rem',
        padding: '0.5rem 0.75rem',
        backgroundColor: '#fffbeb',
        borderRadius: '8px',
        border: '1px solid #fde68a',
        marginBottom: '0.75rem'
      }}>
        {activeQuestion.item_thumbnail ? (
          <img 
            src={activeQuestion.item_thumbnail} 
            alt={activeQuestion.item_title} 
            style={{ width: '40px', height: '40px', objectFit: 'contain', borderRadius: '4px', backgroundColor: 'white', border: '1px solid #e2e8f0', flexShrink: 0 }}
          />
        ) : (
          <div style={{ width: '40px', height: '40px', borderRadius: '4px', backgroundColor: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <MessageSquare size={18} color="#d97706" />
          </div>
        )}
        <div style={{ minWidth: 0, flex: 1 }}>
          <a 
            href={activeQuestion.item_permalink} 
            target="_blank" 
            rel="noreferrer"
            style={{
              fontSize: '0.82rem',
              fontWeight: '700',
              color: '#1e293b',
              textDecoration: 'none',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              lineHeight: '1.25'
            }}
            title={activeQuestion.item_title}
          >
            {activeQuestion.item_title}
          </a>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.2rem', fontSize: '0.72rem', color: '#64748b' }}>
            <span style={{ fontFamily: 'monospace' }}>{activeQuestion.item_id}</span>
            {activeQuestion.item_price !== undefined && activeQuestion.item_price !== null && (
              <span style={{ fontWeight: 'bold', color: '#15803d' }}>
                {formatCurrency(activeQuestion.item_price)}
              </span>
            )}
            <a 
              href={activeQuestion.item_permalink} 
              target="_blank" 
              rel="noreferrer"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.15rem', color: '#d97706', textDecoration: 'none', fontWeight: 'bold' }}
            >
              Ver <ExternalLink size={10} />
            </a>
          </div>
        </div>
      </div>

      {/* Pregunta del Cliente */}
      <div style={{
        backgroundColor: '#f8fafc',
        padding: '0.75rem',
        borderRadius: '8px',
        marginBottom: '0.75rem',
        border: '1px solid #e2e8f0'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
          <span style={{ fontSize: '0.72rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>
            Pregunta del Comprador
          </span>
          <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
            {new Date(activeQuestion.date_created).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' })}
          </span>
        </div>
        <div style={{ fontSize: '0.9rem', fontWeight: '600', color: '#0f172a', lineHeight: '1.35', paddingLeft: '0.4rem', borderLeft: '3px solid #f59e0b' }}>
          ¿{activeQuestion.text}?
        </div>
      </div>

      {/* Respuestas Rápidas Sugeridas */}
      <div style={{ display: 'flex', gap: '0.35rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
        <button 
          onClick={() => setQuickTemplate("¡Hola! Sí, tenemos stock disponible para envío inmediato. ¡Esperamos tu compra!")}
          style={{
            fontSize: '0.72rem',
            padding: '0.2rem 0.45rem',
            borderRadius: '6px',
            backgroundColor: '#f1f5f9',
            border: '1px solid #cbd5e1',
            color: '#334155',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.25rem'
          }}
        >
          <Sparkles size={11} color="#d97706" /> Con stock inmediato
        </button>
        <button 
          onClick={() => setQuickTemplate("¡Hola! Sí, todos nuestros precios incluyen IVA y emitimos factura fiscal. ¡Quedamos a tus órdenes!")}
          style={{
            fontSize: '0.72rem',
            padding: '0.2rem 0.45rem',
            borderRadius: '6px',
            backgroundColor: '#f1f5f9',
            border: '1px solid #cbd5e1',
            color: '#334155',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.25rem'
          }}
        >
          <Sparkles size={11} color="#d97706" /> Sí facturamos
        </button>
      </div>

      {/* Input de Respuesta */}
      <div style={{ marginBottom: '0.75rem' }}>
        <textarea
          value={answerText}
          onChange={e => setAnswerText(e.target.value)}
          onKeyDown={e => {
            if ((e.key === 'Enter' && (e.ctrlKey || e.metaKey)) && !isSending && answerText.trim()) {
              e.preventDefault();
              handleSendAnswer();
            }
          }}
          placeholder="Escribe tu respuesta oficial (Ctrl + Enter para enviar)..."
          rows={2}
          style={{
            width: '100%',
            padding: '0.65rem 0.75rem',
            borderRadius: '8px',
            border: '1px solid #cbd5e1',
            fontSize: '0.85rem',
            resize: 'none',
            fontFamily: 'inherit',
            boxSizing: 'border-box',
            outline: 'none'
          }}
          onFocus={e => e.currentTarget.style.borderColor = '#f59e0b'}
          onBlur={e => e.currentTarget.style.borderColor = '#cbd5e1'}
        />
      </div>

      {/* Mensajes de Estado */}
      {errorMessage && (
        <div style={{ fontSize: '0.75rem', color: '#dc2626', backgroundColor: '#fef2f2', padding: '0.4rem 0.6rem', borderRadius: '6px', marginBottom: '0.6rem', border: '1px solid #fecaca' }}>
          {errorMessage}
        </div>
      )}

      {successMessage && (
        <div style={{ fontSize: '0.75rem', color: '#15803d', backgroundColor: '#f0fdf4', padding: '0.4rem 0.6rem', borderRadius: '6px', marginBottom: '0.6rem', border: '1px solid #bbf7d0', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <CheckCircle2 size={13} /> {successMessage}
        </div>
      )}

      {/* Botones de Acción */}
      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'space-between', alignItems: 'center' }}>
        <Link
          href="/integraciones/mercadolibre"
          onClick={() => handleDismiss()}
          style={{
            fontSize: '0.78rem',
            color: '#64748b',
            textDecoration: 'underline',
            fontWeight: '600'
          }}
        >
          Ver Centro de Mensajes
        </Link>

        <div style={{ display: 'flex', gap: '0.4rem' }}>
          <button
            onClick={() => handleDismiss()}
            style={{
              backgroundColor: '#f1f5f9',
              color: '#475569',
              border: '1px solid #cbd5e1',
              padding: '0.45rem 0.75rem',
              borderRadius: '8px',
              fontSize: '0.8rem',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            Omitir
          </button>

          <button
            onClick={handleSendAnswer}
            disabled={isSending || !answerText.trim()}
            style={{
              backgroundColor: '#d97706',
              color: 'white',
              border: 'none',
              padding: '0.45rem 0.9rem',
              borderRadius: '8px',
              fontSize: '0.82rem',
              fontWeight: 'bold',
              cursor: (isSending || !answerText.trim()) ? 'not-allowed' : 'pointer',
              opacity: (isSending || !answerText.trim()) ? 0.65 : 1,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              boxShadow: '0 2px 4px rgba(217, 119, 6, 0.25)'
            }}
          >
            {isSending ? (
              <>
                <Loader2 size={14} className="animate-spin" /> Enviando...
              </>
            ) : (
              <>
                <Send size={14} /> Responder
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
