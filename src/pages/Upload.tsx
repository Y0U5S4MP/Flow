import React, { useState } from 'react';
import { Upload as UploadIcon, Trash2, Eye, Save, X } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { Comic, Panel } from '../types/Comic';
import { saveComic } from '../utils/storage';
import { useAuth } from '../contexts/AuthContext';
import ComicPreview from '../components/ComicPreview';

const Upload: React.FC = () => {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [panels, setPanels] = useState<Panel[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

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
                <div className="mt-6 grid grid-cols-2 md:grid-cols-3 gap-4">
                  {panels.map((panel, index) => (
                    <div key={panel.id} className="relative group">
                      <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden border-2 border-gray-200">
                        <img
                          src={panel.imageUrl}
                          alt={`Panel ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="absolute top-2 left-2 bg-blue-600 text-white px-2 py-1 rounded-full text-xs font-bold">
                        {index + 1}
                      </div>
                      <button
                        onClick={() => handleRemovePanel(panel.id)}
                        className="absolute top-2 right-2 bg-red-600 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-4 mt-8">
            <button
              onClick={() => setShowPreview(true)}
              disabled={panels.length === 0}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gray-600 text-white rounded-xl font-semibold hover:bg-gray-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              <Eye className="w-5 h-5" />
              Vista Previa
            </button>

            <button
              onClick={handlePublish}
              disabled={!title.trim() || panels.length === 0 || isUploading}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              <Save className="w-5 h-5" />
              {isUploading ? 'Publicando...' : 'Publicar'}
            </button>
          </div>
        </div>
      </div>

      <ComicPreview
        comic={{ title, description, panels }}
        isOpen={showPreview}
        onClose={() => setShowPreview(false)}
      />
    </div>
  );
};

export default Upload;
