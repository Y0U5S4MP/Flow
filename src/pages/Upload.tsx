import React, { useState } from 'react';
import { Upload as UploadIcon, Trash2, Save, X, Edit, GripVertical, ArrowUp, ArrowDown } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { Comic, Panel } from '../types/Comic';
import { saveComic } from '../utils/storage';
import { useAuth } from '../contexts/AuthContext';
import AdvancedPanelEditor from '../components/AdvancedPanelEditor';

const Upload: React.FC = () => {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [panels, setPanels] = useState<Panel[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [editingPanel, setEditingPanel] = useState<{ panel: Panel; index: number } | null>(null);
  const [draggedPanelIndex, setDraggedPanelIndex] = useState<number | null>(null);

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

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const newPanel: Panel = {
            id: uuidv4(),
            imageUrl: e.target?.result as string,
            panelWidth: img.width,
            panelHeight: img.height,
            elements: [],
            backgroundColor: '#ffffff'
          };
          setPanels(prev => [...prev, newPanel]);
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  };

  const handleRemovePanel = (panelId: string) => {
    setPanels(prev => prev.filter(p => p.id !== panelId));
  };

  const handleEditPanel = (panel: Panel, index: number) => {
    setEditingPanel({ panel, index });
  };

  const handlePanelUpdate = (updatedPanel: Panel) => {
    if (!editingPanel) return;
    const newPanels = [...panels];
    newPanels[editingPanel.index] = updatedPanel;
    setPanels(newPanels);
  };

  const handleMovePanel = (index: number, direction: 'up' | 'down') => {
    const newPanels = [...panels];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= panels.length) return;
    [newPanels[index], newPanels[newIndex]] = [newPanels[newIndex], newPanels[index]];
    setPanels(newPanels);
  };

  const handleDragStart = (index: number) => {
    setDraggedPanelIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedPanelIndex === null || draggedPanelIndex === index) return;

    const newPanels = [...panels];
    const draggedPanel = newPanels[draggedPanelIndex];
    newPanels.splice(draggedPanelIndex, 1);
    newPanels.splice(index, 0, draggedPanel);
    setPanels(newPanels);
    setDraggedPanelIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedPanelIndex(null);
  };

  const handlePublish = async () => {
    if (!title.trim()) {
      alert('Por favor ingresa un título');
      return;
    }

    if (panels.length === 0) {
      alert('Por favor sube al menos una imagen');
      return;
    }

    setIsUploading(true);

    try {
      const newComic: Comic = {
        id: uuidv4(),
        title: title.trim(),
        description: description.trim(),
        panels,
        createdAt: new Date().toISOString()
      };

      saveComic(newComic);

      setTitle('');
      setDescription('');
      setPanels([]);

      alert('¡Historieta publicada exitosamente!');
    } catch (error) {
      console.error('Error publishing comic:', error);
      alert('Error al publicar la historieta');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="min-h-screen py-12 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-gray-800 mb-4">
            Crear <span className="text-blue-600">Historieta</span>
          </h1>
          <p className="text-xl text-gray-600">Sube tus imágenes y comparte tu historia</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Título *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none transition-colors"
                placeholder="El título de tu historieta"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Descripción
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none transition-colors resize-none"
                placeholder="Describe tu historieta..."
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-4">
                Paneles
              </label>

              <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-blue-500 transition-colors cursor-pointer bg-gray-50">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageUpload}
                  className="hidden"
                  id="image-upload"
                />
                <label htmlFor="image-upload" className="cursor-pointer">
                  <UploadIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-lg font-medium text-gray-700 mb-2">
                    Haz clic para subir imágenes
                  </p>
                  <p className="text-sm text-gray-500">
                    Puedes seleccionar múltiples imágenes
                  </p>
                </label>
              </div>

              {panels.length > 0 && (
                <div className="mt-6 space-y-3">
                  {panels.map((panel, index) => (
                    <div
                      key={panel.id}
                      draggable
                      onDragStart={() => handleDragStart(index)}
                      onDragOver={(e) => handleDragOver(e, index)}
                      onDragEnd={handleDragEnd}
                      className="relative group bg-white border-2 border-gray-200 rounded-xl p-4 hover:border-blue-400 transition-all cursor-move"
                    >
                      <div className="flex items-center gap-4">
                        <GripVertical className="w-5 h-5 text-gray-400" />

                        <div className="flex items-center justify-center w-10 h-10 bg-blue-600 text-white rounded-full font-bold">
                          {index + 1}
                        </div>

                        <div className="flex-1 aspect-video bg-gray-100 rounded-lg overflow-hidden max-w-xs">
                          <img
                            src={panel.imageUrl}
                            alt={`Panel ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                        </div>

                        <div className="flex flex-col gap-2">
                          <button
                            onClick={() => handleMovePanel(index, 'up')}
                            disabled={index === 0}
                            className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                          >
                            <ArrowUp className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleMovePanel(index, 'down')}
                            disabled={index === panels.length - 1}
                            className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                          >
                            <ArrowDown className="w-4 h-4" />
                          </button>
                        </div>

                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEditPanel(panel, index)}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                          >
                            <Edit className="w-4 h-4" />
                            Editar
                          </button>
                          <button
                            onClick={() => handleRemovePanel(panel.id)}
                            className="p-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-4 mt-8">
            <button
              onClick={handlePublish}
              disabled={!title.trim() || panels.length === 0 || isUploading}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              <Save className="w-5 h-5" />
              {isUploading ? 'Publicando...' : 'Publicar Historieta'}
            </button>
          </div>
        </div>

        {panels.length > 0 && (
          <div className="mt-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-4 text-center">
              Vista Previa en Tiempo Real
            </h2>
            <div className="bg-gray-900 rounded-2xl p-8">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {panels.map((panel, index) => (
                  <div key={panel.id} className="bg-gray-800 rounded-lg p-4">
                    <div className="text-white text-sm font-semibold mb-2">
                      Panel {index + 1}
                    </div>
                    <div
                      className="relative bg-white rounded-lg overflow-hidden"
                      style={{
                        aspectRatio: `${panel.panelWidth} / ${panel.panelHeight}`,
                        maxHeight: '400px'
                      }}
                    >
                      <img
                        src={panel.imageUrl}
                        alt={`Panel ${index + 1}`}
                        className="absolute inset-0 w-full h-full object-contain"
                        style={{ backgroundColor: panel.backgroundColor || '#ffffff' }}
                      />
                      {panel.elements && panel.elements.length > 0 && panel.elements.map((element) => {
                        if (element.type === 'text') {
                          return (
                            <div
                              key={element.id}
                              style={{
                                position: 'absolute',
                                left: `${(element.x / panel.panelWidth) * 100}%`,
                                top: `${(element.y / panel.panelHeight) * 100}%`,
                                fontSize: `${element.fontSize}px`,
                                color: element.color,
                                fontWeight: element.fontWeight,
                                whiteSpace: 'pre-wrap',
                                pointerEvents: 'none'
                              }}
                            >
                              {element.content}
                            </div>
                          );
                        }
                        if (element.type === 'image' && element.src) {
                          return (
                            <img
                              key={element.id}
                              src={element.src}
                              alt="Element"
                              style={{
                                position: 'absolute',
                                left: `${(element.x / panel.panelWidth) * 100}%`,
                                top: `${(element.y / panel.panelHeight) * 100}%`,
                                width: `${(element.width! / panel.panelWidth) * 100}%`,
                                height: `${(element.height! / panel.panelHeight) * 100}%`,
                                objectFit: 'contain',
                                pointerEvents: 'none'
                              }}
                            />
                          );
                        }
                        if (element.type === 'shape') {
                          return (
                            <div
                              key={element.id}
                              style={{
                                position: 'absolute',
                                left: `${(element.x / panel.panelWidth) * 100}%`,
                                top: `${(element.y / panel.panelHeight) * 100}%`,
                                width: `${(element.width! / panel.panelWidth) * 100}%`,
                                height: `${(element.height! / panel.panelHeight) * 100}%`,
                                backgroundColor: element.color,
                                borderRadius: element.shape === 'circle' ? '50%' : '0',
                                pointerEvents: 'none'
                              }}
                            />
                          );
                        }
                        if (element.type === 'sticker') {
                          return (
                            <div
                              key={element.id}
                              style={{
                                position: 'absolute',
                                left: `${(element.x / panel.panelWidth) * 100}%`,
                                top: `${(element.y / panel.panelHeight) * 100}%`,
                                fontSize: `${(element.width! / panel.panelWidth) * 100}%`,
                                lineHeight: '1',
                                pointerEvents: 'none'
                              }}
                            >
                              {element.stickerType}
                            </div>
                          );
                        }
                        return null;
                      })}
                    </div>
                    {(panel.soundEffect || panel.backgroundMusic) && (
                      <div className="mt-2 text-xs text-gray-400">
                        {panel.soundEffect && <div>🔊 Efecto de sonido</div>}
                        {panel.backgroundMusic && <div>🎵 Música de fondo</div>}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {editingPanel && (
        <AdvancedPanelEditor
          panel={editingPanel.panel}
          onPanelUpdate={handlePanelUpdate}
          onClose={() => setEditingPanel(null)}
        />
      )}
    </div>
  );
};

export default Upload;
