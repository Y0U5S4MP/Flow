import React, { useState, useRef, useEffect } from 'react';
import { Panel, ComicElement, ElementAnimation } from '../types/Comic';
import { X, Undo, Redo, Copy, Layers, Grid2x2 as Grid, ZoomIn, ZoomOut, Type, Square, Circle, Trash2, Eye, EyeOff, Download, Image as ImageIcon, ArrowUp, ArrowDown, Play } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

interface AdvancedPanelEditorProps {
  panel: Panel;
  onPanelUpdate: (panel: Panel) => void;
  onClose: () => void;
}

const AdvancedPanelEditor: React.FC<AdvancedPanelEditorProps> = ({
  panel,
  onPanelUpdate,
  onClose
}) => {
  const [activeTab, setActiveTab] = useState<'elements' | 'animations' | 'order'>('elements');
  const [selectedElement, setSelectedElement] = useState<string | null>(null);
  const [zoom, setZoom] = useState(100);
  const [showGrid, setShowGrid] = useState(false);
  const [localPanel, setLocalPanel] = useState<Panel>(panel);
  const [history, setHistory] = useState<Panel[]>([panel]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [clipboard, setClipboard] = useState<ComicElement | null>(null);
  const [draggingElement, setDraggingElement] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [resizingElement, setResizingElement] = useState<string | null>(null);
  const [resizeHandle, setResizeHandle] = useState<string | null>(null);
  const [previewAnimation, setPreviewAnimation] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    setLocalPanel(panel);
    setHistory([panel]);
    setHistoryIndex(0);
  }, [panel]);

  const addToHistory = (newPanel: Panel) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newPanel);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
    setLocalPanel(newPanel);
    onPanelUpdate(newPanel);
  };

  const undo = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      const previousPanel = history[newIndex];
      setLocalPanel(previousPanel);
      onPanelUpdate(previousPanel);
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      const nextPanel = history[newIndex];
      setLocalPanel(nextPanel);
      onPanelUpdate(nextPanel);
    }
  };

  const updateElement = (elementId: string, updates: Partial<ComicElement>) => {
    const updatedPanel: Panel = {
      ...localPanel,
      elements: localPanel.elements.map(el =>
        el.id === elementId ? { ...el, ...updates } : el
      )
    };
    addToHistory(updatedPanel);
  };

  const deleteElement = (elementId: string) => {
    const updatedPanel: Panel = {
      ...localPanel,
      elements: localPanel.elements.filter(el => el.id !== elementId)
    };
    addToHistory(updatedPanel);
    setSelectedElement(null);
  };

  const addElement = (element: ComicElement) => {
    const maxOrder = Math.max(0, ...localPanel.elements.map(el => el.appearanceOrder || 0));
    const updatedPanel: Panel = {
      ...localPanel,
      elements: [...localPanel.elements, { ...element, appearanceOrder: maxOrder + 1 }]
    };
    addToHistory(updatedPanel);
  };

  const copyElement = () => {
    const element = localPanel.elements.find(el => el.id === selectedElement);
    if (element) {
      setClipboard(element);
    }
  };

  const pasteElement = () => {
    if (clipboard) {
      const newElement = { ...clipboard, id: uuidv4(), x: clipboard.x + 20, y: clipboard.y + 20 };
      addElement(newElement);
    }
  };

  const moveElementOrder = (elementId: string, direction: 'up' | 'down') => {
    const currentElement = localPanel.elements.find(el => el.id === elementId);
    if (!currentElement) return;

    const currentOrder = currentElement.appearanceOrder || 0;
    const targetOrder = direction === 'up' ? currentOrder - 1 : currentOrder + 1;
    const targetElement = localPanel.elements.find(el => (el.appearanceOrder || 0) === targetOrder);

    if (!targetElement) return;

    const updatedPanel: Panel = {
      ...localPanel,
      elements: localPanel.elements.map(el => {
        if (el.id === elementId) return { ...el, appearanceOrder: targetOrder };
        if (el.id === targetElement.id) return { ...el, appearanceOrder: currentOrder };
        return el;
      })
    };
    addToHistory(updatedPanel);
  };

  const exportPanel = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = 1600;
    canvas.height = 900;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    localPanel.elements.forEach(element => {
      drawElement(ctx, element);
    });

    const link = document.createElement('a');
    link.download = 'panel.png';
    link.href = canvas.toDataURL();
    link.click();
  };

  const drawElement = (ctx: CanvasRenderingContext2D, element: ComicElement) => {
    ctx.save();

    const scaleX = 1600 / 800;
    const scaleY = 900 / 600;

    switch (element.type) {
      case 'text':
        ctx.font = `${(element.fontSize || 16) * scaleX}px Arial`;
        ctx.fillStyle = element.color || '#000000';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText(element.content || '', element.x * scaleX, element.y * scaleY);
        break;

      case 'shape':
        ctx.fillStyle = element.color || '#000000';
        if (element.shape === 'rectangle') {
          ctx.fillRect(
            element.x * scaleX,
            element.y * scaleY,
            (element.width || 50) * scaleX,
            (element.height || 50) * scaleY
          );
        } else if (element.shape === 'circle') {
          ctx.beginPath();
          ctx.arc(
            (element.x + (element.width || 50) / 2) * scaleX,
            (element.y + (element.height || 50) / 2) * scaleY,
            ((element.width || 50) / 2) * scaleX,
            0, 2 * Math.PI
          );
          ctx.fill();
        }
        break;

      case 'image':
      case 'gif':
        if (element.imageUrl || element.gifUrl) {
          const img = new Image();
          img.src = (element.imageUrl || element.gifUrl) as string;
          ctx.drawImage(img, element.x, element.y, element.width || 100, element.height || 100);
        }
        break;
    }

    ctx.restore();
  };

  const handleMouseDown = (e: React.MouseEvent, elementId: string, handle?: string) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedElement(elementId);

    if (handle) {
      setResizingElement(elementId);
      setResizeHandle(handle);
    } else {
      setDraggingElement(elementId);
      const element = localPanel.elements.find(el => el.id === elementId);
      if (!element) return;

      const rect = e.currentTarget.getBoundingClientRect();
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (draggingElement) {
      const element = localPanel.elements.find(el => el.id === draggingElement);
      if (!element) return;

      const canvas = e.currentTarget as HTMLElement;
      const rect = canvas.getBoundingClientRect();

      const scaleX = 1600 / 800;
      const scaleY = 900 / 600;

      const newX = ((e.clientX - rect.left - dragOffset.x) / (zoom / 100)) * scaleX;
      const newY = ((e.clientY - rect.top - dragOffset.y) / (zoom / 100)) * scaleY;

      updateElement(draggingElement, {
        x: Math.max(0, Math.min(1600 - (element.width || 100), newX)),
        y: Math.max(0, Math.min(900 - (element.height || 100), newY))
      });
    }

    if (resizingElement && resizeHandle) {
      const element = localPanel.elements.find(el => el.id === resizingElement);
      if (!element) return;

      const canvas = e.currentTarget as HTMLElement;
      const rect = canvas.getBoundingClientRect();

      const scaleX = 1600 / 800;
      const scaleY = 900 / 600;

      const mouseX = ((e.clientX - rect.left) / (zoom / 100)) * scaleX;
      const mouseY = ((e.clientY - rect.top) / (zoom / 100)) * scaleY;

      let newWidth = element.width || 100;
      let newHeight = element.height || 100;
      let newX = element.x;
      let newY = element.y;

      switch (resizeHandle) {
        case 'se':
          newWidth = Math.max(20, mouseX - element.x);
          newHeight = Math.max(20, mouseY - element.y);
          break;
        case 'sw':
          newWidth = Math.max(20, element.x + (element.width || 100) - mouseX);
          newHeight = Math.max(20, mouseY - element.y);
          newX = Math.min(element.x, mouseX);
          break;
        case 'ne':
          newWidth = Math.max(20, mouseX - element.x);
          newHeight = Math.max(20, element.y + (element.height || 100) - mouseY);
          newY = Math.min(element.y, mouseY);
          break;
        case 'nw':
          newWidth = Math.max(20, element.x + (element.width || 100) - mouseX);
          newHeight = Math.max(20, element.y + (element.height || 100) - mouseY);
          newX = Math.min(element.x, mouseX);
          newY = Math.min(element.y, mouseY);
          break;
      }

      updateElement(resizingElement, { x: newX, y: newY, width: newWidth, height: newHeight });
    }
  };

  const handleMouseUp = () => {
    setDraggingElement(null);
    setResizingElement(null);
    setResizeHandle(null);
  };

  const getAnimationClass = (element: ComicElement, animationType: 'entrance' | 'exit') => {
    const animation = animationType === 'entrance' ? element.entranceAnimation : element.exitAnimation;
    if (!animation) return '';

    const baseClass = 'animate-';
    switch (animation.type) {
      case 'fadeIn':
        return `${baseClass}fadeIn`;
      case 'fadeOut':
        return `${baseClass}fadeOut`;
      case 'slideIn':
        return `${baseClass}slideIn-${animation.direction || 'left'}`;
      case 'slideOut':
        return `${baseClass}slideOut-${animation.direction || 'left'}`;
      case 'zoomIn':
        return `${baseClass}zoomIn`;
      case 'zoomOut':
        return `${baseClass}zoomOut`;
      case 'bounceIn':
        return `${baseClass}bounceIn`;
      case 'bounceOut':
        return `${baseClass}bounceOut`;
      case 'rotateIn':
        return `${baseClass}rotateIn`;
      case 'rotateOut':
        return `${baseClass}rotateOut`;
      default:
        return '';
    }
  };

  const renderElement = (element: ComicElement) => {
    const isSelected = selectedElement === element.id;
    const scaleX = 800 / 1600;
    const scaleY = 600 / 900;

    const style: React.CSSProperties = {
      position: 'absolute',
      left: `${element.x * scaleX}px`,
      top: `${element.y * scaleY}px`,
      width: element.width ? `${element.width * scaleX}px` : 'auto',
      height: element.height ? `${element.height * scaleY}px` : 'auto',
      fontSize: element.fontSize ? `${element.fontSize}px` : '16px',
      color: element.color || '#000000',
      fontWeight: element.fontWeight || 'normal',
      fontStyle: element.fontStyle || 'normal',
      textAlign: (element.textAlign as any) || 'left',
      cursor: draggingElement === element.id ? 'grabbing' : 'grab',
      border: isSelected ? '2px solid #8b5cf6' : 'none',
      userSelect: 'none',
      zIndex: isSelected ? 1000 : 1
    };

    const elementContent = (() => {
      switch (element.type) {
        case 'text':
          return (
            <div style={{ ...style, padding: '4px' }}>
              {element.content}
            </div>
          );

        case 'image':
          return (
            <img
              src={element.imageUrl}
              alt="Imagen"
              style={style}
            />
          );

        case 'gif':
          return (
            <img
              src={element.gifUrl}
              alt="GIF"
              style={style}
            />
          );

        case 'video':
          return (
            <video
              src={element.videoUrl}
              style={style}
              autoPlay={element.autoplay}
              loop={element.loop}
              muted={true}
            />
          );

        case 'shape':
          return (
            <div
              style={{
                ...style,
                backgroundColor: element.color,
                borderRadius: element.shape === 'circle' ? '50%' : '0'
              }}
            />
          );

        default:
          return null;
      }
    })();

    return (
      <div
        key={element.id}
        onMouseDown={(e) => handleMouseDown(e, element.id)}
        className={previewAnimation && element.entranceAnimation ? getAnimationClass(element, 'entrance') : ''}
      >
        {elementContent}

        {isSelected && element.type !== 'text' && (
          <>
            <div
              className="absolute w-3 h-3 bg-white border-2 border-purple-600 rounded-full cursor-nw-resize"
              style={{ left: '-6px', top: '-6px' }}
              onMouseDown={(e) => { e.stopPropagation(); handleMouseDown(e, element.id, 'nw'); }}
            />
            <div
              className="absolute w-3 h-3 bg-white border-2 border-purple-600 rounded-full cursor-ne-resize"
              style={{ right: '-6px', top: '-6px' }}
              onMouseDown={(e) => { e.stopPropagation(); handleMouseDown(e, element.id, 'ne'); }}
            />
            <div
              className="absolute w-3 h-3 bg-white border-2 border-purple-600 rounded-full cursor-sw-resize"
              style={{ left: '-6px', bottom: '-6px' }}
              onMouseDown={(e) => { e.stopPropagation(); handleMouseDown(e, element.id, 'sw'); }}
            />
            <div
              className="absolute w-3 h-3 bg-white border-2 border-purple-600 rounded-full cursor-se-resize"
              style={{ right: '-6px', bottom: '-6px' }}
              onMouseDown={(e) => { e.stopPropagation(); handleMouseDown(e, element.id, 'se'); }}
            />
          </>
        )}
      </div>
    );
  };

  const sortedElements = [...localPanel.elements].sort((a, b) =>
    (a.appearanceOrder || 0) - (b.appearanceOrder || 0)
  );

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-7xl h-5/6 flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center space-x-4">
            <h2 className="text-xl font-bold text-gray-800">Editor Avanzado de Panel</h2>
            <div className="flex items-center space-x-2">
              <button
                onClick={undo}
                disabled={historyIndex === 0}
                className="p-2 hover:bg-gray-100 rounded-lg disabled:opacity-50"
                title="Deshacer"
              >
                <Undo className="w-4 h-4" />
              </button>
              <button
                onClick={redo}
                disabled={historyIndex === history.length - 1}
                className="p-2 hover:bg-gray-100 rounded-lg disabled:opacity-50"
                title="Rehacer"
              >
                <Redo className="w-4 h-4" />
              </button>
              <button
                onClick={pasteElement}
                disabled={!clipboard}
                className="p-2 hover:bg-gray-100 rounded-lg disabled:opacity-50"
                title="Pegar"
              >
                <Copy className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowGrid(!showGrid)}
              className={`p-2 rounded-lg ${showGrid ? 'bg-purple-100 text-purple-600' : 'hover:bg-gray-100'}`}
              title="Mostrar/Ocultar Grid"
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setZoom(Math.max(50, zoom - 10))}
              className="p-2 hover:bg-gray-100 rounded-lg"
              title="Alejar"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="text-sm text-gray-600">{zoom}%</span>
            <button
              onClick={() => setZoom(Math.min(200, zoom + 10))}
              className="p-2 hover:bg-gray-100 rounded-lg"
              title="Acercar"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          <div className="flex-1 bg-gray-100 rounded-lg overflow-hidden relative">
            <div
              className="relative bg-white mx-auto"
              style={{
                width: `${800}px`,
                height: `${600}px`,
                transform: `scale(${zoom / 100})`,
                transformOrigin: 'top left'
              }}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            >
              {showGrid && (
                <div className="absolute inset-0 opacity-20">
                  <svg width="100%" height="100%">
                    <defs>
                      <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                        <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#ccc" strokeWidth="1"/>
                      </pattern>
                    </defs>
                    <rect width="100%" height="100%" fill="url(#grid)" />
                  </svg>
                </div>
              )}

            {sortedElements
              .filter(el => el.visible !== false)
              .map(renderElement)}
          </div>
        </div>

        <div className="w-80 border-l border-gray-200 bg-white flex flex-col">
          <div className="flex border-b border-gray-200 overflow-x-auto">
            {[
              { key: 'elements', icon: Layers, label: 'Elementos' },
              { key: 'animations', icon: Play, label: 'Animaciones' },
              { key: 'order', icon: ArrowUp, label: 'Orden' }
            ].map(({ key, icon: Icon, label }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key as any)}
                className={`flex-1 p-3 text-xs font-medium transition-colors border-b-2 ${
                  activeTab === key
                    ? 'bg-purple-100 text-purple-700 border-purple-500'
                    : 'text-gray-600 hover:text-purple-600 hover:bg-purple-50 border-transparent'
                }`}
              >
                <Icon className="w-4 h-4 mx-auto mb-1" />
                {label}
              </button>
            ))}
          </div>

          <div className="flex-1 p-4 overflow-y-auto">
            {activeTab === 'elements' && (
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-gray-800 mb-3">Agregar Elementos</h3>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => {
                        const element: ComicElement = {
                          id: uuidv4(),
                          type: 'text',
                          x: 100,
                          y: 100,
                          content: 'Nuevo texto',
                          fontSize: 24,
                          color: '#000000'
                        };
                        addElement(element);
                        setSelectedElement(element.id);
                      }}
                      className="p-3 border border-gray-200 rounded-lg hover:border-purple-300 hover:bg-purple-50 transition-all text-center"
                    >
                      <Type className="w-5 h-5 mx-auto mb-1 text-purple-600" />
                      <span className="text-xs">Texto</span>
                    </button>

                    <button
                      onClick={() => {
                        const element: ComicElement = {
                          id: uuidv4(),
                          type: 'shape',
                          x: 150,
                          y: 150,
                          width: 100,
                          height: 100,
                          shape: 'rectangle',
                          color: '#3b82f6'
                        };
                        addElement(element);
                        setSelectedElement(element.id);
                      }}
                      className="p-3 border border-gray-200 rounded-lg hover:border-purple-300 hover:bg-purple-50 transition-all text-center"
                    >
                      <Square className="w-5 h-5 mx-auto mb-1 text-purple-600" />
                      <span className="text-xs">Rectángulo</span>
                    </button>

                    <button
                      onClick={() => {
                        const element: ComicElement = {
                          id: uuidv4(),
                          type: 'shape',
                          x: 150,
                          y: 150,
                          width: 100,
                          height: 100,
                          shape: 'circle',
                          color: '#10b981'
                        };
                        addElement(element);
                        setSelectedElement(element.id);
                      }}
                      className="p-3 border border-gray-200 rounded-lg hover:border-purple-300 hover:bg-purple-50 transition-all text-center"
                    >
                      <Circle className="w-5 h-5 mx-auto mb-1 text-purple-600" />
                      <span className="text-xs">Círculo</span>
                    </button>

                    <button
                      onClick={() => {
                        const input = document.createElement('input');
                        input.type = 'file';
                        input.accept = 'image/*,.gif,video/mp4';
                        input.onchange = (e) => {
                          const file = (e.target as HTMLInputElement).files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = (event) => {
                              const url = event.target?.result as string;
                              let type: 'image' | 'gif' | 'video' = 'image';
                              if (file.type.startsWith('video/')) type = 'video';
                              else if (file.name.toLowerCase().endsWith('.gif')) type = 'gif';

                              const element: ComicElement = {
                                id: uuidv4(),
                                type,
                                x: 50,
                                y: 50,
                                width: 200,
                                height: 150,
                                imageUrl: type === 'image' ? url : undefined,
                                gifUrl: type === 'gif' ? url : undefined,
                                videoUrl: type === 'video' ? url : undefined,
                                autoplay: type === 'video' ? true : undefined,
                                loop: true
                              };
                              addElement(element);
                              setSelectedElement(element.id);
                            };
                            reader.readAsDataURL(file);
                          }
                        };
                        input.click();
                      }}
                      className="p-3 border border-gray-200 rounded-lg hover:border-purple-300 hover:bg-purple-50 transition-all text-center"
                    >
                      <ImageIcon className="w-5 h-5 mx-auto mb-1 text-purple-600" />
                      <span className="text-xs">Imagen</span>
                    </button>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-800 mb-3">
                    Elementos del Panel ({localPanel.elements.length})
                  </h3>
                  <div className="space-y-2 max-h-80 overflow-y-auto">
                    {localPanel.elements.map((element) => (
                      <div
                        key={element.id}
                        className={`p-3 border rounded-lg cursor-pointer transition-all ${
                          selectedElement === element.id
                            ? 'border-purple-500 bg-purple-50'
                            : 'border-gray-200 hover:border-purple-300'
                        }`}
                        onClick={() => setSelectedElement(element.id)}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium capitalize">
                            {element.type}
                            {element.type === 'text' && element.content && ` - ${element.content.slice(0, 15)}...`}
                          </span>
                          <div className="flex space-x-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                copyElement();
                              }}
                              className="p-1 hover:bg-gray-100 rounded"
                              title="Copiar"
                            >
                              <Copy className="w-3 h-3 text-gray-500" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                updateElement(element.id, { visible: element.visible === false });
                              }}
                              className="p-1 hover:bg-gray-100 rounded"
                              title="Mostrar/Ocultar"
                            >
                              {element.visible !== false ?
                                <Eye className="w-3 h-3 text-green-600" /> :
                                <EyeOff className="w-3 h-3 text-gray-400" />
                              }
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteElement(element.id);
                              }}
                              className="p-1 hover:bg-red-50 rounded text-red-500"
                              title="Eliminar"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {selectedElement && (() => {
                  const element = localPanel.elements.find(el => el.id === selectedElement);
                  if (!element) return null;

                  return (
                    <div className="space-y-3">
                      <h4 className="font-semibold text-gray-800">Propiedades</h4>
                      {element.type === 'text' && (
                        <>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Texto</label>
                            <input
                              type="text"
                              value={element.content || ''}
                              onChange={(e) => updateElement(element.id, { content: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
                              <input
                                type="color"
                                value={element.color || '#000000'}
                                onChange={(e) => updateElement(element.id, { color: e.target.value })}
                                className="w-full h-10 border border-gray-300 rounded-lg"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Tamaño</label>
                              <input
                                type="number"
                                value={element.fontSize || 16}
                                onChange={(e) => updateElement(element.id, { fontSize: Number(e.target.value) })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                min="8"
                                max="72"
                              />
                            </div>
                          </div>
                        </>
                      )}

                      {element.type === 'shape' && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
                          <input
                            type="color"
                            value={element.color || '#000000'}
                            onChange={(e) => updateElement(element.id, { color: e.target.value })}
                            className="w-full h-10 border border-gray-300 rounded-lg"
                          />
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            )}

            {activeTab === 'animations' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-semibold text-gray-800">Animaciones de Elementos</h4>
                  <button
                    onClick={() => setPreviewAnimation(!previewAnimation)}
                    className={`px-3 py-1 rounded-lg text-sm ${previewAnimation ? 'bg-green-500 text-white' : 'bg-gray-200'}`}
                  >
                    <Play className="w-4 h-4 inline mr-1" />
                    {previewAnimation ? 'Previsualización' : 'Vista Normal'}
                  </button>
                </div>

                {selectedElement ? (() => {
                  const element = localPanel.elements.find(el => el.id === selectedElement);
                  if (!element) return null;

                  return (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Animación de Entrada</label>
                        <select
                          value={element.entranceAnimation?.type || ''}
                          onChange={(e) => {
                            const type = e.target.value as any;
                            updateElement(element.id, {
                              entranceAnimation: type ? { type, duration: 1000, delay: 0 } : undefined
                            });
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        >
                          <option value="">Sin animación</option>
                          <option value="fadeIn">Aparecer</option>
                          <option value="slideIn">Deslizar</option>
                          <option value="zoomIn">Zoom In</option>
                          <option value="bounceIn">Rebotar</option>
                          <option value="rotateIn">Rotar</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Animación de Salida</label>
                        <select
                          value={element.exitAnimation?.type || ''}
                          onChange={(e) => {
                            const type = e.target.value as any;
                            updateElement(element.id, {
                              exitAnimation: type ? { type, duration: 1000, delay: 0 } : undefined
                            });
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        >
                          <option value="">Sin animación</option>
                          <option value="fadeOut">Desvanecer</option>
                          <option value="slideOut">Deslizar Fuera</option>
                          <option value="zoomOut">Zoom Out</option>
                          <option value="bounceOut">Rebotar Fuera</option>
                          <option value="rotateOut">Rotar Fuera</option>
                        </select>
                      </div>

                      {element.entranceAnimation && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Duración: {element.entranceAnimation.duration}ms
                          </label>
                          <input
                            type="range"
                            min="200"
                            max="3000"
                            step="100"
                            value={element.entranceAnimation.duration}
                            onChange={(e) => updateElement(element.id, {
                              entranceAnimation: { ...element.entranceAnimation!, duration: Number(e.target.value) }
                            })}
                            className="w-full"
                          />
                        </div>
                      )}
                    </div>
                  );
                })() : (
                  <p className="text-gray-500 text-sm">Selecciona un elemento para añadir animaciones</p>
                )}
              </div>
            )}

            {activeTab === 'order' && (
              <div className="space-y-4">
                <h4 className="font-semibold text-gray-800 mb-3">Orden de Aparición</h4>
                <div className="space-y-2">
                  {sortedElements.map((element, index) => (
                    <div
                      key={element.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center space-x-3">
                        <span className="w-6 h-6 bg-purple-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
                          {index + 1}
                        </span>
                        <span className="text-sm capitalize">
                          {element.type}
                          {element.type === 'text' && element.content && ` - ${element.content.slice(0, 15)}`}
                        </span>
                      </div>
                      <div className="flex space-x-1">
                        <button
                          onClick={() => moveElementOrder(element.id, 'up')}
                          disabled={index === 0}
                          className="p-1 hover:bg-gray-200 rounded disabled:opacity-30"
                        >
                          <ArrowUp className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => moveElementOrder(element.id, 'down')}
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
            )}
          </div>
        </div>
        </div>

        <div className="flex items-center justify-between p-4 border-t border-gray-200">
          <div className="text-sm text-gray-600">
            {localPanel.elements.length} elemento(s)
          </div>
          <div className="flex space-x-2">
            <button
              onClick={exportPanel}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center space-x-2"
            >
              <Download className="w-4 h-4" />
              <span>Exportar</span>
            </button>

            <button
              onClick={onClose}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
            >
              Guardar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdvancedPanelEditor;
