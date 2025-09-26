import React, { useState } from 'react';
import { Upload as UploadIcon, Image, Film, FileText, X, Plus, Wand2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Comic, Panel, ComicElement } from '../types/Comic';
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
  const [currentPanel, setCurrentPanel] = useState<Panel>({
    id: uuidv4(),
    elements: []
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

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'gif' | 'video') => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const url = event.target?.result as string;
      
      const newElement: ComicElement = {
        id: uuidv4(),
        type: type === 'image' ? 'image' : type,
        x: 50,
        y: 50,
        width: type === 'video' ? 300 : 200,
        height: type === 'video' ? 200 : 150,
        imageUrl: type === 'image' ? url : undefined,
        gifUrl: type === 'gif' ? url : undefined,
        videoUrl: type === 'video' ? url : undefined,
        autoplay: type === 'video' ? true : undefined,
        loop: true,
        volume: type === 'video' ? 0.5 : undefined
      };

      setCurrentPanel(prev => ({
        ...prev,
        elements: [...prev.elements, newElement]
      }));
    };

    reader.readAsDataURL(file);
  };

  const addTextElement = () => {
    const newElement: ComicElement = {
      id: uuidv4(),
      type: 'text',
      x: 100,
      y: 100,
      content: 'Nuevo texto',
      fontSize: 24,
      color: '#000000'
    };

    setCurrentPanel(prev => ({
      ...prev,
      elements: [...prev.elements, newElement]
    }));
  };

  const addPanelToComic = () => {
    if (currentPanel.elements.length === 0) return;

    setComic(prev => ({
      ...prev,
      panels: [...(prev.panels || []), currentPanel]
    }));

    setCurrentPanel({
      id: uuidv4(),
      elements: []
    });
  };

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

    setEditingPanel(prev => prev ? { ...prev, panel: updatedPanel } : null);
  };

  const handlePanelDelete = (index: number) => {
    const updatedPanels = (comic.panels || []).filter((_, i) => i !== index);
    setComic(prev => ({
      ...prev,
      panels: updatedPanels
    }));
  };

  const removeElement = (elementId: string) => {
    setCurrentPanel(prev => ({
      ...prev,
      elements: prev.elements.filter(el => el.id !== elementId)
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

          {/* Right Panel - Current Panel Editor */}
          <div className="space-y-6">
            {/* Multi Panel Upload */}
            <MultiPanelUpload onPanelsUploaded={handleMultiplePanelsUpload} />
            
            <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-purple-100">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-gray-800">Panel Individual</h2>
                <div className="text-sm text-gray-600">
                  Para crear un panel a la vez
                </div>
              </div>
              
              {/* Upload Tools */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileUpload(e, 'image')}
                    className="hidden"
                  />
                  <div className="flex flex-col items-center p-4 border-2 border-dashed border-purple-300 rounded-lg hover:border-purple-400 hover:bg-purple-50 transition-all">
                    <Image className="w-8 h-8 text-purple-600 mb-2" />
                    <span className="text-sm font-medium text-purple-600">Subir Imagen</span>
                  </div>
                </label>

                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept=".gif"
                    onChange={(e) => handleFileUpload(e, 'gif')}
                    className="hidden"
                  />
                  <div className="flex flex-col items-center p-4 border-2 border-dashed border-purple-300 rounded-lg hover:border-purple-400 hover:bg-purple-50 transition-all">
                    <UploadIcon className="w-8 h-8 text-purple-600 mb-2" />
                    <span className="text-sm font-medium text-purple-600">Subir GIF</span>
                  </div>
                </label>

                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept="video/mp4"
                    onChange={(e) => handleFileUpload(e, 'video')}
                    className="hidden"
                  />
                  <div className="flex flex-col items-center p-4 border-2 border-dashed border-purple-300 rounded-lg hover:border-purple-400 hover:bg-purple-50 transition-all">
                    <Film className="w-8 h-8 text-purple-600 mb-2" />
                    <span className="text-sm font-medium text-purple-600">Subir Video</span>
                  </div>
                </label>

                <button
                  onClick={addTextElement}
                  className="flex flex-col items-center p-4 border-2 border-dashed border-purple-300 rounded-lg hover:border-purple-400 hover:bg-purple-50 transition-all"
                >
                  <FileText className="w-8 h-8 text-purple-600 mb-2" />
                  <span className="text-sm font-medium text-purple-600">Añadir Texto</span>
                </button>
              </div>

              {/* Current Panel Elements */}
              <div className="space-y-3">
                <h3 className="font-semibold text-gray-800">
                  Elementos del Panel ({currentPanel.elements.length})
                </h3>
                
                {currentPanel.elements.map((element) => (
                  <div key={element.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        {element.type === 'text' && <FileText className="w-4 h-4 text-blue-600" />}
                        {element.type === 'image' && <Image className="w-4 h-4 text-blue-600" />}
                        {element.type === 'gif' && <UploadIcon className="w-4 h-4 text-blue-600" />}
                        {element.type === 'video' && <Film className="w-4 h-4 text-blue-600" />}
                      </div>
                      <span className="text-gray-700 capitalize">
                        {element.type === 'text' ? element.content : element.type}
                      </span>
                    </div>
                    <button
                      onClick={() => removeElement(element.id)}
                      className="p-1 text-red-500 hover:bg-red-50 rounded"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>

              <button
                onClick={addPanelToComic}
                disabled={currentPanel.elements.length === 0}
                className="w-full mt-6 bg-green-600 text-white py-4 rounded-xl font-semibold hover:bg-green-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 text-lg"
              >
                <Plus className="w-5 h-5" />
                <span>➕ Añadir Panel a la Historieta</span>
              </button>

              {currentPanel.elements.length === 0 && (
                <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-yellow-800 text-sm">
                    <strong>💡 Consejo:</strong> Puedes subir múltiples archivos arriba o crear paneles individuales aquí. 
                    Agrega elementos y luego añade el panel a tu historieta.
                  </p>
                </div>
              )}
            </div>

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