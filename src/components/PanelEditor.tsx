import React, { useState, useRef, useEffect } from 'react';
import { Panel, ComicElement, ElementAnimation } from '../types/Comic';
import {
  X, Undo, Redo, ZoomIn, ZoomOut, Type, Image as ImageIcon, Square, Circle,
  Trash2, Eye, EyeOff, ArrowUp, ArrowDown, Play, Settings, Crop, Save, Copy
} from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

// Editor de panel básico (actualmente no usado)
// Proporciona funcionalidad simplificada para editar paneles
// Incluye gestión de historial, zoom y herramientas básicas
interface PanelEditorProps {
  panel: Panel; // Panel a editar
  onSave: (panel: Panel) => void; // Callback cuando se guarda
  onClose: () => void; // Callback cuando se cierra el editor
}

const PanelEditor: React.FC<PanelEditorProps> = ({ panel, onSave, onClose }) => {
  const [editedPanel, setEditedPanel] = useState<Panel>(JSON.parse(JSON.stringify(panel)));
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [history, setHistory] = useState<Panel[]>([JSON.parse(JSON.stringify(panel))]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [zoom, setZoom] = useState(100);
  const [activeTab, setActiveTab] = useState<'elements' | 'animations' | 'canvas'>('elements');
  const [draggedElement, setDraggedElement] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const canvasRef = useRef<HTMLDivElement>(null);

  const panelWidth = editedPanel.panelWidth || 1600;
  const panelHeight = editedPanel.panelHeight || 900;
  const displayWidth = 800;
  const displayHeight = (panelHeight / panelWidth) * displayWidth;
  const scaleX = displayWidth / panelWidth;
  const scaleY = displayHeight / panelHeight;

  const selectedElement = editedPanel.elements.find(el => el.id === selectedElementId);

  const updatePanel = (newPanel: Panel) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(JSON.parse(JSON.stringify(newPanel)));
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
    setEditedPanel(JSON.parse(JSON.stringify(newPanel)));
  };

  const undo = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setEditedPanel(JSON.parse(JSON.stringify(history[newIndex])));
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setEditedPanel(JSON.parse(JSON.stringify(history[newIndex])));
    }
  };

  const addElement = (type: 'text' | 'image' | 'shape', extraProps: Partial<ComicElement> = {}) => {
    const newElement: ComicElement = {
      id: uuidv4(),
      type,
      x: 100,
      y: 100,
      width: type === 'text' ? undefined : 200,
      height: type === 'text' ? undefined : 200,
      appearanceOrder: editedPanel.elements.length,
      visible: true,
      ...extraProps
    };

    if (type === 'text') {
      newElement.content = 'Nuevo texto';
      newElement.fontSize = 32;
      newElement.color = '#000000';
      newElement.fontWeight = 'bold';
    } else if (type === 'shape') {
      newElement.shape = 'rectangle';
      newElement.color = '#3B82F6';
    }

    updatePanel({ ...editedPanel, elements: [...editedPanel.elements, newElement] });
    setSelectedElementId(newElement.id);
  };

  const updateElement = (id: string, updates: Partial<ComicElement>) => {
    const updatedElements = editedPanel.elements.map(el =>
      el.id === id ? { ...el, ...updates } : el
    );
    updatePanel({ ...editedPanel, elements: updatedElements });
  };

  const deleteElement = (id: string) => {
    const updatedElements = editedPanel.elements.filter(el => el.id !== id);
    updatePanel({ ...editedPanel, elements: updatedElements });
    setSelectedElementId(null);
  };

  const duplicateElement = (id: string) => {
    const element = editedPanel.elements.find(el => el.id === id);
    if (!element) return;

    const newElement: ComicElement = {
      ...JSON.parse(JSON.stringify(element)),
      id: uuidv4(),
      x: (element.x || 0) + 20,
      y: (element.y || 0) + 20,
      appearanceOrder: editedPanel.elements.length
    };

    updatePanel({ ...editedPanel, elements: [...editedPanel.elements, newElement] });
    setSelectedElementId(newElement.id);
  };

  const moveElementOrder = (id: string, direction: 'up' | 'down') => {
    const sortedElements = [...editedPanel.elements].sort(
      (a, b) => (a.appearanceOrder || 0) - (b.appearanceOrder || 0)
    );
    const index = sortedElements.findIndex(el => el.id === id);

    if (direction === 'up' && index > 0) {
      [sortedElements[index - 1], sortedElements[index]] = [sortedElements[index], sortedElements[index - 1]];
    } else if (direction === 'down' && index < sortedElements.length - 1) {
      [sortedElements[index], sortedElements[index + 1]] = [sortedElements[index + 1], sortedElements[index]];
    }

    const updatedElements = sortedElements.map((el, idx) => ({
      ...el,
      appearanceOrder: idx
    }));

    updatePanel({ ...editedPanel, elements: updatedElements });
  };

  const handleCanvasMouseDown = (e: React.MouseEvent, elementId: string) => {
    e.stopPropagation();
    setSelectedElementId(elementId);
    setDraggedElement(elementId);

    const element = editedPanel.elements.find(el => el.id === elementId);
    if (!element) return;

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const elemX = (element.x || 0) * scaleX;
    const elemY = (element.y || 0) * scaleY;

    setDragOffset({
      x: mouseX - elemX,
      y: mouseY - elemY
    });
  };

  const handleCanvasMouseMove = (e: React.MouseEvent) => {
    if (!draggedElement) return;

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const newX = (mouseX - dragOffset.x) / scaleX;
    const newY = (mouseY - dragOffset.y) / scaleY;

    updateElement(draggedElement, {
      x: Math.max(0, Math.min(panelWidth - 50, newX)),
      y: Math.max(0, Math.min(panelHeight - 50, newY))
    });
  };

  const handleCanvasMouseUp = () => {
    setDraggedElement(null);
  };

  const calculateContentBounds = () => {
    if (editedPanel.elements.length === 0) {
      return null;
    }

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

    editedPanel.elements.forEach(el => {
      const x = el.x || 0;
      const y = el.y || 0;
      const width = el.width || 100;
      const height = el.height || (el.type === 'text' ? el.fontSize || 32 : 100);

      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x + width);
      maxY = Math.max(maxY, y + height);
    });

    if (minX === Infinity) {
      return null;
    }

    const padding = 50;
    const finalMinX = Math.max(0, minX - padding);
    const finalMinY = Math.max(0, minY - padding);
    const finalWidth = Math.ceil(maxX - minX + padding * 2);
    const finalHeight = Math.ceil(maxY - minY + padding * 2);

    return {
      minX: finalMinX,
      minY: finalMinY,
      width: finalWidth,
      height: finalHeight
    };
  };

  const cropToContent = () => {
    const bounds = calculateContentBounds();
    if (!bounds) {
      alert('No hay elementos para ajustar');
      return;
    }

    const croppedElements = editedPanel.elements.map(el => ({
      ...el,
      x: (el.x || 0) - bounds.minX,
      y: (el.y || 0) - bounds.minY
    }));

    updatePanel({
      ...editedPanel,
      panelWidth: bounds.width,
      panelHeight: bounds.height,
      elements: croppedElements,
      backgroundImage: undefined
    });
  };

  const exportAsImage = async () => {
    const canvas = document.createElement('canvas');
    canvas.width = panelWidth;
    canvas.height = panelHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (editedPanel.backgroundColor) {
      ctx.fillStyle = editedPanel.backgroundColor;
      ctx.fillRect(0, 0, panelWidth, panelHeight);
    }

    if (editedPanel.backgroundImage) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      await new Promise((resolve) => {
        img.onload = () => {
          ctx.drawImage(img, 0, 0, panelWidth, panelHeight);
          resolve(null);
        };
        img.onerror = resolve;
        img.src = editedPanel.backgroundImage!;
      });
    }

    const sortedElements = [...editedPanel.elements].sort(
      (a, b) => (a.appearanceOrder || 0) - (b.appearanceOrder || 0)
    );

    for (const element of sortedElements) {
      if (element.visible === false) continue;

      const x = element.x || 0;
      const y = element.y || 0;

      ctx.save();

      if (element.type === 'text') {
        ctx.font = `${element.fontWeight || 'normal'} ${element.fontSize || 32}px Arial`;
        ctx.fillStyle = element.color || '#000000';
        ctx.textAlign = 'left';
        ctx.fillText(element.content || '', x, y + (element.fontSize || 32));
      } else if ((element.type === 'image' || element.type === 'gif') && (element.src || element.imageUrl || element.gifUrl)) {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        await new Promise((resolve) => {
          img.onload = () => {
            ctx.drawImage(img, x, y, element.width || 200, element.height || 200);
            resolve(null);
          };
          img.onerror = resolve;
          img.src = element.src || element.imageUrl || element.gifUrl || '';
        });
      } else if (element.type === 'video' && element.videoUrl) {
        const video = document.createElement('video');
        video.src = element.videoUrl;
        video.crossOrigin = 'anonymous';
        await new Promise((resolve) => {
          video.onloadeddata = () => {
            video.currentTime = 0;
            setTimeout(() => {
              ctx.drawImage(video, x, y, element.width || 200, element.height || 200);
              resolve(null);
            }, 100);
          };
          video.onerror = resolve;
        });
      } else if (element.type === 'shape') {
        ctx.fillStyle = element.color || '#000000';
        if (element.shape === 'rectangle') {
          ctx.fillRect(x, y, element.width || 200, element.height || 200);
        } else if (element.shape === 'circle') {
          const radius = (element.width || 200) / 2;
          ctx.beginPath();
          ctx.arc(x + radius, y + radius, radius, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      ctx.restore();
    }

    canvas.toBlob((blob) => {
      if (blob) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `panel-${Date.now()}.png`;
        a.click();
        URL.revokeObjectURL(url);
      }
    }, 'image/png');
  };

  const handleSave = () => {
    onSave(editedPanel);
    onClose();
  };

  const sortedElements = [...editedPanel.elements].sort(
    (a, b) => (a.appearanceOrder || 0) - (b.appearanceOrder || 0)
  );

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full h-full max-w-[95vw] max-h-[95vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center space-x-4">
            <h2 className="text-2xl font-bold text-gray-800">Editor Avanzado</h2>
            <div className="flex items-center space-x-2">
              <button
                onClick={undo}
                disabled={historyIndex === 0}
                className="p-2 hover:bg-gray-100 rounded-lg disabled:opacity-50"
                title="Deshacer"
              >
                <Undo className="w-5 h-5" />
              </button>
              <button
                onClick={redo}
                disabled={historyIndex === history.length - 1}
                className="p-2 hover:bg-gray-100 rounded-lg disabled:opacity-50"
                title="Rehacer"
              >
                <Redo className="w-5 h-5" />
              </button>
              <div className="w-px h-6 bg-gray-300 mx-2"></div>
              <button
                onClick={() => setZoom(Math.max(50, zoom - 10))}
                className="p-2 hover:bg-gray-100 rounded-lg"
                title="Alejar"
              >
                <ZoomOut className="w-5 h-5" />
              </button>
              <span className="text-sm font-medium text-gray-600 min-w-[60px] text-center">
                {zoom}%
              </span>
              <button
                onClick={() => setZoom(Math.min(200, zoom + 10))}
                className="p-2 hover:bg-gray-100 rounded-lg"
                title="Acercar"
              >
                <ZoomIn className="w-5 h-5" />
              </button>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleSave}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium flex items-center space-x-2"
            >
              <Save className="w-5 h-5" />
              <span>Guardar</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg"
              title="Cerrar sin guardar"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Canvas Area */}
          <div className="flex-1 flex items-center justify-center bg-gray-100 p-8 overflow-auto">
            <div
              ref={canvasRef}
              className="relative bg-white shadow-2xl"
              style={{
                width: `${displayWidth * (zoom / 100)}px`,
                height: `${displayHeight * (zoom / 100)}px`,
                transform: 'translateZ(0)'
              }}
              onMouseMove={handleCanvasMouseMove}
              onMouseUp={handleCanvasMouseUp}
              onMouseLeave={handleCanvasMouseUp}
            >
              {/* Background */}
              <div
                className="absolute inset-0"
                style={{
                  backgroundColor: editedPanel.backgroundColor || '#ffffff',
                  backgroundImage: editedPanel.backgroundImage ? `url(${editedPanel.backgroundImage})` : undefined,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center'
                }}
              />

              {/* Elements */}
              {sortedElements
                .filter(el => el.visible !== false)
                .map(element => {
                  const isSelected = selectedElementId === element.id;
                  const elemScaleX = scaleX * (zoom / 100);
                  const elemScaleY = scaleY * (zoom / 100);

                  return (
                    <div
                      key={element.id}
                      className={`absolute cursor-move ${isSelected ? 'ring-2 ring-blue-500' : ''}`}
                      style={{
                        left: `${(element.x || 0) * elemScaleX}px`,
                        top: `${(element.y || 0) * elemScaleY}px`,
                        width: element.width ? `${element.width * elemScaleX}px` : 'auto',
                        height: element.height ? `${element.height * elemScaleY}px` : 'auto'
                      }}
                      onMouseDown={(e) => handleCanvasMouseDown(e, element.id)}
                    >
                      {element.type === 'text' && (
                        <div
                          style={{
                            fontSize: `${(element.fontSize || 32) * (zoom / 100)}px`,
                            color: element.color || '#000000',
                            fontWeight: element.fontWeight || 'normal',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          {element.content || 'Texto'}
                        </div>
                      )}
                      {element.type === 'image' && (element.src || element.imageUrl || element.gifUrl) && (
                        <img
                          src={element.src || element.imageUrl || element.gifUrl}
                          alt="element"
                          className="w-full h-full object-cover"
                          draggable={false}
                        />
                      )}
                      {element.type === 'gif' && element.gifUrl && (
                        <img
                          src={element.gifUrl}
                          alt="gif"
                          className="w-full h-full object-cover"
                          draggable={false}
                        />
                      )}
                      {element.type === 'video' && element.videoUrl && (
                        <video
                          src={element.videoUrl}
                          className="w-full h-full object-cover"
                          autoPlay={element.autoplay}
                          loop={element.loop}
                          muted
                        />
                      )}
                      {element.type === 'shape' && (
                        <div
                          className="w-full h-full"
                          style={{
                            backgroundColor: element.color || '#000000',
                            borderRadius: element.shape === 'circle' ? '50%' : '0'
                          }}
                        />
                      )}
                    </div>
                  );
                })}
            </div>
          </div>

          {/* Sidebar */}
          <div className="w-80 border-l border-gray-200 flex flex-col bg-white">
            {/* Tabs */}
            <div className="flex border-b border-gray-200">
              {[
                { key: 'elements', label: 'Elementos' },
                { key: 'animations', label: 'Animaciones' },
                { key: 'canvas', label: 'Canvas' }
              ].map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setActiveTab(key as any)}
                  className={`flex-1 p-3 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === key
                      ? 'border-blue-500 text-blue-600 bg-blue-50'
                      : 'border-transparent text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-y-auto p-4">
              {activeTab === 'elements' && (
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold text-gray-800 mb-3">Agregar Elementos</h3>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => addElement('text')}
                        className="p-3 border-2 border-gray-200 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-all"
                      >
                        <Type className="w-5 h-5 mx-auto mb-1" />
                        <span className="text-xs">Texto</span>
                      </button>
                      <button
                        onClick={() => {
                          const input = document.createElement('input');
                          input.type = 'file';
                          input.accept = 'image/*';
                          input.onchange = (e) => {
                            const file = (e.target as HTMLInputElement).files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onload = (event) => {
                                addElement('image', { src: event.target?.result as string });
                              };
                              reader.readAsDataURL(file);
                            }
                          };
                          input.click();
                        }}
                        className="p-3 border-2 border-gray-200 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-all"
                      >
                        <ImageIcon className="w-5 h-5 mx-auto mb-1" />
                        <span className="text-xs">Imagen</span>
                      </button>
                      <button
                        onClick={() => addElement('shape', { shape: 'rectangle' })}
                        className="p-3 border-2 border-gray-200 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-all"
                      >
                        <Square className="w-5 h-5 mx-auto mb-1" />
                        <span className="text-xs">Cuadrado</span>
                      </button>
                      <button
                        onClick={() => addElement('shape', { shape: 'circle' })}
                        className="p-3 border-2 border-gray-200 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-all"
                      >
                        <Circle className="w-5 h-5 mx-auto mb-1" />
                        <span className="text-xs">Círculo</span>
                      </button>
                    </div>
                  </div>

                  {selectedElement && (
                    <div className="border-t pt-4">
                      <h3 className="font-semibold text-gray-800 mb-3">Propiedades</h3>
                      <div className="space-y-3">
                        {selectedElement.type === 'text' && (
                          <>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Contenido
                              </label>
                              <textarea
                                value={selectedElement.content || ''}
                                onChange={(e) => updateElement(selectedElement.id, { content: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                rows={3}
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Tamaño: {selectedElement.fontSize || 32}px
                              </label>
                              <input
                                type="range"
                                min="12"
                                max="120"
                                value={selectedElement.fontSize || 32}
                                onChange={(e) => updateElement(selectedElement.id, { fontSize: Number(e.target.value) })}
                                className="w-full"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Color
                              </label>
                              <input
                                type="color"
                                value={selectedElement.color || '#000000'}
                                onChange={(e) => updateElement(selectedElement.id, { color: e.target.value })}
                                className="w-full h-10 border border-gray-300 rounded-lg"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Peso
                              </label>
                              <select
                                value={selectedElement.fontWeight || 'normal'}
                                onChange={(e) => updateElement(selectedElement.id, { fontWeight: e.target.value as any })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                              >
                                <option value="normal">Normal</option>
                                <option value="bold">Negrita</option>
                              </select>
                            </div>
                          </>
                        )}

                        {selectedElement.type === 'shape' && (
                          <>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Color
                              </label>
                              <input
                                type="color"
                                value={selectedElement.color || '#3B82F6'}
                                onChange={(e) => updateElement(selectedElement.id, { color: e.target.value })}
                                className="w-full h-10 border border-gray-300 rounded-lg"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Ancho: {selectedElement.width || 200}px
                              </label>
                              <input
                                type="range"
                                min="10"
                                max="800"
                                value={selectedElement.width || 200}
                                onChange={(e) => updateElement(selectedElement.id, { width: Number(e.target.value) })}
                                className="w-full"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Alto: {selectedElement.height || 200}px
                              </label>
                              <input
                                type="range"
                                min="10"
                                max="800"
                                value={selectedElement.height || 200}
                                onChange={(e) => updateElement(selectedElement.id, { height: Number(e.target.value) })}
                                className="w-full"
                              />
                            </div>
                          </>
                        )}

                        {(selectedElement.type === 'image' || selectedElement.type === 'gif' || selectedElement.type === 'video') && (
                          <>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Ancho: {selectedElement.width || 200}px
                              </label>
                              <input
                                type="range"
                                min="50"
                                max="1600"
                                value={selectedElement.width || 200}
                                onChange={(e) => updateElement(selectedElement.id, { width: Number(e.target.value) })}
                                className="w-full"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Alto: {selectedElement.height || 200}px
                              </label>
                              <input
                                type="range"
                                min="50"
                                max="1200"
                                value={selectedElement.height || 200}
                                onChange={(e) => updateElement(selectedElement.id, { height: Number(e.target.value) })}
                                className="w-full"
                              />
                            </div>
                          </>
                        )}

                        <div className="flex space-x-2 pt-2">
                          <button
                            onClick={() => updateElement(selectedElement.id, { visible: !selectedElement.visible })}
                            className="flex-1 px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 flex items-center justify-center space-x-1"
                          >
                            {selectedElement.visible !== false ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            <span className="text-sm">{selectedElement.visible !== false ? 'Ocultar' : 'Mostrar'}</span>
                          </button>
                          <button
                            onClick={() => duplicateElement(selectedElement.id)}
                            className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center space-x-1"
                          >
                            <Copy className="w-4 h-4" />
                            <span className="text-sm">Duplicar</span>
                          </button>
                          <button
                            onClick={() => deleteElement(selectedElement.id)}
                            className="flex-1 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center justify-center space-x-1"
                          >
                            <Trash2 className="w-4 h-4" />
                            <span className="text-sm">Eliminar</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="border-t pt-4">
                    <h3 className="font-semibold text-gray-800 mb-3">Capas ({editedPanel.elements.length})</h3>
                    <div className="space-y-2">
                      {sortedElements.map((element, index) => (
                        <div
                          key={element.id}
                          className={`p-2 rounded-lg cursor-pointer flex items-center justify-between ${
                            selectedElementId === element.id ? 'bg-blue-100 border-2 border-blue-500' : 'bg-gray-50 hover:bg-gray-100'
                          }`}
                          onClick={() => setSelectedElementId(element.id)}
                        >
                          <div className="flex items-center space-x-2">
                            <span className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
                              {index + 1}
                            </span>
                            <span className="text-sm capitalize">
                              {element.type === 'text' && (element.content?.slice(0, 20) || 'Texto')}
                              {element.type === 'image' && 'Imagen'}
                              {element.type === 'gif' && 'GIF'}
                              {element.type === 'video' && 'Video'}
                              {element.type === 'shape' && (element.shape === 'circle' ? 'Círculo' : 'Cuadrado')}
                            </span>
                          </div>
                          <div className="flex space-x-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                moveElementOrder(element.id, 'up');
                              }}
                              disabled={index === 0}
                              className="p-1 hover:bg-gray-200 rounded disabled:opacity-30"
                            >
                              <ArrowUp className="w-4 h-4" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                moveElementOrder(element.id, 'down');
                              }}
                              disabled={index === sortedElements.length - 1}
                              className="p-1 hover:bg-gray-200 rounded disabled:opacity-30"
                            >
                              <ArrowDown className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'animations' && (
                <div className="space-y-4">
                  <h3 className="font-semibold text-gray-800 mb-3">Animaciones</h3>
                  {selectedElement ? (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Tipo de Animación
                        </label>
                        <select
                          value={selectedElement.animation?.type || 'none'}
                          onChange={(e) => {
                            const animation: ElementAnimation | undefined = e.target.value === 'none'
                              ? undefined
                              : {
                                  type: e.target.value as any,
                                  duration: selectedElement.animation?.duration || 1000,
                                  delay: selectedElement.animation?.delay || 0
                                };
                            updateElement(selectedElement.id, { animation });
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        >
                          <option value="none">Sin animación</option>
                          <option value="fadeIn">Aparecer (Fade In)</option>
                          <option value="slideIn">Deslizar</option>
                          <option value="zoomIn">Zoom In</option>
                          <option value="bounceIn">Rebotar</option>
                          <option value="rotateIn">Rotar</option>
                        </select>
                      </div>

                      {selectedElement.animation && (
                        <>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Duración: {selectedElement.animation.duration}ms
                            </label>
                            <input
                              type="range"
                              min="100"
                              max="3000"
                              step="100"
                              value={selectedElement.animation.duration}
                              onChange={(e) => updateElement(selectedElement.id, {
                                animation: { ...selectedElement.animation!, duration: Number(e.target.value) }
                              })}
                              className="w-full"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Retraso: {selectedElement.animation.delay}ms
                            </label>
                            <input
                              type="range"
                              min="0"
                              max="5000"
                              step="100"
                              value={selectedElement.animation.delay}
                              onChange={(e) => updateElement(selectedElement.id, {
                                animation: { ...selectedElement.animation!, delay: Number(e.target.value) }
                              })}
                              className="w-full"
                            />
                          </div>
                        </>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-600 text-center py-8">
                      Selecciona un elemento para configurar sus animaciones
                    </p>
                  )}
                </div>
              )}

              {activeTab === 'canvas' && (
                <div className="space-y-4">
                  <h3 className="font-semibold text-gray-800 mb-3">Configuración del Canvas</h3>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Dimensiones
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Ancho (px)</label>
                        <input
                          type="number"
                          min="400"
                          max="4000"
                          value={panelWidth}
                          onChange={(e) => updatePanel({ ...editedPanel, panelWidth: Number(e.target.value) })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Alto (px)</label>
                        <input
                          type="number"
                          min="400"
                          max="4000"
                          value={panelHeight}
                          onChange={(e) => updatePanel({ ...editedPanel, panelHeight: Number(e.target.value) })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        />
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={cropToContent}
                    className="w-full px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center justify-center space-x-2"
                  >
                    <Crop className="w-5 h-5" />
                    <span>Ajustar al Contenido</span>
                  </button>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Color de Fondo
                    </label>
                    <input
                      type="color"
                      value={editedPanel.backgroundColor || '#ffffff'}
                      onChange={(e) => updatePanel({ ...editedPanel, backgroundColor: e.target.value })}
                      className="w-full h-10 border border-gray-300 rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Imagen de Fondo
                    </label>
                    <button
                      onClick={() => {
                        const input = document.createElement('input');
                        input.type = 'file';
                        input.accept = 'image/*';
                        input.onchange = (e) => {
                          const file = (e.target as HTMLInputElement).files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = (event) => {
                              updatePanel({ ...editedPanel, backgroundImage: event.target?.result as string });
                            };
                            reader.readAsDataURL(file);
                          }
                        };
                        input.click();
                      }}
                      className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      {editedPanel.backgroundImage ? 'Cambiar Imagen de Fondo' : 'Subir Imagen de Fondo'}
                    </button>
                    {editedPanel.backgroundImage && (
                      <button
                        onClick={() => updatePanel({ ...editedPanel, backgroundImage: undefined })}
                        className="w-full mt-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                      >
                        Eliminar Fondo
                      </button>
                    )}
                  </div>

                  <div className="border-t pt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Exportar Panel
                    </label>
                    <button
                      onClick={exportAsImage}
                      className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center space-x-2"
                    >
                      <Save className="w-5 h-5" />
                      <span>Guardar como Imagen</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PanelEditor;
