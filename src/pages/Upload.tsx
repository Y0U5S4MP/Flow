import React, { useState } from 'react';
import { Wand2, Music, ArrowRightLeft, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Comic, Panel, ComicElement, Transition } from '../types/Comic';
import { saveComic } from '../utils/storage';
import { v4 as uuidv4 } from 'uuid';
import MultiPanelUpload from '../components/MultiPanelUpload';
import DraggablePanelPreview from '../components/DraggablePanelPreview';
import AdvancedPanelEditor from '../components/AdvancedPanelEditor';
import ComicPreview from '../components/ComicPreview';

const Upload: React.FC = () => {
  const { user } = useAuth();
  const [comic, setComic] = useState<Partial<Comic>>({
    title: '',
    description: '',
    panels: []
  });
  const [isUploading, setIsUploading] = useState(false);
  const [showAdvancedEditor, setShowAdvancedEditor] = useState(false);
  const [editingPanel, setEditingPanel] = useState<{ panel: Panel; index: number } | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  if (!user || user.role !== 'creator') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <X className="w-12 h-12 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Acceso Restringido</h2>
          <p className="text-gray-600">Solo los creadores pueden subir historietas.</p>
        </div>
      </div>
    );
  }


  const handleMultiplePanelsUpload = (newPanels: Panel[]) => {
    setComic(prev => ({
      ...prev,
      panels: [...(prev.panels || []), ...newPanels]
    }));
  };

  const handlePanelsReorder = (reorderedPanels: Panel[]) => {
    setComic(prev => ({
      ...prev,
      panels: reorderedPanels
    }));
  };

  const handlePanelEdit = (panel: Panel, index: number) => {
    setEditingPanel({ panel, index });
    setShowAdvancedEditor(true);
  };

  const handlePanelUpdate = (updatedPanel: Panel) => {
    if (!editingPanel) return;
    
    const updatedPanels = [...(comic.panels || [])];
    updatedPanels[editingPanel.index] = updatedPanel;
    
    setComic(prev => ({
      ...prev,
      panels: updatedPanels
    }));
  };

  const handlePanelDelete = (index: number) => {
    const updatedPanels = (comic.panels || []).filter((_, i) => i !== index);
    setComic(prev => ({
      ...prev,
      panels: updatedPanels
    }));
  };


  const publishComic = async () => {
    if (!comic.title || !comic.panels || comic.panels.length === 0) return;

    setIsUploading(true);
    
    try {
      const newComic: Comic = {
        id: uuidv4(),
        title: comic.title,
        description: comic.description,
        panels: comic.panels,
        createdAt: new Date().toISOString()
      };

      saveComic(newComic);
      
      // Reset form
      setComic({ title: '', description: '', panels: [] });
      setCurrentPanel({ id: uuidv4(), elements: [] });
      
      alert('¡Historieta publicada exitosamente!');
    } catch (error) {
      alert('Error al publicar la historieta');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-4">
            Subir <span className="bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">Historieta</span>
          </h1>
          <p className="text-xl text-gray-600">Crea y publica tu historieta animada</p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Left Panel - Comic Info */}
          <div className="space-y-6">
            <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-purple-100">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">Información de la Historieta</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Título *
                  </label>
                  <input
                    type="text"
                    value={comic.title || ''}
                    onChange={(e) => setComic(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="El título de tu historieta"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Descripción
                  </label>
                  <textarea
                    value={comic.description || ''}
                    onChange={(e) => setComic(prev => ({ ...prev, description: e.target.value }))}
                    rows={4}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="Describe tu historieta..."
                  />
                </div>
              </div>
            </div>

            {/* Panel Preview */}
            <DraggablePanelPreview
              panels={comic.panels || []}
              onPanelsReorder={handlePanelsReorder}
              onPanelEdit={handlePanelEdit}
              onPanelDelete={handlePanelDelete}
            />

            {/* Background Music */}
            {(comic.panels || []).length > 0 && (
              <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-purple-100">
                <div className="flex items-center space-x-3 mb-4">
                  <Music className="w-6 h-6 text-purple-600" />
                  <h3 className="text-xl font-bold text-gray-800">Música de Fondo</h3>
                </div>
                <p className="text-sm text-gray-600 mb-4">
                  Agrega música de fondo que se reproducirá durante toda la historieta
                </p>
                <button
                  onClick={() => {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = 'audio/*';
                    input.onchange = (e) => {
                      const file = (e.target as HTMLInputElement).files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = (event) => {
                          const url = event.target?.result as string;
                          setComic(prev => ({
                            ...prev,
                            backgroundMusic: {
                              backgroundMusic: {
                                url,
                                volume: 0.5,
                                loop: true
                              }
                            }
                          }));
                        };
                        reader.readAsDataURL(file);
                      }
                    };
                    input.click();
                  }}
                  className="w-full px-4 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all font-semibold"
                >
                  {comic.backgroundMusic ? '🎵 Cambiar Música' : '🎵 Agregar Música'}
                </button>
                {comic.backgroundMusic && (
                  <button
                    onClick={() => setComic(prev => ({ ...prev, backgroundMusic: undefined }))}
                    className="w-full mt-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                  >
                    Eliminar Música
                  </button>
                )}
              </div>
            )}

            {/* Panel Transitions */}
            {(comic.panels || []).length > 1 && (
              <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-blue-100">
                <div className="flex items-center space-x-3 mb-4">
                  <ArrowRightLeft className="w-6 h-6 text-blue-600" />
                  <h3 className="text-xl font-bold text-gray-800">Transiciones entre Paneles</h3>
                </div>
                <p className="text-sm text-gray-600 mb-4">
                  Configura transiciones animadas entre cada panel
                </p>
                <div className="space-y-3">
                  {(comic.panels || []).map((panel, index) => {
                    if (index === (comic.panels || []).length - 1) return null;
                    const transition = panel.transitions?.[0];

                    return (
                      <div key={index} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-gray-700">
                            Panel {index + 1} → Panel {index + 2}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <select
                            value={transition?.type || 'fade'}
                            onChange={(e) => {
                              const updatedPanels = [...(comic.panels || [])];
                              updatedPanels[index] = {
                                ...updatedPanels[index],
                                transitions: [{
                                  type: e.target.value as any,
                                  duration: transition?.duration || 500
                                }]
                              };
                              setComic(prev => ({ ...prev, panels: updatedPanels }));
                            }}
                            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                          >
                            <option value="fade">Fade</option>
                            <option value="slide">Slide</option>
                            <option value="zoom">Zoom</option>
                            <option value="flip">Flip</option>
                          </select>
                          <input
                            type="number"
                            value={transition?.duration || 500}
                            onChange={(e) => {
                              const updatedPanels = [...(comic.panels || [])];
                              updatedPanels[index] = {
                                ...updatedPanels[index],
                                transitions: [{
                                  type: transition?.type || 'fade',
                                  duration: Number(e.target.value)
                                }]
                              };
                              setComic(prev => ({ ...prev, panels: updatedPanels }));
                            }}
                            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                            placeholder="Duración (ms)"
                            min="100"
                            max="2000"
                            step="100"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Publish Button */}
            <button
              onClick={publishComic}
              disabled={!comic.title || !comic.panels || comic.panels.length === 0 || isUploading}
              className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-4 rounded-xl font-semibold hover:from-purple-700 hover:to-blue-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-lg"
            >
              {isUploading ? 'Publicando...' : '🚀 Publicar Historieta'}
            </button>

            {/* Preview Button */}
            {(comic.panels || []).length > 0 && (
              <button
                onClick={() => setShowPreview(true)}
                className="w-full bg-gradient-to-r from-green-600 to-teal-600 text-white py-4 rounded-xl font-semibold hover:from-green-700 hover:to-teal-700 transition-all duration-200 text-lg"
              >
                👁️ Vista Previa de la Historieta
              </button>
            )}
          </div>

          {/* Right Panel - Panel Upload */}
          <div className="space-y-6">
            {/* Panel Upload */}
            <MultiPanelUpload onPanelsUploaded={handleMultiplePanelsUpload} />

            {/* Advanced Editor Info */}
            {(comic.panels || []).length > 0 && (
              <div className="bg-gradient-to-r from-purple-100 to-blue-100 rounded-2xl p-6 border border-purple-200">
                <div className="flex items-center space-x-3 mb-3">
                  <div className="w-10 h-10 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full flex items-center justify-center">
                    <Wand2 className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-800">Editor Avanzado</h3>
                </div>
                <p className="text-gray-700 mb-4">
                  Haz clic en el botón "Editar" de cualquier panel para acceder a herramientas avanzadas:
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-purple-600 rounded-full"></div>
                    <span>Animaciones y transiciones</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                    <span>Música y efectos de sonido</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                    <span>Herramientas de dibujo</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-yellow-600 rounded-full"></div>
                    <span>Filtros y efectos visuales</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-red-600 rounded-full"></div>
                    <span>Texto y formas</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-indigo-600 rounded-full"></div>
                    <span>Exportar y compartir</span>
                  </div>
                </div>
                <div className="mt-4 p-3 bg-white/50 rounded-lg">
                  <p className="text-sm text-gray-700">
                    <strong>🎨 Nuevas funciones:</strong> Zoom, grid, deshacer/rehacer, 
                    copiar/pegar elementos, filtros avanzados y exportación de paneles.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Advanced Panel Editor Modal */}
        {showAdvancedEditor && editingPanel && (
          <AdvancedPanelEditor
            panel={editingPanel.panel}
            onPanelUpdate={handlePanelUpdate}
            onClose={() => {
              setShowAdvancedEditor(false);
              setEditingPanel(null);
            }}
          />
        )}

        {/* Comic Preview Modal */}
        <ComicPreview
          comic={comic}
          isOpen={showPreview}
          onClose={() => setShowPreview(false)}
        />
      </div>
    </div>
  );
};

export default Upload;