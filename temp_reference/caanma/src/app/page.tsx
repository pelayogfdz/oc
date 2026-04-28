"use client";

import { useState } from "react";
import {
  Menu,
  X,
  ChevronDown,
  Plus,
  Building2,
  Image,
  Tag,
  Package,
  Layers,
  ShoppingCart,
  ArrowLeftRight,
  Clock,
  FileText,
  Warehouse,
  Truck,
  DollarSign,
  TrendingUp,
  Users,
  BarChart3,
  RefreshCw,
  MessageCircle,
  CreditCard,
  FileCheck,
  Receipt,
  Globe,
  Coins,
  Instagram,
  Facebook,
  Linkedin,
  Mail,
  Phone,
  ChevronRight,
  Star,
} from "lucide-react";

// Header Component
function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 bg-white/95 backdrop-blur-sm z-50 border-b border-purple-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-primary to-primary-light rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">C</span>
            </div>
            <span className="font-bold text-xl text-dark">CAANMA</span>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            <button className="flex items-center gap-1 text-gray-600 hover:text-primary transition-colors">
              Funcionalidades
              <ChevronDown className="w-4 h-4" />
            </button>
            <a href="#precios" className="text-gray-600 hover:text-primary transition-colors">
              Precios
            </a>
            <a href="#" className="text-gray-600 hover:text-primary transition-colors">
              Ingresar
            </a>
          </nav>

          {/* Mobile menu button */}
          <button
            className="md:hidden p-2"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-purple-100">
            <nav className="flex flex-col gap-4">
              <a href="#" className="text-gray-600 hover:text-primary transition-colors">
                Funcionalidades
              </a>
              <a href="#precios" className="text-gray-600 hover:text-primary transition-colors">
                Precios
              </a>
              <a href="#" className="text-gray-600 hover:text-primary transition-colors">
                Ingresar
              </a>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}

