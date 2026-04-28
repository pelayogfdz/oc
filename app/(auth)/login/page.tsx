'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Building2, Image as ImageIcon, Tag, Users,
  MessageCircle, FileCheck, Receipt, Coins,
  Warehouse, Truck, DollarSign, X, CheckCircle, Plus,
  Mail, Phone, ShieldCheck, Zap, AlertTriangle, UserPlus, LogIn, ChevronRight
} from "lucide-react";

// --- Components ---

function Modal({ isOpen, onClose, title, children }: { isOpen: boolean, onClose: () => void, title: string, children: React.ReactNode }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center sm:p-6 animate-in fade-in duration-200">
      <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-md hidden sm:block" onClick={onClose}></div>
      <div className="bg-white w-full h-full sm:h-auto sm:max-w-lg sm:rounded-[2rem] p-6 sm:p-12 shadow-none sm:shadow-[0_20px_50px_-12px_rgba(0,0,0,0.2)] relative animate-in slide-in-from-bottom-full sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-200 overflow-y-auto border-0 sm:border border-gray-100 z-10 flex flex-col justify-start sm:block pt-16 sm:pt-12">
        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-purple-500 via-purple-600 to-indigo-600 hidden sm:block"></div>
        <button type="button" onClick={onClose} className="absolute top-6 right-6 text-gray-400 hover:text-gray-900 transition-colors z-50 bg-gray-50 hover:bg-gray-100 rounded-full p-2">
          <X className="w-5 h-5" />
        </button>
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-[1rem] bg-[#8b5cf6] shadow-sm flex items-center justify-center text-white font-bold text-2xl">C</div>
            <span className="text-3xl font-extrabold text-[#8b5cf6] tracking-tight">CAANMA</span>
          </div>
          <h3 className="text-3xl font-bold font-sans text-[#1e293b] tracking-tight mb-2">{title}</h3>
          {children}
        </div>
      </div>
    </div>
  );
}

