import React, { useState, useRef, useEffect } from 'react';
import { Panel, ComicElement, Animation, Transition, AudioConfig, SoundEffect, DrawingStroke } from '../types/Comic';
import { X, Palette, Music, Volume2, Zap, Move, RotateCcw, Brush, Type, Square, Circle, Trash2, Eye, EyeOff, Play, Pause, SkipForward, SkipBack, Save, Undo, Redo, Copy, Layers, Grid2x2 as Grid, ZoomIn, ZoomOut, RotateCw, AlignLeft, AlignCenter, AlignRight, Bold, Italic, Image as ImageIcon, Film, Upload as UploadIcon, Wand2, Sparkles, Volume1, VolumeX, Settings, Download, Share2 } from 'lucide-react';
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
  const [activeTab, setActiveTab] = useState<'elements' | 'animations' | 'transitions' | 'audio' | 'drawing' | 'effects'>('elements');
  const [selectedElement, setSelectedElement] = useState<string | null>(null);
  const [zoom, setZoom] = useState(100);
  const [showGrid, setShowGrid] = useState(false);
  const [localPanel, setLocalPanel] = useState<Panel>(panel);
  const [history, setHistory] = useState<Panel[]>([panel]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [clipboard, setClipboard] = useState<ComicElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentStroke, setCurrentStroke] = useState<DrawingStroke | null>(null);
  const [brushColor, setBrushColor] = useState('#000000');
  const [brushSize, setBrushSize] = useState(3);
  const [isPlaying, setIsPlaying] = useState(false);
  const [draggingElement, setDraggingElement] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Sincronizar panel local con prop
  useEffect(() => {
    setLocalPanel(panel);
    setHistory([panel]);
    setHistoryIndex(0);
  }, [panel]);

  // Audio URLs
  const musicTracks = {
    action: 'https://www.soundjay.com/misc/sounds/bell-ringing-05.wav',
    drama: 'https://www.soundjay.com/misc/sounds/bell-ringing-05.wav',
    comedy: 'https://www.soundjay.com/misc/sounds/bell-ringing-05.wav',
    suspense: 'https://www.soundjay.com/misc/sounds/bell-ringing-05.wav'
  };

  const soundEffects = {
    explosion: 'https://www.soundjay.com/misc/sounds/bell-ringing-05.wav',
    whoosh: 'https://www.soundjay.com/misc/sounds/bell-ringing-05.wav',
    pop: 'https://www.soundjay.com/misc/sounds/bell-ringing-05.wav',
    click: 'https://www.soundjay.com/misc/sounds/bell-ringing-05.wav'
  };

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
    const updatedPanel: Panel = {
      ...localPanel,
      elements: [...localPanel.elements, element]
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
      const updatedPanel: Panel = {
        ...localPanel,
        elements: [...localPanel.elements, newElement]
      };
      addToHistory(updatedPanel);
    }
  };

  const exportPanel = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size to presentation format (16:9)
    canvas.width = 1600;
    canvas.height = 900;

    // Clear and set background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw elements
    localPanel.elements.forEach(element => {
      drawElement(ctx, element);
    });

    // Download
    const link = document.createElement('a');
    link.download = 'panel.png';
    link.href = canvas.toDataURL();
    link.click();
  };

  const drawElement = (ctx: CanvasRenderingContext2D, element: ComicElement) => {
    ctx.save();
    
    // Scale elements to fit presentation size
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

      case 'brush':
        if (element.path && element.path.length > 0) {
          ctx.strokeStyle = element.color || '#000000';
          ctx.lineWidth = (element.strokeWidth || 2) * scaleX;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          
          ctx.beginPath();
          ctx.moveTo(element.path[0].x * scaleX, element.path[0].y * scaleY);
          element.path.forEach(point => {
            ctx.lineTo(point.x * scaleX, point.y * scaleY);
          });
          ctx.stroke();
        }
        break;
    }
    
    ctx.restore();
  };

  const handleMouseDown = (e: React.MouseEvent, elementId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedElement(elementId);
    setDraggingElement(elementId);

    const element = localPanel.elements.find(el => el.id === elementId);
    if (!element) return;

    const rect = e.currentTarget.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!draggingElement) return;

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
  };

  const handleMouseUp = () => {
    setDraggingElement(null);
  };

  const renderElement = (element: ComicElement) => {
    const isSelected = selectedElement === element.id;
    const scaleX = 800 / 1600; // Scale down for editor view
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

    switch (element.type) {
      case 'text':
        return (
          <div
            key={element.id}
            style={style}
            onClick={() => setSelectedElement(element.id)}
            onMouseDown={(e) => handleMouseDown(e, element.id)}
          >
            {element.content}
          </div>
        );
      
      case 'image':
        return (
          <img
            key={element.id}
            src={element.imageUrl}
            alt="Imagen"
            style={style}
            onClick={() => setSelectedElement(element.id)}
            onMouseDown={(e) => handleMouseDown(e, element.id)}
          />
        );
      
      case 'gif':
        return (
          <img
            key={element.id}
            src={element.gifUrl}
            alt="GIF"
            style={style}
            onClick={() => setSelectedElement(element.id)}
            onMouseDown={(e) => handleMouseDown(e, element.id)}
          />
        );
      
      case 'video':
        return (
          <video
            key={element.id}
            src={element.videoUrl}
            style={style}
            autoPlay={element.autoplay}
            loop={element.loop}
            muted={true}
            onClick={() => setSelectedElement(element.id)}
            onMouseDown={(e) => handleMouseDown(e, element.id)}
          />
        );

      case 'shape':
        return (
          <div
            key={element.id}
            style={{
              ...style,
              backgroundColor: element.color,
              borderRadius: element.shape === 'circle' ? '50%' : '0',
              border: isSelected ? '2px solid #8b5cf6' : 'none'
            }}
            onClick={() => setSelectedElement(element.id)}
            onMouseDown={(e) => handleMouseDown(e, element.id)}
          />
        );

      case 'brush':
        return (
          <svg
            key={element.id}
            style={{
              position: 'absolute',
              left: `${element.x * scaleX}px`,
              top: `${element.y * scaleY}px`,
              width: '100px',
              height: '100px',
              pointerEvents: 'auto',
              border: isSelected ? '2px solid #8b5cf6' : 'none'
            }}
            onClick={() => setSelectedElement(element.id)}
            onMouseDown={(e) => handleMouseDown(e, element.id)}
          >
            {element.path && element.path.length > 0 && (
              <path
                d={`M ${(element.path[0].x - element.x) * scaleX} ${(element.path[0].y - element.y) * scaleY} ${element.path.slice(1).map(p => `L ${(p.x - element.x) * scaleX} ${(p.y - element.y) * scaleY}`).join(' ')}`}
                stroke={element.color}
                strokeWidth={(element.strokeWidth || 2) * scaleX}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}
          </svg>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-7xl h-5/6 flex flex-col">
        {/* Header */}
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
          {/* Canvas */}
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
              {/* Grid */}
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
            
            {/* Elements */}
            {localPanel.elements
              .filter(el => el.visible !== false)
              .map(renderElement)}
          </div>
        </div>

        {/* Sidebar */}
        <div className="w-80 border-l border-gray-200 bg-white flex flex-col">
          {/* Tabs */}
          <div className="flex border-b border-gray-200 overflow-x-auto">
            {[
              { key: 'elements', icon: Layers, label: 'Elementos' },
              { key: 'animations', icon: Zap, label: 'Animaciones' },
              { key: 'transitions', icon: Move, label: 'Transiciones' },
              { key: 'audio', icon: Music, label: 'Audio' },
              { key: 'drawing', icon: Brush, label: 'Dibujo' }
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

          {/* Tab Content */}
          <div className="flex-1 p-4 overflow-y-auto">
            {activeTab === 'elements' && (
              <div className="space-y-4">
                {/* Add Elements */}
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

                {/* Elements List */}
                <div>
                  <h3 className="font-semibold text-gray-800 mb-3">
                    Elementos del Panel ({localPanel.elements.length})
                  </h3>
                  <div className="space-y-4 max-h-80 overflow-y-auto">
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

                {/* Element Properties */}
                {selectedElement && (
                  <div className="space-y-4">
                    <h4 className="font-semibold text-gray-800">Propiedades del Elemento</h4>
                    {(() => {
                      const element = localPanel.elements.find(el => el.id === selectedElement);
                      if (!element) return null;

                      return (
                        <div className="space-y-3">
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
                            <>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
                                <input
                                  type="color"
                                  value={element.color || '#000000'}
                                  onChange={(e) => updateElement(element.id, { color: e.target.value })}
                                  className="w-full h-10 border border-gray-300 rounded-lg"
                                />
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">Ancho</label>
                                  <input
                                    type="number"
                                    value={element.width || 100}
                                    onChange={(e) => updateElement(element.id, { width: Number(e.target.value) })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                    min="10"
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">Alto</label>
                                  <input
                                    type="number"
                                    value={element.height || 100}
                                    onChange={(e) => updateElement(element.id, { height: Number(e.target.value) })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                    min="10"
                                  />
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'animations' && (
              <div className="space-y-4">
                <h4 className="font-semibold text-gray-800">Animaciones del Panel</h4>
                
                {localPanel.elements.map((element) => (
                  <div key={element.id} className="p-3 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">
                        {element.type} - {element.type === 'text' ? element.content?.slice(0, 20) : element.id.slice(0, 8)}
                      </span>
                      <button
                        onClick={() => {
                          const animation = { type: 'fadeIn', duration: 1000, delay: 0, elementId: element.id };
                          const updatedPanel: Panel = {
                            ...localPanel,
                            animations: [...(localPanel.animations || []), animation]
                          };
                          addToHistory(updatedPanel);
                        }}
                        className="px-3 py-1 bg-yellow-500 text-white rounded text-xs hover:bg-yellow-600"
                      >
                        Fade In
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'transitions' && (
              <div className="space-y-4">
                <h4 className="font-semibold text-gray-800">Transiciones</h4>
                <div className="space-y-3">
                  <button
                    onClick={() => {
                      const updatedPanel: Panel = { ...localPanel, transitions: [{ type: 'fade', duration: 500 }] };
                      addToHistory(updatedPanel);
                    }}
                    className="w-full p-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                  >
                    Fade
                  </button>
                  <button
                    onClick={() => {
                      const updatedPanel: Panel = { ...localPanel, transitions: [{ type: 'slide', duration: 800, direction: 'left' }] };
                      addToHistory(updatedPanel);
                    }}
                    className="w-full p-3 bg-green-500 text-white rounded-lg hover:bg-green-600"
                  >
                    Slide
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'audio' && (
              <div className="space-y-4">
                <h4 className="font-semibold text-gray-800">Audio</h4>
                <button
                  onClick={() => {
                    const audio = { backgroundMusic: { url: musicTracks.action, volume: 0.5, loop: true } };
                    const updatedPanel: Panel = { ...localPanel, audio };
                    addToHistory(updatedPanel);
                  }}
                  className="w-full p-3 bg-red-500 text-white rounded-lg hover:bg-red-600"
                >
                  Música de Acción
                </button>
                <button
                  onClick={() => {
                    const soundEffect = { id: uuidv4(), url: soundEffects.explosion, trigger: 'onLoad', volume: 0.7 };
                    const audio = { ...panel.audio, soundEffects: [...(panel.audio?.soundEffects || []), soundEffect] };
                    const updatedPanel: Panel = { ...localPanel, audio };
                    addToHistory(updatedPanel);
                  }}
                  className="w-full p-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
                >
                  Efecto Explosión
                </button>
              </div>
            )}

            {activeTab === 'drawing' && (
              <div className="space-y-4">
                <h4 className="font-semibold text-gray-800">Herramientas de Dibujo</h4>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Color</label>
                  <input
                    type="color"
                    value={brushColor}
                    onChange={(e) => setBrushColor(e.target.value)}
                    className="w-full h-10 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Grosor: {brushSize}px
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="20"
                    value={brushSize}
                    onChange={(e) => setBrushSize(Number(e.target.value))}
                    className="w-full"
                  />
                </div>
                <div
                  className="w-full h-40 border-2 border-dashed border-gray-300 rounded-lg cursor-crosshair bg-white"
                  onMouseDown={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const point = { x: e.clientX - rect.left, y: e.clientY - rect.top };
                    const newStroke = { id: uuidv4(), points: [point], color: brushColor, width: brushSize, opacity: 1 };
                    setCurrentStroke(newStroke);
                    
                    const brushElement: ComicElement = {
                      id: uuidv4(),
                      type: 'brush',
                      x: point.x,
                      y: point.y,
                      path: [point],
                      color: brushColor,
                      strokeWidth: brushSize
                    };
                    
                    const updatedPanel: Panel = {
                      ...localPanel,
                      elements: [...localPanel.elements, brushElement]
                    };
                    addToHistory(updatedPanel);
                  }}
                  onMouseMove={(e) => {
                    if (currentStroke && isDrawing) {
                      const rect = e.currentTarget.getBoundingClientRect();
                      const point = { x: e.clientX - rect.left, y: e.clientY - rect.top };
                      const updatedStroke = { ...currentStroke, points: [...currentStroke.points, point] };
                      setCurrentStroke(updatedStroke);
                      
                      const updatedPanel: Panel = {
                        ...localPanel,
                        elements: localPanel.elements.map(el => 
                          el.id === currentStroke.id ? { ...el, path: updatedStroke.points } : el
                        )
                      };
                      addToHistory(updatedPanel);
                    }
                  }}
                  onMouseUp={() => {
                    setIsDrawing(false);
                    setCurrentStroke(null);
                  }}
                >
                  <div className="flex items-center justify-center h-full text-gray-500">
                    Área de dibujo
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        </div>

        {/* Footer */}
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