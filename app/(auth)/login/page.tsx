'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LogIn, Building2, ShieldCheck, Zap, AlertTriangle, CreditCard, ChevronRight } from 'lucide-react';
import Link from 'next/link';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Autenticación fallida. Revisa tus credenciales.');
      }

      router.push('/');
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-[#0a0a0a] font-sans selection:bg-indigo-500/30">
      
      {/* Left Column - Branding & Value Prop */}
      <div className="hidden lg:flex lg:w-5/12 relative overflow-hidden flex-col justify-between p-12 border-r border-white/10">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/40 via-[#0a0a0a] to-purple-900/20 z-0"></div>
        
        {/* Glow Effects */}
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-indigo-600/20 blur-[120px] mix-blend-screen pointer-events-none"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] rounded-full bg-purple-600/10 blur-[150px] mix-blend-screen pointer-events-none"></div>

        <div className="relative z-10 flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/25 border border-white/10">
            <Building2 size={22} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">CAANMA PRO</h1>
        </div>
          
        <div className="relative z-10 mt-auto mb-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-sm font-medium mb-6">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
            </span>
            Sistema Operativo Multi-Tenant
          </div>
          <h2 className="text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white via-indigo-100 to-indigo-300 mb-6 leading-tight tracking-tight">
            Control absoluto <br />para tu corporativo.
          </h2>
          <p className="text-gray-400 text-lg mb-12 leading-relaxed max-w-md font-light">
            Administra sucursales, facturación CFDI 4.0, biometría y nómina desde un entorno seguro y escalable.
          </p>
            
          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center border border-white/10 text-indigo-400 backdrop-blur-md">
                <ShieldCheck size={20} />
              </div>
              <div>
                <h3 className="text-white font-medium mb-1">Aislamiento de Datos</h3>
                <p className="text-gray-500 text-sm leading-relaxed">Tu información está particionada de forma segura mediante arquitectura Tenant-ID.</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center border border-white/10 text-purple-400 backdrop-blur-md">
                <Zap size={20} />
              </div>
              <div>
                <h3 className="text-white font-medium mb-1">Rendimiento Edge</h3>
                <p className="text-gray-500 text-sm leading-relaxed">Infraestructura global optimizada para latencia mínima en Puntos de Venta.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="relative z-10 text-gray-500 text-sm font-medium">
          © {new Date().getFullYear()} CAANMA INC. Cloud Platform.
        </div>
      </div>

      {/* Right Column - Login Form */}
      <div className="flex flex-1 flex-col justify-center px-6 py-12 lg:px-24 xl:px-32 relative">
        <div className="absolute top-0 right-0 w-[800px] h-[800px] rounded-full bg-indigo-900/5 blur-[150px] pointer-events-none"></div>
        
        <div className="mx-auto w-full max-w-md relative z-10">
          
          <div className="lg:hidden flex items-center gap-3 mb-10">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/25 border border-white/10">
              <Building2 size={22} className="text-white" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white">CAANMA PRO</h1>
          </div>

          <div className="mb-10">
            <h2 className="text-3xl font-bold tracking-tight text-white mb-2">
              Bienvenido de vuelta
            </h2>
            <p className="text-gray-400">
              Ingresa tus credenciales para acceder a tu entorno.
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-xl flex items-start gap-3 backdrop-blur-sm">
              <AlertTriangle size={20} className="flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Correo Electrónico Empresarial
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="block w-full rounded-xl border border-white/10 bg-white/5 py-3.5 px-4 text-white placeholder:text-gray-600 focus:bg-white/10 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all outline-none sm:text-sm"
                placeholder="usuario@empresa.com"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-300">
                  Contraseña
                </label>
                <a href="#" className="text-sm font-medium text-indigo-400 hover:text-indigo-300 transition-colors">
                  ¿Problemas de acceso?
                </a>
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="block w-full rounded-xl border border-white/10 bg-white/5 py-3.5 px-4 text-white placeholder:text-gray-600 focus:bg-white/10 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all outline-none sm:text-sm"
                placeholder="••••••••"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="group relative flex w-full justify-center items-center gap-2 rounded-xl bg-white px-4 py-3.5 text-sm font-bold text-gray-900 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-white/50 disabled:opacity-70 disabled:cursor-not-allowed transition-all shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-[0_0_25px_rgba(255,255,255,0.2)] overflow-hidden"
              >
                {loading ? (
                  <svg className="animate-spin h-5 w-5 text-gray-900" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                ) : (
                  <>
                    <span>Acceder al Dashboard</span>
                    <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Multi-tenant & Billing Links for future scalability */}
          <div className="mt-12 pt-8 border-t border-white/10">
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">Gestión Corporativa</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button className="flex items-center gap-3 p-3 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/10 transition-all group text-left">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Building2 size={16} />
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-200">Nueva Empresa</div>
                  <div className="text-xs text-gray-500">Registrar cuenta</div>
                </div>
              </button>

              <button className="flex items-center gap-3 p-3 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/10 transition-all group text-left">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <CreditCard size={16} />
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-200">Portal de Pagos</div>
                  <div className="text-xs text-gray-500">Suscripciones</div>
                </div>
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
