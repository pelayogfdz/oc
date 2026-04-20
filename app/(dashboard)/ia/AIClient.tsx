'use client';
import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2, Sparkles } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

type Message = {
  role: 'user' | 'model';
  content: string;
};

export default function AIClient({ user, branch }: { user: any, branch: any }) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'model',
      content: `¡Hola ${user.name}! Soy Alina, tu Asistente de Negocios Inteligente de Office City.\n\nPuedes preguntarme sobre ventas, inventario, realizar comparaciones o simplemente pedirme que analice algún escenario. ¿En qué te ayudo hoy?`
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of chat
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: userMessage,
          branchContext: branch,
          userContext: user
        })
      });

      if (!res.ok) {
        let errorDetails = '';
        try {
          const errData = await res.json();
          errorDetails = errData.error || res.statusText;
        } catch(e) {
          errorDetails = res.statusText;
        }
        throw new Error(`Detalle del servidor: ${errorDetails}`);
      }

      const data = await res.json();
      
      if (data.error) {
        setMessages(prev => [...prev, { role: 'model', content: `**Error de API:** ${data.error}` }]);
      } else {
        setMessages(prev => [...prev, { role: 'model', content: data.text }]);
      }

    } catch (error: any) {
      setMessages(prev => [...prev, { role: 'model', content: `**Ocurrió un error inesperado:** ${error.message}` }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 120px)', backgroundColor: 'white', borderRadius: '12px', border: '1px solid var(--pulpos-border)', overflow: 'hidden' }}>
      
      {/* Header */}
      <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--pulpos-border)', display: 'flex', alignItems: 'center', gap: '1rem', backgroundColor: '#f8fafc' }}>
        <div style={{ backgroundColor: '#e0e7ff', padding: '0.75rem', borderRadius: '12px' }}>
          <Sparkles size={24} color="#4f46e5" />
        </div>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 'bold', color: '#0f172a' }}>Alina (Asistente IA)</h1>
          <p style={{ margin: 0, fontSize: '0.875rem', color: '#64748b' }}>Conectado a Google Gemini</p>
        </div>
      </div>

      {/* Chat Area */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {messages.map((msg, idx) => (
          <div key={idx} style={{ display: 'flex', gap: '1rem', flexDirection: msg.role === 'user' ? 'row-reverse' : 'row' }}>
            <div style={{ 
              width: '36px', height: '36px', borderRadius: '50%', flexShrink: 0, 
              backgroundColor: msg.role === 'user' ? '#f1f5f9' : '#4f46e5',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              {msg.role === 'user' ? <User size={18} color="#475569" /> : <Bot size={18} color="white" />}
            </div>
            
            <div style={{ 
              backgroundColor: msg.role === 'user' ? '#f8fafc' : '#ffffff', 
              border: msg.role === 'user' ? '1px solid #e2e8f0' : '1px solid #e0e7ff',
              padding: '1rem', 
              borderRadius: '12px', 
              borderTopRightRadius: msg.role === 'user' ? '0px' : '12px',
              borderTopLeftRadius: msg.role === 'model' ? '0px' : '12px',
              maxWidth: '85%',
              boxShadow: msg.role === 'model' ? '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)' : 'none',
              color: '#1e293b',
              fontSize: '0.95rem',
              lineHeight: '1.5',
              overflowX: 'auto'
            }}>
              {/* @ts-ignore */}
              <ReactMarkdown 
                remarkPlugins={[remarkGfm]}
                components={{
                  table: ({node, ...props}) => <table style={{borderCollapse: 'collapse', width: '100%', marginBottom: '1rem'}} {...props} />,
                  th: ({node, ...props}) => <th style={{border: '1px solid #cbd5e1', padding: '8px', backgroundColor: '#f1f5f9', fontWeight: 'bold'}} {...props} />,
                  td: ({node, ...props}) => <td style={{border: '1px solid #cbd5e1', padding: '8px'}} {...props} />,
                  code: ({node, inline, ...props}: any) => inline ? <code style={{backgroundColor: '#f1f5f9', padding: '2px 4px', borderRadius: '4px', border: '1px solid #e2e8f0'}} {...props} /> : <pre style={{backgroundColor: '#1e293b', color: '#f8fafc', padding: '1rem', borderRadius: '8px', overflowX: 'auto'}}><code {...props} /></pre>
                }}
              >
                {msg.content}
              </ReactMarkdown>
            </div>
          </div>
        ))}

        {isLoading && (
          <div style={{ display: 'flex', gap: '1rem' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: '#4f46e5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Bot size={18} color="white" />
            </div>
            <div style={{ padding: '1rem', borderRadius: '12px', borderTopLeftRadius: '0px', backgroundColor: '#ffffff', border: '1px solid #e0e7ff', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Loader2 size={16} className="lucide-spin" color="#4f46e5" />
              <span style={{ color: '#64748b', fontSize: '0.9rem' }}>Alina está pensando...</span>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div style={{ padding: '1.5rem', borderTop: '1px solid var(--pulpos-border)' }}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '1rem', position: 'relative' }}>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isLoading}
            placeholder="Pregúntame sobre ventas, inventario o análisis de tendencias..."
            style={{ 
              flex: 1, 
              padding: '1rem 1.5rem', 
              paddingRight: '4rem',
              borderRadius: '9999px', 
              border: '1px solid #cbd5e1', 
              outline: 'none',
              fontSize: '1rem',
              boxShadow: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)',
              transition: 'border-color 0.2s'
            }}
            onFocus={(e) => e.target.style.borderColor = '#4f46e5'}
            onBlur={(e) => e.target.style.borderColor = '#cbd5e1'}
          />
          <button 
            type="submit" 
            disabled={!input.trim() || isLoading}
            style={{ 
              position: 'absolute',
              right: '0.5rem',
              top: '50%',
              transform: 'translateY(-50%)',
              backgroundColor: !input.trim() || isLoading ? '#e2e8f0' : '#4f46e5', 
              color: 'white', 
              border: 'none', 
              width: '40px',
              height: '40px',
              borderRadius: '50%', 
              cursor: !input.trim() || isLoading ? 'not-allowed' : 'pointer',
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              transition: 'background-color 0.2s'
            }}
          >
            <Send size={18} />
          </button>
        </form>
        <p style={{ textAlign: 'center', color: '#94a3b8', fontSize: '0.75rem', marginTop: '0.75rem', marginBottom: 0 }}>
          La IA puede cometer errores. Verifica la información financiera crítica.
        </p>
      </div>

    </div>
  );
}
