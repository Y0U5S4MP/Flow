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
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentStroke, setCurrentStroke] = useState<DrawingStroke | null>(null);
  const [drawingColor, setDrawingColor] = useState('#000000');
  const [drawingWidth, setDrawingWidth] = useState(3);
  const [isPlaying, setIsPlaying] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [showGrid, setShowGrid] = useState(false);
  const [history, setHistory] = useState<Panel[]>([panel]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [clipboard, setClipboard] = useState<ComicElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [draggedElement, setDraggedElement] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // Guardar en historial
  const saveToHistory = (newPanel: Panel) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newPanel);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const updatePanel = (updates: Partial<Panel>) => {
    const newPanel = { ...panel, ...updates };
    onPanelUpdate(newPanel);
    saveToHistory(newPanel);
  };

  const undo = () => {
    if (historyIndex > 0) {
      const prevPanel = history[historyIndex - 1];
      setHistoryIndex(historyIndex - 1);
      onPanelUpdate(prevPanel);
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      const nextPanel = history[historyIndex + 1];
      setHistoryIndex(historyIndex + 1);
      onPanelUpdate(nextPanel);
    }
  };

  // Funciones de elementos
  const addTextElement = () => {
    const newElement: ComicElement = {
      id: uuidv4(),
      type: 'text',
      x: 100 + Math.random() * 200,
      y: 100 + Math.random() * 200,
      content: 'Nuevo texto',
      fontSize: 24,
      color: '#000000',
      fontWeight: 'normal',
      fontStyle: 'normal',
      textAlign: 'left'
    };
    updatePanel({ elements: [...panel.elements, newElement] });
    setSelectedElement(newElement.id);
  };

  const addShapeElement = (shape: 'rectangle' | 'circle') => {
    const newElement: ComicElement = {
      id: uuidv4(),
      type: 'shape',
      x: 150 + Math.random() * 200,
      y: 150 + Math.random() * 200,
      width: 100,
      height: 100,
      shape,
      color: '#3b82f6',
      opacity: 1
    };
    updatePanel({ elements: [...panel.elements, newElement] });
    setSelectedElement(newElement.id);
  };

  const duplicateElement = (elementId: string) => {
    const element = panel.elements.find(el => el.id === elementId);
    if (element) {
      const newElement = { 
        ...element, 
        id: uuidv4(), 
        x: element.x + 20, 
        y: element.y + 20 
      };
      updatePanel({ elements: [...panel.elements, newElement] });
      setSelectedElement(newElement.id);
    }
  };

  const copyElement = (elementId: string) => {
    const element = panel.elements.find(el => el.id === elementId);
    if (element) {
      setClipboard(element);
    }
  };

  const pasteElement = () => {
    if (clipboard) {
      const newElement = { 
        ...clipboard, 
        id: uuidv4(), 
        x: clipboard.x + 30, 
        y: clipboard.y + 30 
      };
      updatePanel({ elements: [...panel.elements, newElement] });
      setSelectedElement(newElement.id);
    }
  };

  const updateElement = (elementId: string, updates: Partial<ComicElement>) => {
    const updatedElements = panel.elements.map(el => 
      el.id === elementId ? { ...el, ...updates } : el
    );
    updatePanel({ elements: updatedElements });
  };

  const deleteElement = (elementId: string) => {
    const updatedElements = panel.elements.filter(el => el.id !== elementId);
    updatePanel({ elements: updatedElements });
    if (selectedElement === elementId) {
      setSelectedElement(null);
    }
  };

  const toggleElementVisibility = (elementId: string) => {
    updateElement(elementId, { 
      visible: panel.elements.find(el => el.id === elementId)?.visible !== false ? false : true 
    });
  };

  // Funciones de animación
  const addAnimation = (elementId: string, type: Animation['type']) => {
    const newAnimation: Animation = {
      type,
      duration: type === 'typewriter' ? 2000 : 1000,
      delay: 0,
      easing: 'ease-in-out',
      elementId
    };
    updatePanel({ animations: [...(panel.animations || []), newAnimation] });
  };

  const addTransition = (type: Transition['type']) => {
    const newTransition: Transition = {
      type,
      duration: 500,
      direction: type === 'slide' ? 'right' : undefined
    };
    updatePanel({ transitions: [...(panel.transitions || []), newTransition] });
  };

  // Funciones de audio
  const addBackgroundMusic = (genre: string) => {
    const musicUrls = {
      action: 'https://www.soundjay.com/misc/sounds/bell-ringing-05.wav',
      drama: 'https://www.soundjay.com/misc/sounds/bell-ringing-05.wav',
      comedy: 'https://www.soundjay.com/misc/sounds/bell-ringing-05.wav',
      suspense: 'https://www.soundjay.com/misc/sounds/bell-ringing-05.wav'
    };

    const audioConfig: AudioConfig = {
      backgroundMusic: {
        url: musicUrls[genre as keyof typeof musicUrls] || musicUrls.action,
        volume: 0.5,
        loop: true
      },
      soundEffects: panel.audio?.soundEffects || []
    };
    updatePanel({ audio: audioConfig });
  };

  const addSoundEffect = (type: string) => {
    const newEffect: SoundEffect = {
      id: uuidv4(),
      url: 'https://www.soundjay.com/misc/sounds/bell-ringing-05.wav',
      trigger: 'onLoad',
      volume: 0.7
    };

    const currentEffects = panel.audio?.soundEffects || [];
    const audioConfig: AudioConfig = {
      backgroundMusic: panel.audio?.backgroundMusic || null,
      soundEffects: [...currentEffects, newEffect]
    };
    updatePanel({ audio: audioConfig });
  };

  // Funciones de dibujo
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (activeTab !== 'drawing') return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / zoom;
    const y = (e.clientY - rect.top) / zoom;

    const newStroke: DrawingStroke = {
      id: uuidv4(),
      points: [{ x, y }],
      color: drawingColor,
      width: drawingWidth,
      opacity: 1
    };

    setCurrentStroke(newStroke);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !currentStroke || activeTab !== 'drawing') return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / zoom;
    const y = (e.clientY - rect.top) / zoom;

    setCurrentStroke(prev => prev ? {
      ...prev,
      points: [...prev.points, { x, y }]
    } : null);
  };

  const stopDrawing = () => {
    if (!isDrawing || !currentStroke) return;

    const brushElement: ComicElement = {
      id: uuidv4(),
      type: 'brush',
      x: Math.min(...currentStroke.points.map(p => p.x)),
      y: Math.min(...currentStroke.points.map(p => p.y)),
      path: currentStroke.points,
      color: currentStroke.color,
      strokeWidth: currentStroke.width,
      opacity: currentStroke.opacity
    };

    updatePanel({ elements: [...panel.elements, brushElement] });
    setIsDrawing(false);
    setCurrentStroke(null);
  };

  // Subida de archivos
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const url = event.target?.result as string;
      
      let type: 'image' | 'gif' | 'video' = 'image';
      if (file.type.startsWith('video/')) type = 'video';
      else if (file.name.toLowerCase().endsWith('.gif')) type = 'gif';

      const newElement: ComicElement = {
        id: uuidv4(),
        type,
        x: 50 + Math.random() * 100,
        y: 50 + Math.random() * 100,
        width: type === 'video' ? 300 : 200,
        height: type === 'video' ? 200 : 150,
        imageUrl: type === 'image' ? url : undefined,
        gifUrl: type === 'gif' ? url : undefined,
        videoUrl: type === 'video' ? url : undefined,
        autoplay: type === 'video' ? true : undefined,
        loop: true,
        volume: type === 'video' ? 0.5 : undefined,
        opacity: 1
      };

      updatePanel({ elements: [...panel.elements, newElement] });
      setSelectedElement(newElement.id);
    };

    reader.readAsDataURL(file);
  };

  // Renderizado del canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Fondo
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Grid
    if (showGrid) {
      ctx.strokeStyle = '#e5e7eb';
      ctx.lineWidth = 1;
      const gridSize = 20;
      
      for (let x = 0; x <= canvas.width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }
      
      for (let y = 0; y <= canvas.height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }
    }

    // Elementos del panel
    panel.elements.forEach(element => {
      if (element.visible === false) return;

      ctx.save();
      ctx.globalAlpha = element.opacity || 1;
      
      switch (element.type) {
        case 'text':
          ctx.font = `${element.fontStyle || 'normal'} ${element.fontWeight || 'normal'} ${element.fontSize || 16}px Arial`;
          ctx.fillStyle = element.color || '#000000';
          ctx.textAlign = (element.textAlign as CanvasTextAlign) || 'left';
          ctx.textBaseline = 'top';
          ctx.fillText(element.content || '', element.x, element.y);
          break;
          
        case 'brush':
          if (element.path && element.path.length > 0) {
            ctx.strokeStyle = element.color || '#000000';
            ctx.lineWidth = element.strokeWidth || 2;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            
            ctx.beginPath();
            ctx.moveTo(element.path[0].x, element.path[0].y);
            element.path.forEach(point => {
              ctx.lineTo(point.x, point.y);
            });
            ctx.stroke();
          }
          break;

        case 'shape':
          ctx.fillStyle = element.color || '#000000';
          if (element.shape === 'rectangle') {
            ctx.fillRect(element.x, element.y, element.width || 50, element.height || 50);
          } else if (element.shape === 'circle') {
            ctx.beginPath();
            ctx.arc(
              element.x + (element.width || 50) / 2, 
              element.y + (element.height || 50) / 2, 
              (element.width || 50) / 2, 
              0, 2 * Math.PI
            );
            ctx.fill();
          }
          break;

        case 'image':
        case 'gif':
          if (element.imageUrl || element.gifUrl) {
            const img = document.createElement('img');
            img.onload = () => {
              ctx.drawImage(img, element.x, element.y, element.width || 200, element.height || 150);
            };
            img.src = element.imageUrl || element.gifUrl || '';
          }
          break;

        case 'video':
          ctx.fillStyle = '#000000';
          ctx.fillRect(element.x, element.y, element.width || 300, element.height || 200);
          ctx.fillStyle = '#ffffff';
          ctx.font = '16px Arial';
          ctx.textAlign = 'center';
          ctx.fillText('VIDEO', element.x + (element.width || 300) / 2, element.y + (element.height || 200) / 2);
          break;
      }
      
      // Borde de selección
      if (selectedElement === element.id) {
        ctx.strokeStyle = '#8b5cf6';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.strokeRect(
          element.x - 5, 
          element.y - 5, 
          (element.width || 100) + 10, 
          (element.height || 50) + 10
        );
        ctx.setLineDash([]);
      }
      
      ctx.restore();
    });

    // Elemento siendo arrastrado
    if (draggedElement && selectedElementData) {
      ctx.save();
      ctx.globalAlpha = 0.5;
      // Dibujar elemento en posición del mouse
      ctx.restore();
    }

    // Trazo actual
    if (currentStroke && currentStroke.points.length > 0) {
      ctx.strokeStyle = currentStroke.color;
      ctx.lineWidth = currentStroke.width;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      
      ctx.beginPath();
      ctx.moveTo(currentStroke.points[0].x, currentStroke.points[0].y);
      currentStroke.points.forEach(point => {
        ctx.lineTo(point.x, point.y);
      });
      ctx.stroke();
    }
  }, [panel.elements, selectedElement, currentStroke, showGrid, zoom]);

  // Manejo de arrastre de elementos
  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (activeTab === 'drawing') {
      startDrawing(e);
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / zoom;
    const y = (e.clientY - rect.top) / zoom;
    
    // Buscar elemento clickeado (en orden inverso para seleccionar el de arriba)
    const clickedElement = [...panel.elements].reverse().find(el => 
      x >= el.x && x <= el.x + (el.width || 100) &&
      y >= el.y && y <= el.y + (el.height || 50)
    );
    
    if (clickedElement) {
      setSelectedElement(clickedElement.id);
      setDraggedElement(clickedElement.id);
      setDragOffset({
        x: x - clickedElement.x,
        y: y - clickedElement.y
      });
    } else {
      setSelectedElement(null);
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (activeTab === 'drawing' && isDrawing) {
      draw(e);
      return;
    }

    if (draggedElement) {
      const canvas = canvasRef.current;
      if (!canvas) return;
      
      const rect = canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left) / zoom;
      const y = (e.clientY - rect.top) / zoom;
      
      updateElement(draggedElement, {
        x: x - dragOffset.x,
        y: y - dragOffset.y
      });
    }
  };

  const handleCanvasMouseUp = () => {
    if (activeTab === 'drawing') {
      stopDrawing();
    }
    setDraggedElement(null);
  };

  const selectedElementData = panel.elements.find(el => el.id === selectedElement);

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
              onClick={() => setZoom(Math.max(0.5, zoom - 0.1))}
              className="p-2 hover:bg-gray-100 rounded-lg"
              title="Alejar"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="text-sm text-gray-600">{Math.round(zoom * 100)}%</span>
            <button
              onClick={() => setZoom(Math.min(2, zoom + 0.1))}
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
          {/* Canvas Area */}
          <div className="flex-1 p-4 bg-gray-50 flex items-center justify-center">
            <div 
              className="bg-white rounded-lg shadow-lg overflow-hidden border-2 border-gray-200"
              style={{ transform: `scale(${zoom})` }}
            >
              <canvas
                ref={canvasRef}
                width={800}
                height={600}
                className={`block ${activeTab === 'drawing' ? 'cursor-crosshair' : draggedElement ? 'cursor-grabbing' : 'cursor-pointer'}`}
                onMouseDown={handleCanvasMouseDown}
                onMouseMove={handleCanvasMouseMove}
                onMouseUp={handleCanvasMouseUp}
                onMouseLeave={handleCanvasMouseUp}
              />
            </div>
          </div>

          {/* Tools Panel */}
          <div className="w-80 border-l border-gray-200 bg-white flex flex-col">
            {/* Tabs */}
            <div className="flex border-b border-gray-200 overflow-x-auto">
              {[
                { key: 'elements', icon: Layers, label: 'Elementos' },
                { key: 'animations', icon: Zap, label: 'Animaciones' },
                { key: 'transitions', icon: Move, label: 'Transiciones' },
                { key: 'audio', icon: Music, label: 'Audio' },
                { key: 'drawing', icon: Brush, label: 'Dibujo' },
                { key: 'effects', icon: Sparkles, label: 'Efectos' }
              ].map(({ key, icon: Icon, label }) => (
                <button
                  key={key}
                  onClick={() => setActiveTab(key as any)}
                  className={`flex-shrink-0 p-2 text-xs font-medium transition-colors border-b-2 ${
                    activeTab === key
                      ? 'bg-purple-100 text-purple-700 border-purple-500'
                      : 'text-gray-600 hover:text-purple-600 hover:bg-purple-50 border-transparent'
                  }`}
                >
                  <Icon className="w-4 h-4 mx-auto mb-1" />
                  <div className="whitespace-nowrap">{label}</div>
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div className="flex-1 p-4 overflow-y-auto">
              {activeTab === 'elements' && (
                <div className="space-y-4">
                  {/* Herramientas de creación */}
                  <div>
                    <h3 className="font-semibold text-gray-800 mb-3">Agregar Elementos</h3>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={addTextElement}
                        className="p-3 border border-gray-200 rounded-lg hover:border-purple-300 hover:bg-purple-50 transition-all text-center"
                      >
                        <Type className="w-5 h-5 mx-auto mb-1 text-purple-600" />
                        <span className="text-xs">Texto</span>
                      </button>
                      
                      <button
                        onClick={() => addShapeElement('rectangle')}
                        className="p-3 border border-gray-200 rounded-lg hover:border-purple-300 hover:bg-purple-50 transition-all text-center"
                      >
                        <Square className="w-5 h-5 mx-auto mb-1 text-purple-600" />
                        <span className="text-xs">Rectángulo</span>
                      </button>
                      
                      <button
                        onClick={() => addShapeElement('circle')}
                        className="p-3 border border-gray-200 rounded-lg hover:border-purple-300 hover:bg-purple-50 transition-all text-center"
                      >
                        <Circle className="w-5 h-5 mx-auto mb-1 text-purple-600" />
                        <span className="text-xs">Círculo</span>
                      </button>
                      
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="p-3 border border-gray-200 rounded-lg hover:border-purple-300 hover:bg-purple-50 transition-all text-center"
                      >
                        <ImageIcon className="w-5 h-5 mx-auto mb-1 text-purple-600" />
                        <span className="text-xs">Imagen</span>
                      </button>
                    </div>
                    
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*,.gif,video/mp4"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </div>

                  {/* Lista de elementos */}
                  <div>
                    <h3 className="font-semibold text-gray-800 mb-3">
                      Elementos del Panel ({panel.elements.length})
                    </h3>
                    <div className="space-y-2">
                      {panel.elements.map(element => (
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
                              {element.type} {element.type === 'text' ? `- ${element.content?.slice(0, 15)}...` : ''}
                            </span>
                            <div className="flex space-x-1">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  copyElement(element.id);
                                }}
                                className="p-1 hover:bg-gray-100 rounded"
                                title="Copiar"
                              >
                                <Copy className="w-3 h-3 text-gray-500" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleElementVisibility(element.id);
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
                          
                          {/* Propiedades del elemento seleccionado */}
                          {selectedElement === element.id && (
                            <div className="space-y-2 pt-2 border-t border-gray-100">
                              {element.type === 'text' && (
                                <>
                                  <input
                                    type="text"
                                    value={element.content || ''}
                                    onChange={(e) => updateElement(element.id, { content: e.target.value })}
                                    className="w-full px-2 py-1 text-xs border border-gray-300 rounded"
                                    placeholder="Texto..."
                                  />
                                  <div className="flex space-x-1">
                                    <input
                                      type="color"
                                      value={element.color || '#000000'}
                                      onChange={(e) => updateElement(element.id, { color: e.target.value })}
                                      className="w-8 h-6 border border-gray-300 rounded"
                                    />
                                    <input
                                      type="number"
                                      value={element.fontSize || 16}
                                      onChange={(e) => updateElement(element.id, { fontSize: Number(e.target.value) })}
                                      className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded"
                                      min="8"
                                      max="72"
                                    />
                                  </div>
                                  <div className="flex space-x-1">
                                    <button
                                      onClick={() => updateElement(element.id, { 
                                        fontWeight: element.fontWeight === 'bold' ? 'normal' : 'bold' 
                                      })}
                                      className={`p-1 rounded text-xs ${
                                        element.fontWeight === 'bold' ? 'bg-purple-100 text-purple-600' : 'hover:bg-gray-100'
                                      }`}
                                    >
                                      <Bold className="w-3 h-3" />
                                    </button>
                                    <button
                                      onClick={() => updateElement(element.id, { 
                                        fontStyle: element.fontStyle === 'italic' ? 'normal' : 'italic' 
                                      })}
                                      className={`p-1 rounded text-xs ${
                                        element.fontStyle === 'italic' ? 'bg-purple-100 text-purple-600' : 'hover:bg-gray-100'
                                      }`}
                                    >
                                      <Italic className="w-3 h-3" />
                                    </button>
                                  </div>
                                </>
                              )}
                              
                              {(element.type === 'shape' || element.type === 'brush') && (
                                <div className="flex space-x-2">
                                  <input
                                    type="color"
                                    value={element.color || '#000000'}
                                    onChange={(e) => updateElement(element.id, { color: e.target.value })}
                                    className="w-8 h-6 border border-gray-300 rounded"
                                  />
                                  <input
                                    type="range"
                                    min="0"
                                    max="1"
                                    step="0.1"
                                    value={element.opacity || 1}
                                    onChange={(e) => updateElement(element.id, { opacity: Number(e.target.value) })}
                                    className="flex-1"
                                  />
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'animations' && (
                <div className="space-y-4">
                  <h3 className="font-semibold text-gray-800">Animaciones</h3>
                  {selectedElement ? (
                    <div className="space-y-3">
                      <p className="text-sm text-gray-600">
                        Elemento seleccionado: {selectedElementData?.type}
                      </p>
                      {['fadeIn', 'slideIn', 'rotateIn', 'bounce', 'typewriter'].map(type => (
                        <button
                          key={type}
                          onClick={() => addAnimation(selectedElement, type as Animation['type'])}
                          className="w-full p-3 text-left border border-gray-200 rounded-lg hover:border-purple-300 hover:bg-purple-50 transition-all"
                        >
                          <div className="font-medium capitalize">{type}</div>
                          <div className="text-xs text-gray-500">
                            {type === 'fadeIn' && 'Aparece gradualmente'}
                            {type === 'slideIn' && 'Se desliza desde un lado'}
                            {type === 'rotateIn' && 'Gira mientras aparece'}
                            {type === 'bounce' && 'Rebota al aparecer'}
                            {type === 'typewriter' && 'Texto que se escribe'}
                          </div>
                        </button>
                      ))}
                      
                      {/* Lista de animaciones aplicadas */}
                      {panel.animations && panel.animations.filter(anim => anim.elementId === selectedElement).length > 0 && (
                        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                          <h4 className="text-sm font-medium text-blue-800 mb-2">Animaciones aplicadas:</h4>
                          {panel.animations.filter(anim => anim.elementId === selectedElement).map((anim, index) => (
                            <div key={index} className="text-xs text-blue-700">
                              • {anim.type} ({anim.duration}ms)
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">Selecciona un elemento para añadir animaciones</p>
                  )}
                </div>
              )}

              {activeTab === 'transitions' && (
                <div className="space-y-4">
                  <h3 className="font-semibold text-gray-800">Transiciones entre Paneles</h3>
                  {['fade', 'slide', 'zoom', 'flip'].map(type => (
                    <button
                      key={type}
                      onClick={() => addTransition(type as Transition['type'])}
                      className="w-full p-3 text-left border border-gray-200 rounded-lg hover:border-purple-300 hover:bg-purple-50 transition-all"
                    >
                      <div className="font-medium capitalize">{type}</div>
                      <div className="text-xs text-gray-500">
                        {type === 'fade' && 'Desvanecimiento suave'}
                        {type === 'slide' && 'Deslizamiento lateral'}
                        {type === 'zoom' && 'Acercamiento/alejamiento'}
                        {type === 'flip' && 'Volteo 3D'}
                      </div>
                    </button>
                  ))}
                  
                  {/* Lista de transiciones aplicadas */}
                  {panel.transitions && panel.transitions.length > 0 && (
                    <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                      <h4 className="text-sm font-medium text-green-800 mb-2">Transiciones aplicadas:</h4>
                      {panel.transitions.map((trans, index) => (
                        <div key={index} className="text-xs text-green-700">
                          • {trans.type} ({trans.duration}ms)
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'audio' && (
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold text-gray-800 mb-3">Música de Fondo</h3>
                    <div className="grid grid-cols-2 gap-2">
                      {['action', 'drama', 'comedy', 'suspense'].map(genre => (
                        <button
                          key={genre}
                          onClick={() => addBackgroundMusic(genre)}
                          className="p-3 text-left border border-gray-200 rounded-lg hover:border-purple-300 hover:bg-purple-50 transition-all"
                        >
                          <div className="font-medium capitalize text-sm">{genre}</div>
                        </button>
                      ))}
                    </div>
                    
                    {panel.audio?.backgroundMusic && (
                      <div className="mt-3 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-purple-800">Música activa</span>
                          <div className="flex items-center space-x-2">
                            <Volume2 className="w-4 h-4 text-purple-600" />
                            <input
                              type="range"
                              min="0"
                              max="1"
                              step="0.1"
                              value={panel.audio.backgroundMusic.volume}
                              onChange={(e) => {
                                const newAudio = { ...panel.audio! };
                                newAudio.backgroundMusic!.volume = Number(e.target.value);
                                updatePanel({ audio: newAudio });
                              }}
                              className="w-16"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div>
                    <h3 className="font-semibold text-gray-800 mb-3">Efectos de Sonido</h3>
                    <div className="grid grid-cols-2 gap-2">
                      {['explosion', 'whoosh', 'pop', 'click'].map(effect => (
                        <button
                          key={effect}
                          onClick={() => addSoundEffect(effect)}
                          className="p-3 text-left border border-gray-200 rounded-lg hover:border-purple-300 hover:bg-purple-50 transition-all"
                        >
                          <div className="font-medium capitalize text-sm">{effect}</div>
                        </button>
                      ))}
                    </div>
                    
                    {panel.audio?.soundEffects && panel.audio.soundEffects.length > 0 && (
                      <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <h4 className="text-sm font-medium text-yellow-800 mb-2">
                          Efectos aplicados ({panel.audio.soundEffects.length}):
                        </h4>
                        {panel.audio.soundEffects.map((effect, index) => (
                          <div key={index} className="text-xs text-yellow-700">
                            • Efecto {index + 1} (Vol: {Math.round(effect.volume * 100)}%)
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'drawing' && (
                <div className="space-y-4">
                  <h3 className="font-semibold text-gray-800">Herramientas de Dibujo</h3>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Color</label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="color"
                        value={drawingColor}
                        onChange={(e) => setDrawingColor(e.target.value)}
                        className="w-12 h-8 rounded-lg border border-gray-300"
                      />
                      <div className="flex space-x-1">
                        {['#000000', '#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff'].map(color => (
                          <button
                            key={color}
                            onClick={() => setDrawingColor(color)}
                            className="w-6 h-6 rounded border border-gray-300"
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Grosor: {drawingWidth}px
                    </label>
                    <input
                      type="range"
                      min="1"
                      max="20"
                      value={drawingWidth}
                      onChange={(e) => setDrawingWidth(Number(e.target.value))}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>Fino</span>
                      <span>Grueso</span>
                    </div>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <p className="text-blue-800 text-sm">
                      <strong>💡 Consejo:</strong> Haz clic y arrastra en el canvas para dibujar. 
                      Los trazos se convertirán automáticamente en elementos del panel.
                    </p>
                  </div>
                </div>
              )}

              {activeTab === 'effects' && (
                <div className="space-y-4">
                  <h3 className="font-semibold text-gray-800">Efectos Especiales</h3>
                  
                  {selectedElement && selectedElementData && (
                    <div className="space-y-3">
                      <p className="text-sm text-gray-600">
                        Aplicar efectos a: {selectedElementData.type}
                      </p>
                      
                      {/* Filtros para imágenes y videos */}
                      {(selectedElementData.type === 'image' || selectedElementData.type === 'gif' || selectedElementData.type === 'video') && (
                        <div className="space-y-3">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Brillo: {Math.round((selectedElementData.filters?.find(f => f.type === 'brightness')?.value || 1) * 100)}%
                            </label>
                            <input
                              type="range"
                              min="0"
                              max="2"
                              step="0.1"
                              value={selectedElementData.filters?.find(f => f.type === 'brightness')?.value || 1}
                              onChange={(e) => {
                                const filters = selectedElementData.filters || [];
                                const newFilters = filters.filter(f => f.type !== 'brightness');
                                newFilters.push({ type: 'brightness', value: Number(e.target.value) });
                                updateElement(selectedElement, { filters: newFilters });
                              }}
                              className="w-full"
                            />
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Contraste: {Math.round((selectedElementData.filters?.find(f => f.type === 'contrast')?.value || 1) * 100)}%
                            </label>
                            <input
                              type="range"
                              min="0"
                              max="2"
                              step="0.1"
                              value={selectedElementData.filters?.find(f => f.type === 'contrast')?.value || 1}
                              onChange={(e) => {
                                const filters = selectedElementData.filters || [];
                                const newFilters = filters.filter(f => f.type !== 'contrast');
                                newFilters.push({ type: 'contrast', value: Number(e.target.value) });
                                updateElement(selectedElement, { filters: newFilters });
                              }}
                              className="w-full"
                            />
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Saturación: {Math.round((selectedElementData.filters?.find(f => f.type === 'saturation')?.value || 1) * 100)}%
                            </label>
                            <input
                              type="range"
                              min="0"
                              max="2"
                              step="0.1"
                              value={selectedElementData.filters?.find(f => f.type === 'saturation')?.value || 1}
                              onChange={(e) => {
                                const filters = selectedElementData.filters || [];
                                const newFilters = filters.filter(f => f.type !== 'saturation');
                                newFilters.push({ type: 'saturation', value: Number(e.target.value) });
                                updateElement(selectedElement, { filters: newFilters });
                              }}
                              className="w-full"
                            />
                          </div>
                        </div>
                      )}
                      
                      {/* Efectos rápidos */}
                      <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-2">Efectos Rápidos</h4>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            onClick={() => {
                              const filters = [
                                { type: 'sepia' as const, value: 1 },
                                { type: 'brightness' as const, value: 1.1 }
                              ];
                              updateElement(selectedElement, { filters });
                            }}
                            className="p-2 text-xs border border-gray-200 rounded-lg hover:border-purple-300 hover:bg-purple-50"
                          >
                            Vintage
                          </button>
                          <button
                            onClick={() => {
                              const filters = [{ type: 'grayscale' as const, value: 1 }];
                              updateElement(selectedElement, { filters });
                            }}
                            className="p-2 text-xs border border-gray-200 rounded-lg hover:border-purple-300 hover:bg-purple-50"
                          >
                            B&N
                          </button>
                          <button
                            onClick={() => {
                              const filters = [{ type: 'blur' as const, value: 3 }];
                              updateElement(selectedElement, { filters });
                            }}
                            className="p-2 text-xs border border-gray-200 rounded-lg hover:border-purple-300 hover:bg-purple-50"
                          >
                            Desenfoque
                          </button>
                          <button
                            onClick={() => {
                              updateElement(selectedElement, { filters: [] });
                            }}
                            className="p-2 text-xs border border-gray-200 rounded-lg hover:border-red-300 hover:bg-red-50"
                          >
                            Limpiar
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {!selectedElement && (
                    <p className="text-sm text-gray-500">Selecciona un elemento para aplicar efectos</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                <span>Vista Previa</span>
              </button>
              
              <div className="text-sm text-gray-600">
                {panel.elements.length} elemento{panel.elements.length !== 1 ? 's' : ''} • 
                {panel.animations?.length || 0} animación{(panel.animations?.length || 0) !== 1 ? 'es' : ''} • 
                {panel.transitions?.length || 0} transición{(panel.transitions?.length || 0) !== 1 ? 'es' : ''}
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <button
                onClick={() => {
                  // Exportar panel como imagen
                  const canvas = canvasRef.current;
                  if (canvas) {
                    const link = document.createElement('a');
                    link.download = 'panel.png';
                    link.href = canvas.toDataURL();
                    link.click();
                  }
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center space-x-2"
              >
                <Download className="w-4 h-4" />
                <span>Exportar</span>
              </button>
              
              <button
                onClick={onClose}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
              >
                Guardar Cambios
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdvancedPanelEditor;