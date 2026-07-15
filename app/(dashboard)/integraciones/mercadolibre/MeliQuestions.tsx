'use client';
import { useState, useEffect } from 'react';
import { MessageSquare, Send, RefreshCw, ExternalLink } from 'lucide-react';

interface Question {
  id: string;
  text: string;
  date_created: string;
  item_id: string;
  item_title: string;
  item_permalink: string;
}

export default function MeliQuestions() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [sendingId, setSendingId] = useState<string | null>(null);

  const fetchQuestions = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/mercadolibre/questions');
      const data = await res.json();
      if (data.success) {
        setQuestions(data.questions);
      } else {
        console.error('Error al cargar preguntas:', data.error);
      }
    } catch (e) {
      console.error('Error al conectar con la API de preguntas:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchQuestions();
  }, []);

  const handleSendAnswer = async (qId: string) => {
    const text = answers[qId]?.trim();
    if (!text) return;

    setSendingId(qId);
    try {
      const res = await fetch('/api/mercadolibre/questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionId: qId, text })
      });
      const data = await res.json();

      if (res.ok && data.success) {
        alert("Respuesta enviada con éxito.");
        // Eliminar la pregunta de la lista local
        setQuestions(prev => prev.filter(q => q.id !== qId));
        // Limpiar el campo de respuesta
        setAnswers(prev => {
          const copy = { ...prev };
          delete copy[qId];
          return copy;
        });
      } else {
        alert("Error al enviar la respuesta: " + (data.error || "Error desconocido"));
      }
    } catch (e) {
      alert("Error de comunicación: " + String(e));
    } finally {
      setSendingId(null);
    }
  };

  return (
    <div style={{ marginTop: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <MessageSquare size={22} color="var(--caanma-primary)" />
          <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', margin: 0 }}>Centro de Mensajería: Preguntas de Clientes</h2>
        </div>
        <button 
          onClick={fetchQuestions}
          className="btn-secondary" 
          style={{ padding: '0.4rem 0.8rem', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.85rem' }}
        >
          <RefreshCw size={14} /> Actualizar Preguntas
        </button>
      </div>

      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--caanma-text-muted)' }}>
          <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 1rem' }} />
          Cargando preguntas pendientes...
        </div>
      ) : questions.length === 0 ? (
        <div className="card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--caanma-text-muted)', border: '1px dashed var(--caanma-border)' }}>
          🎉 ¡Felicidades! No tienes ninguna pregunta pendiente por responder en Mercado Libre.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {questions.map((q) => (
            <div key={q.id} className="card" style={{ padding: '1.5rem', border: '1px solid var(--caanma-border)' }}>
              {/* Publicación Asociada */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.5rem' }}>
                <div style={{ fontSize: '0.85rem' }}>
                  <span style={{ color: 'var(--caanma-text-muted)' }}>Publicación: </span>
                  <a 
                    href={q.item_permalink} 
                    target="_blank" 
                    rel="noreferrer" 
                    style={{ fontWeight: 'bold', color: 'var(--caanma-primary)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
                  >
                    {q.item_title} <ExternalLink size={12} />
                  </a>
                  <span style={{ color: 'var(--caanma-text-muted)', marginLeft: '0.5rem' }}>({q.item_id})</span>
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--caanma-text-muted)' }}>
                  {new Date(q.date_created).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' })}
                </div>
              </div>

              {/* Contenido de la Pregunta */}
              <div style={{ fontSize: '1rem', fontWeight: '500', marginBottom: '1.25rem', paddingLeft: '0.5rem', borderLeft: '3px solid #cbd5e1' }}>
                ¿{q.text}?
              </div>

              {/* Formulario de Respuesta */}
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <textarea 
                  value={answers[q.id] || ''}
                  onChange={e => setAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                  placeholder="Escribe tu respuesta pública para el cliente..."
                  rows={2}
                  style={{
                    flex: 1,
                    padding: '0.75rem',
                    borderRadius: '6px',
                    border: '1px solid var(--caanma-border)',
                    resize: 'none',
                    fontSize: '0.9rem',
                    fontFamily: 'inherit'
                  }}
                />
                <button 
                  onClick={() => handleSendAnswer(q.id)}
                  disabled={sendingId === q.id || !answers[q.id]?.trim()}
                  className="btn-primary"
                  style={{
                    padding: '0.75rem 1.25rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    borderRadius: '6px',
                    alignSelf: 'stretch',
                    opacity: (sendingId === q.id || !answers[q.id]?.trim()) ? 0.6 : 1
                  }}
                >
                  <Send size={16} />
                  {sendingId === q.id ? 'Enviando...' : 'Responder'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