// Hero Section
function HeroSection() {
  return (
    <section className="pt-24 pb-16 lg:pt-32 lg:pb-24 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-primary-lighter/30 to-transparent pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div className="text-center max-w-4xl mx-auto">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary-lighter rounded-full mb-6">
            <div className="flex -space-x-2">
              <div className="w-6 h-6 rounded-full bg-primary-300 border-2 border-white" />
              <div className="w-6 h-6 rounded-full bg-primary-400 border-2 border-white" />
              <div className="w-6 h-6 rounded-full bg-primary-500 border-2 border-white" />
            </div>
            <span className="text-primary font-medium text-sm">+1,000 Negocios en Mexico</span>
          </div>

          {/* Title */}
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-dark leading-tight mb-6">
            Gestiona tu Negocio con el{" "}
            <span className="gradient-text">Sistema mas Intuitivo</span> de Mexico
          </h1>

          {/* Subtitle */}
          <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
            Ventas, inventario y facturacion en un solo sistema en la nube
          </p>

          {/* Price tag */}
          <div className="flex items-center justify-center gap-4 mb-8">
            <div className="flex items-center">
              <svg className="w-12 h-12 text-primary-light" viewBox="0 0 24 24" fill="none">
                <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M8 12L11 15L16 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div className="text-left">
              <p className="text-primary font-medium italic">Planes desde</p>
              <p className="text-2xl font-bold text-amber-600">$1,900 mxn/mes</p>
            </div>
          </div>

          {/* Trust badge */}
          <div className="flex items-center justify-center gap-2 mb-12">
            <div className="flex gap-1">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-5 h-5 fill-amber-400 text-amber-400" />
              ))}
            </div>
            <span className="text-gray-600 font-medium">4,7</span>
            <span className="text-gray-400"></span>
            <span className="font-bold text-gray-700"></span>
          </div>

          {/* Dashboard mockup */}
          <div className="relative max-w-5xl mx-auto">
            <div className="bg-white rounded-2xl shadow-2xl shadow-primary/10 p-6 border border-purple-100">
              <div className="flex gap-4">
                {/* Sidebar mockup */}
                <div className="hidden lg:block w-48 bg-dark rounded-xl p-4 text-white">
                  <div className="flex items-center gap-2 mb-6">
                    <div className="w-6 h-6 bg-primary rounded flex items-center justify-center">
                      <span className="text-xs font-bold">C</span>
                    </div>
                    <span className="font-bold text-sm">CAANMA</span>
                  </div>
                  <button className="w-full bg-primary text-white py-2 px-3 rounded-lg text-sm mb-4 flex items-center gap-2">
                    <Plus className="w-4 h-4" />
                    Nueva Venta
                  </button>
                  <div className="space-y-2 text-sm text-gray-300">
                    <div className="flex items-center gap-2 p-2 rounded hover:bg-white/10">
                      <Building2 className="w-4 h-4" /> Inicio
                    </div>
                    <div className="flex items-center gap-2 p-2 rounded hover:bg-white/10">
                      <Package className="w-4 h-4" /> Productos
                    </div>
                    <div className="flex items-center gap-2 p-2 rounded hover:bg-white/10">
                      <ShoppingCart className="w-4 h-4" /> Compras
                    </div>
                    <div className="flex items-center gap-2 p-2 rounded hover:bg-white/10">
                      <Receipt className="w-4 h-4" /> Ventas
                    </div>
                    <div className="flex items-center gap-2 p-2 rounded hover:bg-white/10">
                      <FileText className="w-4 h-4" /> Facturas
                    </div>
                  </div>
                </div>

                {/* Main content mockup */}
                <div className="flex-1">
                  <div className="mb-4">
                    <h3 className="text-xl font-bold text-dark">Hola Juan!</h3>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    {["Nueva Venta", "Nueva Compra", "Crear Producto", "Facturar Venta"].map((item) => (
                      <div key={item} className="bg-gray-50 rounded-xl p-4 text-center border border-gray-100 hover:border-primary/30 transition-colors">
                        <div className="w-10 h-10 mx-auto mb-2 bg-primary-lighter rounded-lg flex items-center justify-center">
                          <Package className="w-5 h-5 text-primary" />
                        </div>
                        <p className="text-xs text-gray-600">{item}</p>
                      </div>
                    ))}
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="bg-white rounded-xl p-4 border border-gray-100">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-gray-500 text-sm">Ventas</span>
                        <span className="text-primary text-xs">Ver reporte</span>
                      </div>
                      <p className="text-2xl font-bold text-dark">1,623</p>
                      <div className="mt-4 h-24 flex items-end gap-1">
                        {[40, 60, 45, 80, 65, 90, 75].map((h, i) => (
                          <div
                            key={i}
                            className="flex-1 bg-gradient-to-t from-primary to-primary-light rounded-t"
                            style={{ height: `${h}%` }}
                          />
                        ))}
                      </div>
                    </div>
                    <div className="bg-white rounded-xl p-4 border border-gray-100">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-gray-500 text-sm">Facturacion</span>
                        <span className="text-primary text-xs">Ver reporte</span>
                      </div>
                      <p className="text-2xl font-bold text-dark">$91,861</p>
                      <div className="mt-4 h-24 flex items-end gap-1">
                        {[50, 70, 55, 85, 70, 95, 80].map((h, i) => (
                          <div
                            key={i}
                            className="flex-1 bg-gradient-to-t from-primary-light to-primary-300 rounded-t"
                            style={{ height: `${h}%` }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// Logos Section
function LogosSection() {
  const logos = ["El Diario MX", "Business Insider", "REFORMA", "Petqro"];

  return (
    <section className="py-12 border-y border-purple-100 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-wrap justify-center items-center gap-12">
          {logos.map((logo) => (
            <div key={logo} className="text-gray-400 font-bold text-lg">
              {logo}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// Platform Features Section
function PlatformSection() {
  const features = [
    "Ventas",
    "Inventario",
    "Facturacion",
    "Tienda en Linea",
    "Proveedores",
    "Finanzas",
    "Fabricacion",
  ];

  const [activeFeature, setActiveFeature] = useState("Inventario");

  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row items-center gap-12">
          <div className="lg:w-1/2">
            <h2 className="text-3xl md:text-4xl font-bold text-dark mb-8">
              Una plataforma, infinitas posibilidades
            </h2>
          </div>
          <div className="lg:w-1/2">
            <div className="flex flex-wrap gap-3">
              {features.map((feature) => (
                <button
                  key={feature}
                  onClick={() => setActiveFeature(feature)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    activeFeature === feature
                      ? "bg-primary text-white"
                      : "text-gray-400 hover:text-primary"
                  }`}
                >
                  {feature}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// Feature Cards Section
function FeatureSection({
  tag,
  title,
  features,
  reverse = false,
}: {
  tag: string;
  title: string;
  features: { icon: React.ReactNode; title: string; description: string }[];
  reverse?: boolean;
}) {
  return (
    <section className="py-16 bg-gradient-to-b from-white to-primary-50/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className={`flex flex-col ${reverse ? "lg:flex-row-reverse" : "lg:flex-row"} items-center gap-12`}>
          {/* Content */}
          <div className="lg:w-1/2">
            <span className="inline-block px-3 py-1 bg-primary-lighter text-primary text-sm font-medium rounded-full mb-4">
              {tag}
            </span>
            <h3 className="text-3xl md:text-4xl font-bold text-dark mb-8">{title}</h3>
            <div className="space-y-6">
              {features.map((feature, index) => (
                <div key={index} className="flex gap-4">
                  <div className="w-10 h-10 bg-primary-lighter rounded-lg flex items-center justify-center flex-shrink-0">
                    {feature.icon}
                  </div>
                  <div>
                    <h4 className="font-semibold text-dark mb-1">{feature.title}</h4>
                    <p className="text-gray-500 text-sm">{feature.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Image placeholder */}
          <div className="lg:w-1/2">
            <div className="bg-white rounded-2xl shadow-xl shadow-primary/5 p-8 border border-purple-100">
              <div className="aspect-video bg-gradient-to-br from-primary-50 to-primary-100 rounded-xl flex items-center justify-center">
                <div className="text-primary-300 text-6xl font-bold">CAANMA</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// All-in-One Section
function AllInOneSection() {
  const [activeTab, setActiveTab] = useState("Inventario");

  const tabs = ["Inventario", "Ventas", "Facturacion", "Tienda en Linea", "Compras", "Finanzas", "Empleados"];

  const gridItems = [
    { icon: <Building2 className="w-6 h-6" />, label: "Almacenes y Sucursales" },
    { icon: <Image className="w-6 h-6" />, label: "Fotos" },
    { icon: <Tag className="w-6 h-6" />, label: "Etiquetas" },
    { icon: <Package className="w-6 h-6" />, label: "Kits" },
    { icon: <Layers className="w-6 h-6" />, label: "Variantes" },
    { icon: <ShoppingCart className="w-6 h-6" />, label: "Apartados" },
    { icon: <ArrowLeftRight className="w-6 h-6" />, label: "Traspasos" },
    { icon: <Clock className="w-6 h-6" />, label: "Lotes y Caducidades" },
    { icon: <FileText className="w-6 h-6" />, label: "Recetas Medicas" },
  ];

  return (
    <section className="py-20 bg-dark text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
          Todo lo que necesitas en un solo sistema
        </h2>

        {/* Tabs */}
        <div className="flex flex-wrap justify-center gap-4 mb-12">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-medium transition-all ${
                activeTab === tab
                  ? "text-white border-b-2 border-primary"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-w-3xl mx-auto">
          {gridItems.map((item, index) => (
            <div
              key={index}
              className="bg-gray-800/50 backdrop-blur rounded-xl p-6 text-center hover:bg-gray-700/50 transition-colors border border-gray-700"
            >
              <div className="w-12 h-12 mx-auto mb-3 bg-gray-700 rounded-xl flex items-center justify-center text-primary-light">
                {item.icon}
              </div>
              <p className="text-sm text-gray-300">{item.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// Testimonials Section
function TestimonialsSection() {
  const testimonials = [
    {
      text: "Estoy realmente impresionado con su sistema. La interfaz, la experiencia de usuario y la logica operativa estan a otro nivel",
      author: "Luis Felipe Vilasñor",
      source: "Reseña de App Store",
    },
    {
      text: "El contacto con los asesores es calido, como si fuese presencial o nos conocieramos de hace tiempo.",
      author: "Zavaleta Huert",
      source: "Reseña de Trustpilot",
    },
    {
      text: "Administro de manera simultanea 7 locales, con un almacen que abastece a todos, me funciona perfecto, en todo.",
      author: "GDS Contabilidad",
      source: "Reseña de Play Store",
    },
  ];

  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl md:text-4xl font-bold text-center text-dark mb-4">
          Mas de 10,000 negocios eligen CAANMA
        </h2>

        {/* Ratings */}
        <div className="flex flex-wrap justify-center gap-8 mb-16 mt-12">
          {[
            { rating: "4.9", reviews: "+100", source: "App Store" },
            { rating: "4.7", reviews: "+250", source: "Google Play" },
            { rating: "4.7", reviews: "+25", source: "Trustpilot" },
          ].map((item, index) => (
            <div key={index} className="text-center">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl font-bold text-dark">{item.rating}</span>
                <div className="flex gap-0.5">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>
              </div>
              <p className="text-sm text-gray-500">
                {item.reviews} reseñas en <span className="text-primary font-medium">{item.source}</span>
              </p>
            </div>
          ))}
        </div>

        {/* Testimonial cards */}
        <div className="grid md:grid-cols-3 gap-6">
          {testimonials.map((testimonial, index) => (
            <div
              key={index}
              className="bg-white rounded-2xl p-6 border border-purple-100 shadow-sm hover:shadow-lg hover:shadow-primary/5 transition-all"
            >
              <div className="flex gap-1 mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                ))}
              </div>
              <p className="text-gray-600 mb-6">{testimonial.text}</p>
              <div>
                <p className="font-semibold text-dark">{testimonial.author}</p>
                <p className="text-sm text-primary">{testimonial.source}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// CTA Section
function CTASection() {
  return (
    <section className="py-20 bg-gradient-to-br from-primary-50 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row items-center gap-12">
          <div className="lg:w-1/2">
            <h2 className="text-3xl md:text-4xl font-bold text-dark mb-6">
              Comienza hoy a impulsar tu negocio
            </h2>
            <p className="text-gray-600 mb-8">
              Sumate a miles de negocios que usan CAANMA para controlar sus ventas, inventario y facturacion
            </p>
            <div className="flex flex-wrap gap-4">
              <a
                href="#contacto"
                className="inline-flex items-center px-6 py-3 border-2 border-primary text-primary rounded-full font-medium hover:bg-primary hover:text-white transition-colors"
              >
                Contactarse
              </a>
            </div>
            <div className="flex gap-4 mt-8">
              <div className="bg-black text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2">
                <span>App Store</span>
              </div>
              <div className="bg-black text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2">
                <span></span>
              </div>
            </div>
          </div>
          <div className="lg:w-1/2">
            <div className="bg-white rounded-2xl shadow-2xl shadow-primary/10 p-6 border border-purple-100">
              <div className="aspect-video bg-gradient-to-br from-primary-100 to-primary-50 rounded-xl flex items-center justify-center">
                <div className="text-primary text-4xl font-bold">CAANMA</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// FAQ Section
function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const faqs = [
    "¿En que dispositivos puedo usar CAANMA?",
    "¿Puedo usar CAANMA en varias computadoras a la vez?",
    "¿Que impresoras, basculas o cajones de dinero puedo usar?",
    "¿Necesito internet para usar CAANMA?",
  ];

  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row gap-12">
          <div className="lg:w-1/2">
            <h2 className="text-3xl md:text-4xl font-bold text-dark mb-8">
              Preguntas Frecuentes sobre CAANMA
            </h2>
            <div className="aspect-video bg-gradient-to-br from-gray-100 to-gray-50 rounded-2xl overflow-hidden">
              <img
                src="https://ext.same-assets.com/755788549/35579510.jpeg"
                alt="Office"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
          <div className="lg:w-1/2">
            <div className="space-y-4">
              {faqs.map((faq, index) => (
                <div
                  key={index}
                  className="border border-purple-100 rounded-xl overflow-hidden"
                >
                  <button
                    onClick={() => setOpenIndex(openIndex === index ? null : index)}
                    className="w-full flex items-center justify-between p-4 text-left hover:bg-primary-50/50 transition-colors"
                  >
                    <span className="font-medium text-dark">{faq}</span>
                    <Plus
                      className={`w-5 h-5 text-gray-400 transition-transform ${
                        openIndex === index ? "rotate-45" : ""
                      }`}
                    />
                  </button>
                  {openIndex === index && (
                    <div className="p-4 pt-0 text-gray-600">
                      <p>
                        Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod
                        tempor incididunt ut labore et dolore magna aliqua.
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// Footer
function Footer() {
  return (
    <footer className="bg-white border-t border-purple-100 py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
          {/* Logo and Contact */}
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-8 h-8 bg-gradient-to-br from-primary to-primary-light rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">C</span>
              </div>
              <span className="font-bold text-xl text-dark">CAANMA</span>
            </div>
            <p className="font-semibold text-dark mb-4">Contactanos</p>
            <div className="space-y-2 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-primary" />
                +52 1 56 1755 1905
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-primary" />
                hola@caanma.com
              </div>
            </div>
          </div>

          {/* Links columns */}
          <div>
            <h4 className="font-semibold text-dark mb-4">CAANMA</h4>
            <ul className="space-y-2 text-sm text-gray-600">
              <li><a href="#" className="hover:text-primary transition-colors">Precios</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Giros</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Distribuidores</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">CAANMA vs. Alternativas</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-dark mb-4">Funcionalidades</h4>
            <ul className="space-y-2 text-sm text-gray-600">
              <li><a href="#" className="hover:text-primary transition-colors">Ventas</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Inventario</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Facturacion</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Tienda en Linea</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Fabricacion</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Recargas y Servicios</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-dark mb-4">Recursos</h4>
            <ul className="space-y-2 text-sm text-gray-600">
              <li><a href="#" className="hover:text-primary transition-colors">Centro de Ayuda</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Blog</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Terminos</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Privacidad</a></li>
            </ul>
            <a href="#" className="inline-flex items-center gap-1 text-primary font-medium text-sm mt-4 hover:gap-2 transition-all">
              Descubre mas <ChevronRight className="w-4 h-4" />
            </a>
          </div>
        </div>

        {/* Bottom */}
        <div className="flex flex-col md:flex-row items-center justify-between pt-8 border-t border-purple-100">
          <p className="text-sm text-gray-500">© 2026 CAANMA · Todos los derechos reservados</p>
          <div className="flex items-center gap-4 mt-4 md:mt-0">
            <a href="#" className="text-gray-400 hover:text-primary transition-colors">
              <Instagram className="w-5 h-5" />
            </a>
            <a href="#" className="text-gray-400 hover:text-primary transition-colors">
              <Facebook className="w-5 h-5" />
            </a>
            <a href="#" className="text-gray-400 hover:text-primary transition-colors">
              <Linkedin className="w-5 h-5" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

// Main Page Component
export default function HomePage() {
  return (
    <main className="min-h-screen">
      <Header />
      <HeroSection />
      <LogosSection />
      <PlatformSection />

      <FeatureSection
        tag="Ventas"
        title="Vende tan facil que lo vas a amar"
        features={[
          { icon: <Receipt className="w-5 h-5 text-primary" />, title: "Tickets", description: "Imprimelos o compartelos por WhatsApp" },
          { icon: <RefreshCw className="w-5 h-5 text-primary" />, title: "Recargas y Servicios", description: "Gana dinero extra vendiendo recargas y servicios" },
          { icon: <Coins className="w-5 h-5 text-primary" />, title: "Ventas a Credito", description: "Ofrece credito sin perder el control" },
          { icon: <DollarSign className="w-5 h-5 text-primary" />, title: "Cortes de Caja", description: "Detecta robos o errores rapido" },
        ]}
      />

      <FeatureSection
        tag="Inventario"
        title="Lleva tu inventario siempre bajo control"
        reverse
        features={[
          { icon: <Warehouse className="w-5 h-5 text-primary" />, title: "Almacenes y Sucursales", description: "Controla con precision lo que debes, lo que te deben y los vencimientos" },
          { icon: <Truck className="w-5 h-5 text-primary" />, title: "Compras a Proveedores", description: "Lleva tus pedidos a proveedores siempre organizados" },
          { icon: <DollarSign className="w-5 h-5 text-primary" />, title: "Listas de Precios", description: "Controla tus ganancias reales y proyecta tu crecimiento." },
        ]}
      />

      <FeatureSection
        tag="Facturacion"
        title="Factura tus ventas de forma intuitiva"
        features={[
          { icon: <FileCheck className="w-5 h-5 text-primary" />, title: "Facturas Ilimitadas", description: "Olvidate de comprar timbres caros" },
          { icon: <CreditCard className="w-5 h-5 text-primary" />, title: "Complementos de Pago", description: "Emite Facturas PPD y sus complementos" },
          { icon: <Globe className="w-5 h-5 text-primary" />, title: "Facturas Globales", description: "Agrupa multiples ventas en una sola factura" },
          { icon: <Users className="w-5 h-5 text-primary" />, title: "Autofacturas", description: "Permite a tus clientes facturarse solos en segundos" },
        ]}
      />

      <FeatureSection
        tag="Control Financiero"
        title="Controla las finanzas de tu negocio"
        reverse
        features={[
          { icon: <TrendingUp className="w-5 h-5 text-primary" />, title: "Cuentas por Cobrar y por Pagar", description: "Controla con precision lo que debes, lo que te deben y los vencimientos" },
          { icon: <Users className="w-5 h-5 text-primary" />, title: "Portal de Clientes", description: "Ofrece un portal para que tus clientes vean sus deudas y paguen al instante." },
          { icon: <BarChart3 className="w-5 h-5 text-primary" />, title: "Reportes de Ganancia", description: "Controla tus ganancias reales y proyecta tu crecimiento." },
        ]}
      />

      <FeatureSection
        tag="Tienda en Linea"
        title="Crea tu tienda en linea en segundos"
        features={[
          { icon: <RefreshCw className="w-5 h-5 text-primary" />, title: "Stock Sincronizado", description: "Utiliza un mismo inventario para tu tienda fisica y tus ventas en linea" },
          { icon: <MessageCircle className="w-5 h-5 text-primary" />, title: "Pedidos por WhatsApp", description: "Recibe pedidos de tu tienda directamente por WhatsApp" },
          { icon: <CreditCard className="w-5 h-5 text-primary" />, title: "Cobros con Mercado Pago", description: "Permite a tus clientes pagar con tarjeta desde tu tienda en linea" },
        ]}
      />

      <AllInOneSection />
      <TestimonialsSection />
      <CTASection />
      <FAQSection />
      <Footer />
    </main>
  );
}
