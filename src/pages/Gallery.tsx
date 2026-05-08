import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Play, Heart, Eye, Clock, BookOpen } from 'lucide-react';
import { Comic, Panel } from '../types/Comic';
import { getComics } from '../utils/storage';

// Mini-preview del primer panel de cada cómic usando CSS (sin canvas)
const PanelThumbnail: React.FC<{ panel: Panel }> = ({ panel }) => {
  const pw = panel.panelWidth || 800;
  const ph = panel.panelHeight || 600;

  return (
    <div
      className="w-full h-full"
      style={{
        position: 'relative',
        backgroundColor: panel.backgroundColor ?? '#ffffff',
        backgroundImage: panel.backgroundImage
          ? `url(${panel.backgroundImage})`
          : panel.imageUrl
          ? `url(${panel.imageUrl})`
          : undefined,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        overflow: 'hidden',
      }}
    >
      {/* Renderiza los primeros 5 elementos de texto/imagen */}
      {(panel.elements ?? [])
        .slice(0, 5)
        .filter(el => el.visible !== false)
        .map(el => {
          if (el.type === 'text') {
            return (
              <div
                key={el.id}
                style={{
                  position: 'absolute',
                  left: `${(el.x / pw) * 100}%`,
                  top: `${(el.y / ph) * 100}%`,
                  fontSize: Math.max(6, (el.fontSize ?? 16) * 0.3),
                  color: el.color ?? '#000',
                  fontWeight: el.fontWeight ?? 'normal',
                  fontFamily: (el as any).fontFamily ?? 'Arial',
                  whiteSpace: 'nowrap',
                  pointerEvents: 'none',
                }}
              >
                {el.content}
              </div>
            );
          }
          if ((el.type === 'image' || el.type === 'gif') && (el.imageUrl || el.gifUrl)) {
            return (
              <img
                key={el.id}
                src={el.imageUrl ?? el.gifUrl}
                alt=""
                style={{
                  position: 'absolute',
                  left: `${(el.x / pw) * 100}%`,
                  top: `${(el.y / ph) * 100}%`,
                  width: `${((el.width ?? 100) / pw) * 100}%`,
                  height: `${((el.height ?? 100) / ph) * 100}%`,
                  objectFit: 'contain',
                  pointerEvents: 'none',
                }}
              />
            );
          }
          return null;
        })}
    </div>
  );
};

const Gallery: React.FC = () => {
  const [comics, setComics] = useState<Comic[]>([]);
  const [filter, setFilter] = useState<'all' | 'popular' | 'recent'>('all');

  useEffect(() => {
    setComics(getComics());
  }, []);

  // Ordenar según filtro
  const filteredComics = [...comics].sort((a, b) => {
    if (filter === 'recent') {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
    return 0;
  });

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-800 mb-4">
            Galería de{' '}
            <span className="bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
              Historietas
            </span>
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Descubre increíbles historietas animadas creadas por nuestra comunidad
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap justify-center gap-4 mb-12">
          {[
            { key: 'all',     label: 'Todas',     icon: BookOpen },
            { key: 'popular', label: 'Populares',  icon: Heart },
            { key: 'recent',  label: 'Recientes',  icon: Clock },
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setFilter(key as any)}
              className={`flex items-center space-x-2 px-6 py-3 rounded-xl font-medium transition-all duration-300 ${
                filter === key
                  ? 'bg-purple-600 text-white shadow-lg'
                  : 'bg-white text-gray-600 hover:bg-purple-50 hover:text-purple-600'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{label}</span>
            </button>
          ))}
        </div>

        {/* Grid */}
        {filteredComics.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-24 h-24 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <BookOpen className="w-12 h-12 text-white" />
            </div>
            <h3 className="text-2xl font-bold text-gray-800 mb-4">¡Sé el Primero!</h3>
            <p className="text-gray-600 mb-8 max-w-md mx-auto">
              Aún no hay historietas publicadas. ¿Por qué no creas la primera?
            </p>
            <Link
              to="/upload"
              className="px-6 py-3 bg-purple-600 text-white rounded-xl font-semibold hover:bg-purple-700 transition-colors"
            >
              Crear Historieta
            </Link>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {filteredComics.map(comic => (
              <div
                key={comic.id}
                className="group bg-white/70 backdrop-blur-sm rounded-2xl overflow-hidden border border-purple-100 hover:border-purple-300 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2"
              >
                {/* Thumbnail — muestra el primer panel real */}
                <div className="relative w-full h-48 bg-gray-100 overflow-hidden">
                  {comic.panels?.[0] ? (
                    <PanelThumbnail panel={comic.panels[0]} />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <BookOpen className="w-12 h-12 text-purple-400" />
                    </div>
                  )}

                  {/* Overlay con botón Play */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all duration-300 flex items-center justify-center">
                    <Link
                      to={`/comic/${comic.id}`}
                      className="opacity-0 group-hover:opacity-100 bg-white text-purple-600 p-3 rounded-full hover:bg-purple-50 transition-all duration-300 transform scale-75 group-hover:scale-100"
                    >
                      <Play className="w-6 h-6" />
                    </Link>
                  </div>
                </div>

                <div className="p-5">
                  <h3 className="text-lg font-bold text-gray-800 mb-1 truncate">
                    {comic.title}
                  </h3>
                  <p className="text-gray-500 text-sm mb-4 line-clamp-2">
                    {comic.description || 'Una increíble historieta animada'}
                  </p>

                  <div className="flex items-center justify-between text-sm text-gray-400">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1">
                        <Eye className="w-4 h-4" /> 0
                      </span>
                      <span className="flex items-center gap-1">
                        <Heart className="w-4 h-4" /> 0
                      </span>
                    </div>
                    <span>{comic.panels?.length ?? 0} paneles</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Gallery;