function FeatureSection({ title, features, imageSrc, reverse = false, tag }: any) {
  return (
    <section className={`py-16 lg:py-24 ${reverse ? 'bg-gray-50' : 'bg-white'}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className={`flex flex-col lg:flex-row items-center gap-12 lg:gap-20 ${reverse ? 'lg:flex-row-reverse' : ''}`}>
          <div className="lg:w-1/2">
            {tag && (
              <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-purple-50 text-purple-700 rounded-full text-sm font-bold mb-6 border border-purple-100">
                {tag}
              </div>
            )}
            <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-8 leading-tight tracking-tight">{title}</h2>
            <div className="space-y-8">
              {features.map((f: any, i: number) => (
                <div key={i} className="flex gap-4">
                  <div className="flex-shrink-0 w-12 h-12 rounded-2xl bg-white border border-gray-100 shadow-sm flex items-center justify-center">
                    {f.icon}
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-gray-900 mb-1">{f.title}</h4>
                    <p className="text-gray-600 leading-relaxed text-sm md:text-base">{f.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="lg:w-1/2 w-full">
            <div className="relative rounded-3xl overflow-hidden shadow-[0_20px_50px_rgba(8,_112,_184,_0.07)] border border-gray-100 bg-white">
              <div className="w-full aspect-[4/3] bg-gray-50 flex items-center justify-center p-2">
                {imageSrc ? <img src={imageSrc} alt={title} className="w-full h-full object-cover rounded-2xl" /> : <ImageIcon size={48} className="text-gray-300" />}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="bg-white py-16 border-t border-gray-100 mt-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-8 lg:px-16">
        <div className="grid md:grid-cols-2 gap-12 mb-12">
          <div>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center shadow-lg text-white font-bold text-2xl">
                C
              </div>
              <span className="text-3xl font-extrabold tracking-tight">CAANMA</span>
            </div>
            <p className="text-gray-600 max-w-sm mb-6 leading-relaxed">
              El sistema más intuitivo para corporativos en México. Gestiona ventas, inventario y facturación desde un solo lugar seguro y escalable.
            </p>
            <div className="flex gap-3">
              <a href="#" className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center hover:bg-[#ff0050] hover:text-white transition-all text-gray-500" title="TikTok">
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/></svg>
              </a>
              <a href="#" className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center hover:bg-[#1877f2] hover:text-white transition-all text-gray-500" title="Facebook">
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
              </a>
              <a href="#" className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center hover:bg-[#e1306c] hover:text-white transition-all text-gray-500" title="Instagram">
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
              </a>
            </div>
          </div>
          <div className="flex flex-col md:items-end justify-center">
             <h4 className="text-lg font-bold mb-4 text-gray-900">Contáctanos</h4>
             <a href="mailto:hola@caanma.com" className="text-gray-600 hover:text-[var(--pulpos-primary)] mb-3 flex items-center gap-2 transition-colors"><Mail size={16}/> hola@caanma.com</a>
             <a href="tel:+521234567890" className="text-gray-600 hover:text-[var(--pulpos-primary)] flex items-center gap-2 transition-colors"><Phone size={16}/> +52 (123) 456-7890</a>
          </div>
        </div>
        <div className="pt-8 border-t border-gray-100 text-center text-gray-500 text-sm flex flex-col md:flex-row justify-between items-center">
          <p>© {new Date().getFullYear()} Caanma. Todos los derechos reservados.</p>
          <div className="mt-4 md:mt-0 flex gap-6">
            <a href="#" className="hover:text-gray-900 transition-colors">Términos de Servicio</a>
            <a href="#" className="hover:text-gray-900 transition-colors">Aviso de Privacidad</a>
          </div>
        </div>
      </div>
    </footer>
  );
}

// --- Main Page Component ---
export default function LoginPage() {
  const router = useRouter();
  
  // Login State
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Modals State
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [isForgotOpen, setIsForgotOpen] = useState(false);
  const [isForceChangeOpen, setIsForceChangeOpen] = useState(false);
  const [tempEmailForChange, setTempEmailForChange] = useState('');

  // Register State
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regCompany, setRegCompany] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regLoading, setRegLoading] = useState(false);
  const [regError, setRegError] = useState('');
  const [regSuccess, setRegSuccess] = useState(false);

  // Forgot Password State
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState('');
  const [forgotSuccess, setForgotSuccess] = useState(false);

  // Force Change Password State
  const [changeTempPassword, setChangeTempPassword] = useState('');
  const [changeNewPassword, setChangeNewPassword] = useState('');
  const [changeLoading, setChangeLoading] = useState(false);
  const [changeError, setChangeError] = useState('');

  const openLogin = () => {
    setIsRegisterOpen(false);
    setIsLoginOpen(true);
  };

  const openRegister = () => {
    setIsLoginOpen(false);
    setIsRegisterOpen(true);
  };

  const openForgot = () => {
    setIsLoginOpen(false);
    setIsForgotOpen(true);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Autenticación fallida. Revisa tus credenciales.');
      }

      if (data.forcePasswordChange) {
        setTempEmailForChange(data.email);
        setIsLoginOpen(false);
        setIsForceChangeOpen(true);
        setLoading(false);
        return;
      }

      router.push('/');
      router.refresh();
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegLoading(true);
    setRegError('');
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName: regName, email: regEmail, phone: regPhone, companyName: regCompany, password: regPassword })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al registrar.');
      setRegSuccess(true);
      setTimeout(() => {
        setIsRegisterOpen(false);
        setEmail(regEmail);
        setPassword(regPassword);
        setIsLoginOpen(true);
        setRegSuccess(false);
      }, 2000);
    } catch (err: any) {
      setRegError(err.message);
    } finally {
      setRegLoading(false);
    }
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotLoading(true);
    setForgotError('');
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al restablecer.');
      setForgotSuccess(true);
    } catch (err: any) {
      setForgotError(err.message);
    } finally {
      setForgotLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setChangeLoading(true);
    setChangeError('');
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: tempEmailForChange, tempPassword: changeTempPassword, newPassword: changeNewPassword })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al cambiar contraseña.');
      
      setIsForceChangeOpen(false);
      router.push('/');
      router.refresh();
    } catch (err: any) {
      setChangeError(err.message);
    } finally {
      setChangeLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 font-sans selection:bg-purple-100 selection:text-purple-900">
      
      {/* Fixed Header */}
      <header className="fixed top-0 left-0 right-0 z-40 bg-white/90 backdrop-blur-md border-b border-gray-100 shadow-sm h-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full">
          <div className="flex justify-between items-center h-full">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-[1rem] bg-[#8b5cf6] shadow-sm flex items-center justify-center text-white font-bold text-2xl">C</div>
              <span className="text-3xl font-extrabold text-[#8b5cf6] tracking-tight">CAANMA</span>
            </div>
            <div className="flex items-center gap-4">
              <button 
                onClick={openLogin} 
                className="px-6 py-2.5 border-2 border-[#8b5cf6] bg-white rounded-full font-bold text-[#8b5cf6] hover:bg-[#8b5cf6] hover:text-white transition-colors flex items-center gap-2 text-sm md:text-base font-sans shadow-sm"
              >
                <LogIn size={18} />
                <span>Entrar</span>
              </button>
              <button 
                onClick={openRegister} 
                className="px-6 py-2.5 border-2 border-[#8b5cf6] bg-white rounded-full font-bold text-[#8b5cf6] hover:bg-[#8b5cf6] hover:text-white transition-all shadow-sm flex items-center gap-2 text-sm md:text-base font-sans"
              >
                <UserPlus size={18} />
                <span>Registrar</span>
              </button>
            </div>
          </div>
        </div>
      </header>
      
      {/* Hero Section */}
      <section className="pt-32 pb-16 lg:pt-40 lg:pb-24 relative overflow-hidden bg-white">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-purple-50 via-white to-white opacity-60"></div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-20">
            
            {/* Left: Value Proposition */}
            <div className="lg:w-1/2 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-50 border border-purple-100 rounded-full mb-8 shadow-sm">
                <div className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
                <span className="text-purple-700 font-bold text-sm tracking-wide uppercase">Plataforma Empresarial</span>
              </div>

              <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-gray-900 leading-[1.15] tracking-tight mb-6">
                Gestiona tu Negocio con el <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-purple-400">Sistema más Intuitivo</span> de México
              </h1>

              <p className="text-lg md:text-xl text-gray-600 mb-10 max-w-2xl mx-auto lg:mx-0 leading-relaxed">
                Control de ventas, inventario multi-sucursal, facturación CFDI 4.0 y biometría en un solo entorno seguro y escalable para tu empresa.
              </p>



              <div className="flex flex-col sm:flex-row items-center gap-6 justify-center lg:justify-start">
                <button onClick={openRegister} className="px-8 py-4 rounded-full font-bold bg-[var(--pulpos-primary)] text-white hover:bg-[var(--pulpos-primary-hover)] transition-colors shadow-xl shadow-purple-600/20 flex items-center gap-2 text-lg w-full sm:w-auto justify-center">
                  Comienza tu Prueba Gratis
                  <ChevronRight size={20} />
                </button>
                <div className="flex items-center gap-6 text-gray-500 font-medium text-sm">
                  <div className="flex items-center gap-1.5"><ShieldCheck className="text-gray-400 w-5 h-5" /> Seguro</div>
                  <div className="flex items-center gap-1.5"><Zap className="text-gray-400 w-5 h-5" /> Rápido</div>
                </div>
              </div>
            </div>

            {/* Right: Dashboard Preview Image */}
            <div className="lg:w-1/2 w-full mt-10 lg:mt-0">
              <div className="relative rounded-3xl bg-white p-2 shadow-2xl shadow-gray-200/50 border border-gray-100 overflow-hidden transform lg:rotate-[-2deg] transition-transform hover:rotate-0 duration-500">
                <div className="absolute top-4 left-4 flex gap-1.5 z-10">
                  <div className="w-3 h-3 rounded-full bg-red-400"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                  <div className="w-3 h-3 rounded-full bg-green-400"></div>
                </div>
                <div className="pt-8">
                   <img src="/img/ventas_module.png" alt="CAANMA Dashboard Preview" className="w-full rounded-2xl shadow-sm border border-gray-100" />
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Feature Sections */}
      <FeatureSection
        tag="Ventas"
        title="Vende tan fácil que lo vas a amar"
        imageSrc="/img/ventas_module.png"
        features={[
          { icon: <Receipt className="w-6 h-6 text-[var(--pulpos-primary)]" />, title: "Tickets y Notas Rápidas", description: "Procesa múltiples ventas con un solo clic. Imprímelos o compártelos por WhatsApp fácilmente." },
          { icon: <Coins className="w-6 h-6 text-[var(--pulpos-primary)]" />, title: "Ventas a Crédito", description: "Otorga líneas de crédito, lleva estados de cuenta de tus clientes y gestiona abonos sin perder el control." },
          { icon: <DollarSign className="w-6 h-6 text-[var(--pulpos-primary)]" />, title: "Cortes de Caja a Prueba de Errores", description: "Detecta diferencias, entradas y salidas de efectivo, y cuadra las finanzas de tu equipo al instante." },
        ]}
      />

      <FeatureSection
        tag="Inventario"
        title="Lleva tu inventario siempre bajo control"
        reverse
        imageSrc="/img/inventario_module.png"
        features={[
          { icon: <Warehouse className="w-6 h-6 text-[var(--pulpos-primary)]" />, title: "Almacenes y Multi-Sucursal", description: "Control en tiempo real exacto y escalable. Traspasa mercancía entre sucursales y aprueba los movimientos." },
          { icon: <Truck className="w-6 h-6 text-[var(--pulpos-primary)]" />, title: "Proveedores y Capital", description: "Lleva tus pedidos a proveedores siempre organizados y conoce al instante cuánto capital tienes amarrado en bodega." },
        ]}
      />

      <FeatureSection
        tag="Facturación"
        title="Facturación Electrónica en Automático"
        imageSrc="/img/facturacion_module.png"
        features={[
          { icon: <FileCheck className="w-6 h-6 text-[var(--pulpos-primary)]" />, title: "Comprobantes (1,000 folios incluidos por mes)", description: "Emisión de facturas CFDI 4.0 y complementos de pago al instante. Después $1 MXN por folio adicional." },
          { icon: <Users className="w-6 h-6 text-[var(--pulpos-primary)]" />, title: "Portal de Autofacturación", description: "Tus clientes pueden descargar y generar sus facturas ellos mismos utilizando su número de ticket o RFC." },
        ]}
      />

      <section className="py-24 bg-white border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-50 border border-purple-100 rounded-full mb-6 shadow-sm">
            <Tag size={16} className="text-[var(--pulpos-primary)]" />
            <span className="text-purple-700 font-bold text-sm tracking-wide uppercase">Precios</span>
          </div>
          <h2 className="text-3xl md:text-5xl font-extrabold text-gray-900 mb-6 tracking-tight">Precios Simples y Transparentes</h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-16">Un solo plan con todo incluido para que no te preocupes por módulos extra. Comienza sin tarjeta de crédito.</p>
          <div className="bg-white border border-gray-100 rounded-[2.5rem] p-8 md:p-14 max-w-xl mx-auto shadow-[0_20px_50px_-12px_rgba(0,0,0,0.1)] relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-purple-500 via-purple-600 to-indigo-600"></div>
            <div className="flex flex-col items-center justify-center mb-8">
              <span className="bg-green-100 text-green-800 text-sm font-bold px-4 py-1.5 rounded-full mb-6">Sin plazos forzosos</span>
              <div className="flex items-baseline gap-2">
                <span className="text-7xl font-black text-gray-900 tracking-tighter">$250</span>
                <span className="text-xl font-bold text-gray-500">USD / mes</span>
              </div>
              <p className="text-gray-500 mt-3 font-medium text-lg">por empresa (incluye 1 usuario)</p>
            </div>
            <div className="flex items-center justify-center gap-3 text-[var(--pulpos-primary)] mb-10 bg-purple-50/50 border border-purple-100 py-4 rounded-2xl">
              <Plus size={20} className="font-bold" />
              <span className="text-3xl font-black">$10</span>
              <span className="text-lg font-medium text-purple-800">USD / usuario adicional al mes</span>
            </div>
            <button onClick={openRegister} className="w-full py-4 rounded-2xl font-bold bg-gray-900 text-white hover:bg-gray-800 transition-all shadow-xl hover:-translate-y-1 flex justify-center items-center gap-2 text-xl">
              Comienza tu Prueba de 5 Días
            </button>
          </div>
        </div>
      </section>

      <Footer />

      {/* MODALS */}
      
      <Modal isOpen={isLoginOpen} onClose={() => setIsLoginOpen(false)} title="Ingresa a tu cuenta">
        <form onSubmit={handleLogin} className="space-y-5">
          <p className="text-[#64748b] text-[15px] mb-8 font-sans">
            ¿No tienes una cuenta? <button type="button" onClick={openRegister} className="font-semibold text-[#0ea5e9] hover:underline transition-all">Regístrate</button> y prueba 5 días gratis
          </p>
          {error && <div className="p-3 bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl flex gap-2 items-center"><AlertTriangle size={16}/> {error}</div>}
          
          <div>
            <label className="block text-[15px] font-semibold text-[#1e293b] mb-2 font-sans">Email</label>
            <input type="email" required value={email} onChange={e => setEmail(e.target.value)} className="block w-full rounded-xl border border-gray-200 bg-white py-3.5 px-4 text-gray-900 placeholder-gray-400 focus:border-[var(--pulpos-primary)] focus:ring-4 focus:ring-[var(--pulpos-primary)]/10 outline-none transition-all hover:border-gray-300 font-medium font-sans text-[15px]" placeholder="Ingresa tu email" />
          </div>
          <div>
            <label className="block text-[15px] font-semibold text-[#1e293b] mb-2 font-sans">Contraseña</label>
            <input type="password" required value={password} onChange={e => setPassword(e.target.value)} className="block w-full rounded-xl border border-gray-200 bg-white py-3.5 px-4 text-gray-900 placeholder-gray-400 focus:border-[var(--pulpos-primary)] focus:ring-4 focus:ring-[var(--pulpos-primary)]/10 outline-none transition-all hover:border-gray-300 font-medium font-sans text-[15px]" placeholder="Ingresa tu contraseña" />
          </div>
          
          <div className="flex items-center justify-between pt-2 pb-6">
             <label className="flex items-center gap-3 cursor-pointer group">
               <input type="checkbox" className="w-[18px] h-[18px] rounded border-gray-300 text-[var(--pulpos-primary)] focus:ring-[var(--pulpos-primary)] accent-[var(--pulpos-primary)] cursor-pointer" />
               <span className="text-[15px] text-[#475569] group-hover:text-gray-900 font-sans">Recordarme</span>
             </label>
             <button type="button" onClick={openForgot} className="text-[15px] font-medium text-[#0ea5e9] hover:underline transition-all font-sans">
               Has olvidado tu contraseña?
             </button>
          </div>

          <button type="submit" disabled={loading} className="w-full rounded-xl bg-[#c4b5fd] text-[#1e1b4b] hover:bg-[#a855f7] hover:text-white px-4 py-4 font-semibold transition-all flex justify-center items-center gap-2 text-[15px] font-sans">
            {loading ? 'Verificando...' : 'Ingresar'}
          </button>
        </form>
      </Modal>

      {/* 1. Register Modal */}
      <Modal isOpen={isRegisterOpen} onClose={() => setIsRegisterOpen(false)} title="Crea tu Cuenta">
        {regSuccess ? (
          <div className="text-center py-6">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h4 className="text-xl font-bold text-gray-900 mb-2">¡Cuenta Creada!</h4>
            <p className="text-gray-600">Tu prueba de 5 días ha comenzado. Por favor inicia sesión.</p>
          </div>
        ) : (
          <form onSubmit={handleRegister} className="space-y-4">
            <p className="text-gray-500 mb-4">Inicia tu prueba gratuita de 5 días. No pedimos tarjeta de crédito.</p>
            {regError && <div className="p-3 bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl">{regError}</div>}
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Nombre</label>
                <input type="text" required value={regName} onChange={e => setRegName(e.target.value)} className="block w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 px-4 text-gray-900 focus:bg-white focus:border-purple-500 outline-none transition-all" placeholder="Juan Pérez" />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Teléfono</label>
                <input type="tel" required value={regPhone} onChange={e => setRegPhone(e.target.value)} className="block w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 px-4 text-gray-900 focus:bg-white focus:border-purple-500 outline-none transition-all" placeholder="55 1234 5678" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Nombre de la Empresa</label>
              <input type="text" required value={regCompany} onChange={e => setRegCompany(e.target.value)} className="block w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 px-4 text-gray-900 focus:bg-white focus:border-purple-500 outline-none transition-all" placeholder="Mi Empresa S.A." />
            </div>
            
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Correo Electrónico Laboral</label>
              <input type="email" required value={regEmail} onChange={e => setRegEmail(e.target.value)} className="block w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 px-4 text-gray-900 focus:bg-white focus:border-purple-500 outline-none transition-all" placeholder="juan@miempresa.com" />
            </div>
            
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Crea una Contraseña</label>
              <input type="password" required value={regPassword} onChange={e => setRegPassword(e.target.value)} className="block w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 px-4 text-gray-900 focus:bg-white focus:border-purple-500 outline-none transition-all" placeholder="Mínimo 8 caracteres" />
            </div>

            <button type="submit" disabled={regLoading} className="w-full mt-6 rounded-xl bg-[var(--pulpos-primary)] px-4 py-3.5 font-bold text-white hover:bg-[var(--pulpos-primary-hover)] transition-all shadow-lg flex justify-center items-center">
              {regLoading ? 'Registrando...' : 'Comenzar Prueba Gratis'}
            </button>
            <div className="text-center mt-4">
               <button type="button" onClick={openLogin} className="text-sm font-bold text-gray-500 hover:text-gray-900">Ya tengo cuenta, iniciar sesión</button>
            </div>
          </form>
        )}
      </Modal>

      {/* 2. Forgot Password Modal */}
      <Modal isOpen={isForgotOpen} onClose={() => setIsForgotOpen(false)} title="Recuperar Contraseña">
        {forgotSuccess ? (
          <div className="text-center py-6">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h4 className="text-xl font-bold text-gray-900 mb-2">Correo Enviado</h4>
            <p className="text-gray-600">Si el correo existe, recibirás una contraseña temporal en breve.</p>
            <button onClick={openLogin} className="mt-6 px-6 py-2 bg-gray-100 text-gray-900 font-bold rounded-lg hover:bg-gray-200">Volver a inicio</button>
          </div>
        ) : (
          <form onSubmit={handleForgot} className="space-y-4">
            <p className="text-gray-600 mb-6">Ingresa tu correo empresarial y te enviaremos una contraseña temporal para recuperar el acceso a tu cuenta.</p>
            {forgotError && <div className="p-3 bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl">{forgotError}</div>}
            
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Correo Electrónico</label>
              <input type="email" required value={forgotEmail} onChange={e => setForgotEmail(e.target.value)} className="block w-full rounded-xl border border-gray-200 bg-gray-50 py-3 px-4 text-gray-900 focus:bg-white focus:border-purple-500 outline-none transition-all" placeholder="usuario@empresa.com" />
            </div>
            
            <button type="submit" disabled={forgotLoading} className="w-full mt-6 rounded-xl bg-gray-900 px-4 py-3.5 font-bold text-white hover:bg-gray-800 transition-all shadow-lg">
              {forgotLoading ? 'Enviando...' : 'Enviar Contraseña Temporal'}
            </button>
            <div className="text-center mt-4">
               <button type="button" onClick={openLogin} className="text-sm font-bold text-gray-500 hover:text-gray-900">Volver a inicio de sesión</button>
            </div>
          </form>
        )}
      </Modal>

      {/* 3. Force Change Password Modal */}
      <Modal isOpen={isForceChangeOpen} onClose={() => setIsForceChangeOpen(false)} title="Actualiza tu Contraseña">
        <form onSubmit={handleChangePassword} className="space-y-4">
          <div className="p-4 bg-yellow-50 border border-yellow-200 text-yellow-800 text-sm rounded-xl mb-6 flex gap-3 items-start">
            <AlertTriangle className="flex-shrink-0 w-5 h-5 text-yellow-600" />
            <p className="font-medium">Por seguridad de tu empresa, debes cambiar tu contraseña temporal por una nueva antes de acceder al sistema.</p>
          </div>
          {changeError && <div className="p-3 bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl">{changeError}</div>}
          
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Contraseña Temporal</label>
            <input type="password" required value={changeTempPassword} onChange={e => setChangeTempPassword(e.target.value)} className="block w-full rounded-xl border border-gray-200 bg-gray-50 py-3 px-4 text-gray-900 focus:bg-white focus:border-purple-500 outline-none transition-all" placeholder="Ingresa la contraseña que recibiste por correo" />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Tu Nueva Contraseña</label>
            <input type="password" required value={changeNewPassword} onChange={e => setChangeNewPassword(e.target.value)} className="block w-full rounded-xl border border-gray-200 bg-gray-50 py-3 px-4 text-gray-900 focus:bg-white focus:border-purple-500 outline-none transition-all" placeholder="Mínimo 8 caracteres" />
          </div>
          
          <button type="submit" disabled={changeLoading} className="w-full mt-6 rounded-xl bg-[var(--pulpos-primary)] px-4 py-3.5 font-bold text-white hover:bg-[var(--pulpos-primary-hover)] transition-all shadow-lg flex justify-center items-center">
            {changeLoading ? 'Actualizando...' : 'Actualizar y Entrar al Dashboard'}
          </button>
        </form>
      </Modal>
    </main>
  );
}
