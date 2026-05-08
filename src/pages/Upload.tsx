import React, { useState } from 'react';
import {
  Upload as UploadIcon, Trash2, Save, X, Edit,
  GripVertical, ArrowUp, ArrowDown, ChevronDown, ChevronUp, FilePlus
} from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { Comic, Panel, PanelTransition } from '../types/Comic';
import { saveComic } from '../utils/storage';
import { useAuth } from '../contexts/AuthContext';
import AdvancedPanelEditor from '../components/AdvancedPanelEditor';
import ComicPlayer from '../components/ComicPlayer';
import TransitionSettings from '../components/TransitionSettings';

const Upload: React.FC = () => {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [panels, setPanels] = useState<Panel[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [editingPanel, setEditingPanel] = useState<{ panel: Panel; index: number } | null>(null);
  const [draggedPanelIndex, setDraggedPanelIndex] = useState<number | null>(null);
  const [expandedTransitions, setExpandedTransitions] = useState<Set<string>>(new Set());
  const [showGlobalTransitions, setShowGlobalTransitions] = useState(false);
  // Panel a confirmar borrado (null = ninguno)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

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

  // ── Upload de imágenes ─────────────────────────────────────────────────────
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
            backgroundImage: e.target?.result as string,
            panelWidth: img.width,
            panelHeight: img.height,
            elements: [],
            backgroundColor: '#ffffff',
          };
          setPanels(prev => [...prev, newPanel]);
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
    // Resetea el input para que el mismo archivo pueda subirse de nuevo
    event.target.value = '';
  };

  const handleAddBlankPanel = () => {
    const newPanel: Panel = {
      id: uuidv4(),
      panelWidth: 816,
      panelHeight: 1056,
      elements: [],
      backgroundColor: '#ffffff',
    };
    setPanels(prev => [...prev, newPanel]);
  };

  // ── BUG FIX: eliminar solo el panel con ese id, sin tocar los demás ────────
  const handleRemovePanel = (panelId: string) => {
    // Doble comprobación: solo borra el panel cuyo id coincide exactamente
    setPanels(prev => prev.filter(p => p.id !== panelId));
    setConfirmDelete(null);
    // Si el panel que se borra estaba siendo editado, cierra el editor
    if (editingPanel?.panel.id === panelId) setEditingPanel(null);
    // Limpia la transición expandida si estaba abierta
    setExpandedTransitions(prev => { const s = new Set(prev); s.delete(panelId); return s; });
  };

  const handleEditPanel = (panel: Panel, index: number) => {
    setEditingPanel({ panel, index });
  };

  // Cuando el editor avanzado propaga cambios: actualiza solo ese índice
  const handlePanelUpdate = (updatedPanel: Panel) => {
    if (editingPanel === null) return;
    setPanels(prev => {
      const next = [...prev];
      // Busca por índice Y valida que el id coincida para evitar actualizaciones cruzadas
      if (next[editingPanel.index]?.id === updatedPanel.id) {
        next[editingPanel.index] = updatedPanel;
      }
      return next;
    });
  };

  const handleMovePanel = (index: number, direction: 'up' | 'down') => {
    const newPanels = [...panels];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= panels.length) return;
    [newPanels[index], newPanels[newIndex]] = [newPanels[newIndex], newPanels[index]];
    setPanels(newPanels);
  };

  // ── Drag & Drop ───────────────────────────────────────────────────────────
  const handleDragStart = (index: number) => setDraggedPanelIndex(index);

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedPanelIndex === null || draggedPanelIndex === index) return;
    const newPanels = [...panels];
    const dragged = newPanels[draggedPanelIndex];
    newPanels.splice(draggedPanelIndex, 1);
    newPanels.splice(index, 0, dragged);
    setPanels(newPanels);
    setDraggedPanelIndex(index);
  };

  const handleDragEnd = () => setDraggedPanelIndex(null);

  // ── Transiciones ──────────────────────────────────────────────────────────
  const toggleTransitionExpand = (panelId: string) => {
    setExpandedTransitions(prev => {
      const s = new Set(prev);
      s.has(panelId) ? s.delete(panelId) : s.add(panelId);
      return s;
    });
  };

  const updatePanelTransition = (
    panelId: string,
    type: 'entrance' | 'exit' | 'transitionToNext',
    transition: PanelTransition | undefined
  ) => {
    setPanels(prev => prev.map(p => {
      if (p.id !== panelId) return p;
      if (type === 'entrance')       return { ...p, entranceTransition: transition };
      if (type === 'exit')           return { ...p, exitTransition: transition };
      if (type === 'transitionToNext') return { ...p, transitionToNext: transition };
      return p;
    }));
  };

  // ── Publicar ──────────────────────────────────────────────────────────────
  const handlePublish = async () => {
    if (!title.trim()) { alert('Por favor ingresa un título'); return; }
    if (panels.length === 0) { alert('Por favor sube al menos una imagen'); return; }
    setIsUploading(true);
    try {
      const newComic: Comic = {
        id: uuidv4(),
        title: title.trim(),
        description: description.trim(),
        panels,
        createdAt: new Date().toISOString(),
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

  // ── Render ────────────────────────────────────────────────────────────────
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
            {/* Título */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Título *</label>
              <input type="text" value={title} onChange={e => setTitle(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none transition-colors"
                placeholder="El título de tu historieta" />
            </div>

            {/* Descripción */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Descripción</label>
              <textarea value={description} onChange={e => setDescription(e.target.value)}
                rows={3}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none transition-colors resize-none"
                placeholder="Describe tu historieta..." />
            </div>

            {/* Transiciones globales */}
            {panels.length > 0 && (
              <div className="bg-white border-2 border-blue-200 rounded-xl p-4 mb-6">
                <button onClick={() => setShowGlobalTransitions(!showGlobalTransitions)}
                  className="w-full flex items-center justify-between text-left font-semibold text-gray-700 mb-2">
                  <span className="flex items-center gap-2">
                    Transiciones Globales
                    <span className="text-xs font-normal text-gray-500">(Primer y último panel)</span>
                  </span>
                  {showGlobalTransitions ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                </button>
                {showGlobalTransitions && (
                  <div className="grid md:grid-cols-2 gap-4 mt-4">
                    <TransitionSettings
                      title="Entrada del Primer Panel"
                      transition={panels[0]?.entranceTransition}
                      onUpdate={t => updatePanelTransition(panels[0].id, 'entrance', t)} />
                    <TransitionSettings
                      title="Salida del Último Panel"
                      transition={panels[panels.length - 1]?.exitTransition}
                      onUpdate={t => updatePanelTransition(panels[panels.length - 1].id, 'exit', t)} />
                  </div>
                )}
              </div>
            )}

            {/* Paneles */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-4">Paneles</label>

              <div className="grid md:grid-cols-2 gap-4">
                {/* Upload imágenes */}
                <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-blue-500 transition-colors cursor-pointer bg-gray-50">
                  <input type="file" accept="image/*" multiple onChange={handleImageUpload}
                    className="hidden" id="image-upload" />
                  <label htmlFor="image-upload" className="cursor-pointer">
                    <UploadIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-base font-medium text-gray-700 mb-1">Subir imágenes</p>
                    <p className="text-xs text-gray-500">Selecciona múltiples imágenes</p>
                  </label>
                </div>

                {/* Panel en blanco */}
                <button onClick={handleAddBlankPanel}
                  className="border-2 border-dashed border-green-300 rounded-xl p-8 text-center hover:border-green-500 transition-colors bg-green-50 hover:bg-green-100">
                  <FilePlus className="w-12 h-12 text-green-500 mx-auto mb-3" />
                  <p className="text-base font-medium text-gray-700 mb-1">Panel en Blanco</p>
                  <p className="text-xs text-gray-500">Crear panel desde cero</p>
                </button>
              </div>

              {/* Lista de paneles */}
              {panels.length > 0 && (
                <div className="mt-6 space-y-3">
                  {panels.map((panel, index) => (
                    <div key={panel.id}
                      draggable
                      onDragStart={() => handleDragStart(index)}
                      onDragOver={e => handleDragOver(e, index)}
                      onDragEnd={handleDragEnd}
                      className={`relative group bg-white border-2 rounded-xl p-4 hover:border-blue-400 transition-all cursor-move ${
                        draggedPanelIndex === index ? 'opacity-50 border-blue-400' : 'border-gray-200'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <GripVertical className="w-5 h-5 text-gray-400 flex-shrink-0" />

                        <div className="flex items-center justify-center w-10 h-10 bg-blue-600 text-white rounded-full font-bold flex-shrink-0">
                          {index + 1}
                        </div>

                        {/* Miniatura */}
                        <div className="flex-1 aspect-video bg-gray-100 rounded-lg overflow-hidden max-w-xs"
                          style={{ maxHeight: 80 }}>
                          {panel.imageUrl || panel.backgroundImage ? (
                            <img src={panel.imageUrl || panel.backgroundImage} alt={`Panel ${index + 1}`}
                              className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center"
                              style={{ backgroundColor: panel.backgroundColor || '#fff' }}>
                              <div className="text-center">
                                <FilePlus className="w-6 h-6 text-gray-400 mx-auto mb-1" />
                                <p className="text-xs text-gray-500">Panel en Blanco</p>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Flechas */}
                        <div className="flex flex-col gap-1 flex-shrink-0">
                          <button onClick={() => handleMovePanel(index, 'up')} disabled={index === 0}
                            className="p-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg disabled:opacity-30 transition-colors">
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => handleMovePanel(index, 'down')} disabled={index === panels.length - 1}
                            className="p-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg disabled:opacity-30 transition-colors">
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Acciones */}
                        <div className="flex gap-2 flex-shrink-0">
                          <button onClick={() => toggleTransitionExpand(panel.id)}
                            className="flex items-center gap-1.5 px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors text-sm">
                            {expandedTransitions.has(panel.id) ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            Transición
                          </button>
                          <button onClick={() => handleEditPanel(panel, index)}
                            className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm">
                            <Edit className="w-4 h-4" /> Editar
                          </button>
                          {/* BUG FIX: confirmar antes de borrar para evitar borrados accidentales */}
                          {confirmDelete === panel.id ? (
                            <div className="flex gap-1">
                              <button onClick={() => handleRemovePanel(panel.id)}
                                className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-semibold transition-colors">
                                ¿Sí, borrar?
                              </button>
                              <button onClick={() => setConfirmDelete(null)}
                                className="px-3 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg text-sm transition-colors">
                                No
                              </button>
                            </div>
                          ) : (
                            <button onClick={() => setConfirmDelete(panel.id)}
                              className="p-2 bg-red-100 hover:bg-red-600 hover:text-white text-red-600 rounded-lg transition-colors">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Transición expandida */}
                      {expandedTransitions.has(panel.id) && index < panels.length - 1 && (
                        <div className="mt-4 pt-4 border-t border-gray-200">
                          <TransitionSettings
                            title={`Transición hacia el Panel ${index + 2}`}
                            transition={panel.transitionToNext}
                            onUpdate={t => updatePanelTransition(panel.id, 'transitionToNext', t)} />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Publicar */}
          <div className="flex gap-4 mt-8">
            <button onClick={handlePublish}
              disabled={!title.trim() || panels.length === 0 || isUploading}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors">
              <Save className="w-5 h-5" />
              {isUploading ? 'Publicando...' : 'Publicar Historieta'}
            </button>
          </div>
        </div>

        {/* Preview en tiempo real */}
        {panels.length > 0 && (
          <div className="mt-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-4 text-center">
              Vista Previa en Tiempo Real
            </h2>
            <div className="bg-gray-900 rounded-2xl p-8">
              <ComicPlayer panels={panels} />
            </div>
          </div>
        )}
      </div>

      {/* Editor avanzado */}
      {editingPanel && (
        <AdvancedPanelEditor
          panel={editingPanel.panel}
          onPanelUpdate={handlePanelUpdate}
          onClose={() => setEditingPanel(null)} />
      )}
    </div>
  );
};

export default Upload;