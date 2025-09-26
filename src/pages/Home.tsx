import React from 'react';
import { Link } from 'react-router-dom';
import { Zap, Users, BookOpen, Sparkles, ArrowRight } from 'lucide-react';

const Home: React.FC = () => {
  const features = [
    {
      icon: Zap,
      title: 'Animaciones Dinámicas',
      description: 'Crea efectos de texto animados y transiciones suaves entre paneles'
    },
    {
      icon: Users,
      title: 'Comunidad Creativa',
      description: 'Comparte tus historietas y descubre creaciones de otros artistas'
    },
    {
      icon: BookOpen,
      title: 'Editor Intuitivo',
      description: 'Herramientas profesionales de edición al alcance de todos'
    },
    {
      icon: Sparkles,
      title: 'Efectos de Audio',
      description: 'Añade música de fondo y efectos sonoros a tus creaciones'
    }
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 px-4">
        <div className="absolute inset-0 bg-gradient-to-r from-purple-600/10 via-blue-600/10 to-indigo-600/10"></div>
        <div className="relative max-w-7xl mx-auto text-center">
          <div className="mb-8">
            <h1 className="text-5xl md:text-7xl font-bold mb-6">
              <span className="bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-600 bg-clip-text text-transparent">
                Crea Historietas
              </span>
              <br />
              <span className="text-gray-800">Animadas Increíbles</span>
            </h1>
            <p className="text-xl md:text-2xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
              La plataforma definitiva para dar vida a tus historias con animaciones, 
              música y efectos que cautivarán a tu audiencia
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link
              to="/gallery"
              className="bg-white text-purple-600 px-8 py-4 rounded-xl font-semibold text-lg border-2 border-purple-200 hover:border-purple-300 hover:bg-purple-50 transition-all duration-300"
            >
              Explorar Galería
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-800 mb-4">
              Herramientas Profesionales
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Todo lo que necesitas para crear historietas animadas de nivel profesional
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <div
                key={index}
                className="group bg-white/70 backdrop-blur-sm p-8 rounded-2xl border border-purple-100 hover:border-purple-200 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2"
              >
                <div className="w-12 h-12 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <feature.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-800 mb-3">{feature.title}</h3>
                <p className="text-gray-600 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-3xl p-12 text-white">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              ¿Listo para Crear tu Primera Historieta?
            </h2>
            <p className="text-xl mb-8 opacity-90">
              Únete a miles de creadores que ya están dando vida a sus historias
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;