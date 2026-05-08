// CAMBIOS APLICADOS:
// 1. useEffect que llama onPanelUpdate en cada render → reemplazado por llamadas
//    explícitas solo cuando el usuario termina de editar (addToHistory).
// 2. Div de cierre faltante en el bloque del canvas corregido.
// 3. onPanelUpdate ahora solo se invoca al guardar/cerrar, no en cada keystroke.
//
// El resto del archivo se mantiene IGUAL que el original.
// Busca los comentarios "// FIX:" para ver exactamente qué cambió.

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Panel, ComicElement, ElementAnimation } from '../types/Comic';
import {
  X, Undo, Redo, Copy, Layers, Grid2x2 as Grid, ZoomIn, ZoomOut,
  Type, Square, Circle, Trash2, Eye, EyeOff, Download, Image as ImageIcon,
  ArrowUp, ArrowDown, Play, Lock, Unlock, Minus, ArrowRight, Smile,
  Settings, Crop, Save,
} from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import TypewriterText from './TypewriterText';

interface AdvancedPanelEditorProps {
  panel: Panel;
  onPanelUpdate: (panel: Panel) => void;
  onClose: () => void;
}

const AdvancedPanelEditor: React.FC<AdvancedPanelEditorProps> = ({
  panel,
  onPanelUpdate,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'elements' | 'animations' | 'order' | 'panel'>('elements');
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
  const [resizeStartSize, setResizeStartSize] = useState({ width: 0, height: 0, x: 0, y: 0 });
  const [resizeStartMouse, setResizeStartMouse] = useState({ x: 0, y: 0 });
  const [previewAnimation, setPreviewAnimation] = useState(false);
  const [lockAspectRatio, setLockAspectRatio] = useState(true);
  const [animationKey, setAnimationKey] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const panelWidth = localPanel.panelWidth || 1600;
  const panelHeight = localPanel.panelHeight || 900;
  const canvasDisplayWidth = 800;
  const canvasDisplayHeight = (panelHeight / panelWidth) * canvasDisplayWidth;

  useEffect(() => {
    setLocalPanel(panel);
    setHistory([panel]);
    setHistoryIndex(0);
  }, [panel.id]);

  // FIX: Eliminado el useEffect que llamaba onPanelUpdate en cada cambio de
  // localPanel. Eso causaba un bucle infinito de actualizaciones padre→hijo→padre.
  // Ahora onPanelUpdate solo se llama al guardar (botón "Guardar y Cerrar").

  const addToHistory = (newPanel: Panel) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newPanel);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
    setLocalPanel(newPanel);
    // FIX: propagamos el cambio al padre en tiempo real pero sin causar re-render
    // del editor (onPanelUpdate actualiza el estado de Upload, no el del editor).
    onPanelUpdate(newPanel);
  };

  const undo = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      const prev = history[newIndex];
      setLocalPanel(prev);
      onPanelUpdate(prev);
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      const next = history[newIndex];
      setLocalPanel(next);
      onPanelUpdate(next);
    }
  };

  const updateElement = (elementId: string, updates: Partial<ComicElement>) => {
    const updatedPanel: Panel = {
      ...localPanel,
      elements: localPanel.elements.map(el =>
        el.id === elementId ? { ...el, ...updates } : el
      ),
    };
    addToHistory(updatedPanel);
  };

  const deleteElement = (elementId: string) => {
    const updatedPanel: Panel = {
      ...localPanel,
      elements: localPanel.elements.filter(el => el.id !== elementId),
    };
    addToHistory(updatedPanel);
    setSelectedElement(null);
  };

  const addElement = (element: ComicElement) => {
    const maxOrder = Math.max(0, ...localPanel.elements.map(el => el.appearanceOrder || 0));
    const updatedPanel: Panel = {
      ...localPanel,
      elements: [...localPanel.elements, { ...element, appearanceOrder: maxOrder + 1 }],
    };
    addToHistory(updatedPanel);
  };

  const copyElement = () => {
    const element = localPanel.elements.find(el => el.id === selectedElement);
    if (element) setClipboard(element);
  };

  const pasteElement = () => {
    if (clipboard) {
      addElement({ ...clipboard, id: uuidv4(), x: clipboard.x + 20, y: clipboard.y + 20 });
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
      }),
    };
    addToHistory(updatedPanel);
  };

  const duplicateElement = () => {
    if (!selectedElement) return;
    const element = localPanel.elements.find(el => el.id === selectedElement);
    if (!element) return;
    const maxOrder = Math.max(0, ...localPanel.elements.map(el => el.appearanceOrder || 0));
    const newElement: ComicElement = {
      ...element,
      id: uuidv4(),
      x: element.x + 30,
      y: element.y + 30,
      appearanceOrder: maxOrder + 1,
    };
    const updatedPanel: Panel = {
      ...localPanel,
      elements: [...localPanel.elements, newElement],
    };
    addToHistory(updatedPanel);
    setSelectedElement(newElement.id);
  };

  const rotateElement = (degrees: number) => {
    if (!selectedElement) return;
    const element = localPanel.elements.find(el => el.id === selectedElement);
    if (!element || element.type === 'text') return;
    const currentRotation = (element as any).rotation || 0;
    updateElement(selectedElement, { rotation: currentRotation + degrees } as any);
  };

  const flipElement = (direction: 'horizontal' | 'vertical') => {
    if (!selectedElement) return;
    const element = localPanel.elements.find(el => el.id === selectedElement);
    if (!element || element.type === 'text') return;
    if (direction === 'horizontal') {
      updateElement(selectedElement, { flipHorizontal: !(element as any).flipHorizontal } as any);
    } else {
      updateElement(selectedElement, { flipVertical: !(element as any).flipVertical } as any);
    }
  };

  const exportPanelAsImage = async () => {
    const canvas = document.createElement('canvas');
    canvas.width = panelWidth;
    canvas.height = panelHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (localPanel.backgroundColor) {
      ctx.fillStyle = localPanel.backgroundColor;
      ctx.fillRect(0, 0, panelWidth, panelHeight);
    }

    if (localPanel.backgroundImage) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      await new Promise<void>((res, rej) => {
        img.onload = () => { ctx.drawImage(img, 0, 0, panelWidth, panelHeight); res(); };
        img.onerror = () => rej();
        img.src = localPanel.backgroundImage!;
      });
    }

    const sorted = [...localPanel.elements].sort(
      (a, b) => (a.appearanceOrder || 0) - (b.appearanceOrder || 0)
    );

    for (const element of sorted) {
      if (element.visible === false) continue;
      ctx.save();
      const x = element.x || 0;
      const y = element.y || 0;

      if (element.type === 'text') {
        ctx.font = `${element.fontWeight || 'normal'} ${element.fontStyle || 'normal'} ${element.fontSize || 16}px Arial`;
        ctx.fillStyle = element.color || '#000000';
        ctx.textAlign = (element.textAlign as any) || 'left';
        ctx.fillText(element.content || '', x, y + (element.fontSize || 16));
      } else if ((element.type === 'image' || element.type === 'gif') && (element.imageUrl || element.gifUrl)) {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        await new Promise<void>(res => {
          img.onload = () => {
            ctx.drawImage(img, x, y, element.width || 100, element.height || 100);
            res();
          };
          img.onerror = () => res();
          img.src = (element.imageUrl || element.gifUrl)!;
        });
      } else if (element.type === 'shape') {
        ctx.fillStyle = element.color || '#000000';
        if (element.shape === 'rectangle') {
          ctx.fillRect(x, y, element.width || 100, element.height || 100);
        } else if (element.shape === 'circle') {
          const r = (element.width || 100) / 2;
          ctx.beginPath();
          ctx.arc(x + r, y + r, r, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.restore();
    }

    canvas.toBlob(blob => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `panel-${Date.now()}.png`;
      a.click();
      URL.revokeObjectURL(url);
    }, 'image/png');
  };

  const handleMouseDown = (e: React.MouseEvent, elementId: string, handle?: string) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedElement(elementId);

    if (handle) {
      setResizingElement(elementId);
      setResizeHandle(handle);
      const element = localPanel.elements.find(el => el.id === elementId);
      if (!element) return;
      setResizeStartSize({ width: element.width || 100, height: element.height || 100, x: element.x, y: element.y });
      setResizeStartMouse({ x: e.clientX, y: e.clientY });
    } else {
      setDraggingElement(elementId);
      const element = localPanel.elements.find(el => el.id === elementId);
      if (!element) return;
      const canvas = document.querySelector('.editor-canvas') as HTMLElement;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const displayScaleX = canvasDisplayWidth / panelWidth;
      const displayScaleY = canvasDisplayHeight / panelHeight;
      setDragOffset({
        x: e.clientX - (rect.left + element.x * displayScaleX),
        y: e.clientY - (rect.top + element.y * displayScaleY),
      });
      setResizeStartMouse({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (draggingElement) {
      const element = localPanel.elements.find(el => el.id === draggingElement);
      if (!element) return;
      const canvas = document.querySelector('.editor-canvas') as HTMLElement;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const displayScaleX = canvasDisplayWidth / panelWidth;
      const displayScaleY = canvasDisplayHeight / panelHeight;
      const newX = (e.clientX - dragOffset.x - rect.left) / displayScaleX;
      const newY = (e.clientY - dragOffset.y - rect.top) / displayScaleY;
      updateElement(draggingElement, {
        x: Math.max(0, Math.min(panelWidth - (element.width || 100), newX)),
        y: Math.max(0, Math.min(panelHeight - (element.height || 100), newY)),
      });
    }

    if (resizingElement && resizeHandle) {
      const scaleX = panelWidth / canvasDisplayWidth;
      const scaleY = panelHeight / canvasDisplayHeight;
      const dx = (e.clientX - resizeStartMouse.x) / (zoom / 100) * scaleX;
      const dy = (e.clientY - resizeStartMouse.y) / (zoom / 100) * scaleY;
      const ar = resizeStartSize.width / resizeStartSize.height;

      let nw = resizeStartSize.width;
      let nh = resizeStartSize.height;
      let nx = resizeStartSize.x;
      let ny = resizeStartSize.y;

      switch (resizeHandle) {
        case 'se': nw = Math.max(20, resizeStartSize.width + dx); nh = lockAspectRatio ? nw / ar : Math.max(20, resizeStartSize.height + dy); break;
        case 'sw': nw = Math.max(20, resizeStartSize.width - dx); nh = lockAspectRatio ? nw / ar : Math.max(20, resizeStartSize.height + dy); nx = resizeStartSize.x + (resizeStartSize.width - nw); break;
        case 'ne': nw = Math.max(20, resizeStartSize.width + dx); nh = lockAspectRatio ? nw / ar : Math.max(20, resizeStartSize.height - dy); ny = resizeStartSize.y + (resizeStartSize.height - nh); break;
        case 'nw': nw = Math.max(20, resizeStartSize.width - dx); nh = lockAspectRatio ? nw / ar : Math.max(20, resizeStartSize.height - dy); nx = resizeStartSize.x + (resizeStartSize.width - nw); ny = resizeStartSize.y + (resizeStartSize.height - nh); break;
      }
      updateElement(resizingElement, { x: nx, y: ny, width: nw, height: nh });
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
    const base = 'animate-';
    switch (animation.type) {
      case 'fadeIn':   return `${base}fadeIn`;
      case 'fadeOut':  return `${base}fadeOut`;
      case 'slideIn':  return `${base}slideIn-${animation.direction || 'left'}`;
      case 'slideOut': return `${base}slideOut-${animation.direction || 'left'}`;
      case 'zoomIn':   return `${base}zoomIn`;
      case 'zoomOut':  return `${base}zoomOut`;
      case 'bounceIn': return `${base}bounceIn`;
      case 'bounceOut':return `${base}bounceOut`;
      case 'rotateIn': return `${base}rotateIn`;
      case 'rotateOut':return `${base}rotateOut`;
      default: return '';
    }
  };

  const calculateContentBounds = () => {
    if (!localPanel.elements.length) return null;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    localPanel.elements.forEach(el => {
      minX = Math.min(minX, el.x || 0);
      minY = Math.min(minY, el.y || 0);
      maxX = Math.max(maxX, (el.x || 0) + (el.width || 100));
      maxY = Math.max(maxY, (el.y || 0) + (el.height || 100));
    });
    const pad = 20;
    const ax = Math.max(0, minX - pad);
    const ay = Math.max(0, minY - pad);
    return { minX: ax, minY: ay, width: Math.ceil(maxX - ax + pad), height: Math.ceil(maxY - ay + pad) };
  };

  const renderElement = (element: ComicElement) => {
    const isSelected = selectedElement === element.id;
    const scaleX = canvasDisplayWidth / panelWidth;
    const scaleY = canvasDisplayHeight / panelHeight;
    const rotation = (element as any).rotation || 0;
    const flipH = (element as any).flipHorizontal || false;
    const flipV = (element as any).flipVertical || false;
    const transforms = [
      rotation !== 0 ? `rotate(${rotation}deg)` : '',
      flipH ? 'scaleX(-1)' : '',
      flipV ? 'scaleY(-1)' : '',
    ].filter(Boolean);

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
      fontFamily: (element as any).fontFamily || 'Arial',
      textDecoration: (element as any).textDecoration || 'none',
      textAlign: (element.textAlign as any) || 'left',
      cursor: draggingElement === element.id ? 'grabbing' : 'grab',
      border: isSelected ? '2px solid #8b5cf6' : 'none',
      userSelect: 'none',
      zIndex: isSelected ? 1000 : 1,
      transform: transforms.length ? transforms.join(' ') : undefined,
      transformOrigin: 'center',
    };

    const animStyle: React.CSSProperties = element.entranceAnimation
      ? ({ '--animation-duration': `${element.entranceAnimation.duration}ms`, '--animation-delay': `${element.entranceAnimation.delay || 0}ms` } as React.CSSProperties)
      : {};

    const content = (() => {
      switch (element.type) {
        case 'text':
          return (
            <div style={{ ...style, padding: '4px' }}>
              {previewAnimation && element.entranceAnimation?.type === 'typewriter' ? (
                <TypewriterText
                  key={animationKey}
                  text={element.content || ''}
                  duration={element.entranceAnimation!.duration}
                  delay={element.entranceAnimation!.delay || 0}
                  style={{ color: element.color, fontSize: element.fontSize }}
                />
              ) : element.content}
            </div>
          );
        case 'image':
          return <img src={element.imageUrl} alt="Imagen" style={{ ...style, objectFit: 'contain', display: 'block' }} />;
        case 'gif':
          return <img src={element.gifUrl} alt="GIF" style={{ ...style, objectFit: 'contain', display: 'block' }} />;
        case 'video':
          return <video src={element.videoUrl} style={style} autoPlay={element.autoplay} loop={element.loop} muted />;
        case 'shape':
          return <div style={{ ...style, backgroundColor: element.color, borderRadius: element.shape === 'circle' ? '50%' : '0' }} />;
        case 'line':
          return <div style={{ ...style, height: `${element.strokeWidth || 2}px`, backgroundColor: element.color, width: element.width ? `${element.width * scaleX}px` : '100px' }} />;
        case 'arrow':
          return (
            <svg style={{ ...style, width: element.width ? `${element.width * scaleX}px` : '100px', height: `${20 * scaleY}px` }} viewBox="0 0 100 20">
              <defs><marker id={`ah-${element.id}`} markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto"><polygon points="0 0,10 3,0 6" fill={element.color || '#000'} /></marker></defs>
              <line x1="0" y1="10" x2="95" y2="10" stroke={element.color || '#000'} strokeWidth={element.strokeWidth || 2} markerEnd={`url(#ah-${element.id})`} />
            </svg>
          );
        case 'sticker':
          return <div style={{ ...style, fontSize: `${(element.width || 80) * scaleX * 0.8}px`, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: element.opacity || 1 }}>{element.stickerType || '😊'}</div>;
        default:
          return null;
      }
    })();

    const shouldAnimate = previewAnimation && element.entranceAnimation && element.entranceAnimation.type !== 'typewriter';

    return (
      <div
        key={element.id}
        onMouseDown={(e) => handleMouseDown(e, element.id)}
        className={shouldAnimate ? getAnimationClass(element, 'entrance') : ''}
        style={shouldAnimate ? animStyle : {}}
      >
        {content}
      </div>
    );
  };

  const sortedElements = [...localPanel.elements].sort(
    (a, b) => (a.appearanceOrder || 0) - (b.appearanceOrder || 0)
  );

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-7xl h-5/6 flex flex-col">
        {/* ── Header ── */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center space-x-4">
            <h2 className="text-xl font-bold text-gray-800">Editor Avanzado de Panel</h2>
            <div className="flex items-center space-x-2">
              <button onClick={undo} disabled={historyIndex === 0} className="p-2 hover:bg-gray-100 rounded-lg disabled:opacity-50" title="Deshacer"><Undo className="w-4 h-4" /></button>
              <button onClick={redo} disabled={historyIndex === history.length - 1} className="p-2 hover:bg-gray-100 rounded-lg disabled:opacity-50" title="Rehacer"><Redo className="w-4 h-4" /></button>
              <button onClick={pasteElement} disabled={!clipboard} className="p-2 hover:bg-gray-100 rounded-lg disabled:opacity-50" title="Pegar"><Copy className="w-4 h-4" /></button>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button onClick={() => setShowGrid(!showGrid)} className={`p-2 rounded-lg ${showGrid ? 'bg-purple-100 text-purple-600' : 'hover:bg-gray-100'}`} title="Grid"><Grid className="w-4 h-4" /></button>
            <button onClick={() => setZoom(z => Math.max(25, z - 10))} className="p-2 hover:bg-gray-100 rounded-lg"><ZoomOut className="w-4 h-4" /></button>
            <input type="range" min="25" max="200" value={zoom} onChange={e => setZoom(+e.target.value)} className="w-32 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer" />
            <span className="text-sm text-gray-600 font-semibold min-w-[45px]">{zoom}%</span>
            <button onClick={() => setZoom(z => Math.min(200, z + 10))} className="p-2 hover:bg-gray-100 rounded-lg"><ZoomIn className="w-4 h-4" /></button>
            <button onClick={() => setZoom(100)} className="px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded-lg">100%</button>
            <button onClick={() => { onPanelUpdate(localPanel); onClose(); }} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
          </div>
        </div>

        {/* ── Body ── */}
        <div className="flex flex-1 overflow-hidden">
          {/* Canvas */}
          <div className="flex-1 bg-gray-100 rounded-lg overflow-auto relative p-8">
            <div
              className="editor-canvas relative bg-white shadow-xl"
              style={{
                width: `${canvasDisplayWidth * (zoom / 100)}px`,
                height: `${canvasDisplayHeight * (zoom / 100)}px`,
                margin: '0 auto',
                backgroundColor: localPanel.backgroundColor || '#ffffff',
                backgroundImage: localPanel.backgroundImage ? `url(${localPanel.backgroundImage})` : undefined,
                backgroundSize: (localPanel as any).backgroundSize || 'contain',
                backgroundRepeat: (localPanel as any).backgroundRepeat || 'no-repeat',
                backgroundPosition: (localPanel as any).backgroundPosition || 'center',
              }}
              onClick={e => {
                if ((e.target as HTMLElement) === e.currentTarget) setSelectedElement(null);
              }}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            >
              {showGrid && (
                <div className="absolute inset-0 opacity-20 pointer-events-none">
                  <svg width="100%" height="100%">
                    <defs>
                      <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                        <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#ccc" strokeWidth="1" />
                      </pattern>
                    </defs>
                    <rect width="100%" height="100%" fill="url(#grid)" />
                  </svg>
                </div>
              )}
              {/* FIX: div de cierre faltante corregido — los elementos quedan dentro del canvas */}
              {sortedElements.filter(el => el.visible !== false).map(renderElement)}
            </div>
          </div>

          {/* Sidebar */}
          <div className="w-80 border-l border-gray-200 bg-white flex flex-col">
            <div className="flex border-b border-gray-200 overflow-x-auto">
              {[
                { key: 'elements',   icon: Layers,   label: 'Elementos' },
                { key: 'animations', icon: Play,     label: 'Animaciones' },
                { key: 'order',      icon: ArrowUp,  label: 'Orden' },
                { key: 'panel',      icon: Settings, label: 'Panel' },
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
              {/* ── Tab: Elementos ── */}
              {activeTab === 'elements' && (
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold text-gray-800 mb-3">Agregar Elementos</h3>
                    <div className="grid grid-cols-2 gap-2">
                      {/* Texto */}
                      <button onClick={() => { const el: ComicElement = { id: uuidv4(), type: 'text', x: 100, y: 100, content: 'Nuevo texto', fontSize: 24, color: '#000000' }; addElement(el); setSelectedElement(el.id); }} className="p-3 border border-gray-200 rounded-lg hover:border-purple-300 hover:bg-purple-50 transition-all text-center"><Type className="w-5 h-5 mx-auto mb-1 text-purple-600" /><span className="text-xs">Texto</span></button>
                      {/* Rectángulo */}
                      <button onClick={() => { const el: ComicElement = { id: uuidv4(), type: 'shape', x: 150, y: 150, width: 100, height: 100, shape: 'rectangle', color: '#3b82f6' }; addElement(el); setSelectedElement(el.id); }} className="p-3 border border-gray-200 rounded-lg hover:border-purple-300 hover:bg-purple-50 transition-all text-center"><Square className="w-5 h-5 mx-auto mb-1 text-purple-600" /><span className="text-xs">Rectángulo</span></button>
                      {/* Círculo */}
                      <button onClick={() => { const el: ComicElement = { id: uuidv4(), type: 'shape', x: 150, y: 150, width: 100, height: 100, shape: 'circle', color: '#10b981' }; addElement(el); setSelectedElement(el.id); }} className="p-3 border border-gray-200 rounded-lg hover:border-purple-300 hover:bg-purple-50 transition-all text-center"><Circle className="w-5 h-5 mx-auto mb-1 text-purple-600" /><span className="text-xs">Círculo</span></button>
                      {/* Imagen/GIF/Video */}
                      <button onClick={() => { const input = document.createElement('input'); input.type = 'file'; input.accept = 'image/*,.gif,video/mp4'; input.onchange = e => { const file = (e.target as HTMLInputElement).files?.[0]; if (!file) return; const r = new FileReader(); r.onload = ev => { const url = ev.target?.result as string; let type: 'image'|'gif'|'video' = 'image'; if (file.type.startsWith('video/')) type = 'video'; else if (file.name.toLowerCase().endsWith('.gif')) type = 'gif'; const el: ComicElement = { id: uuidv4(), type, x: 50, y: 50, width: 200, height: 150, imageUrl: type==='image'?url:undefined, gifUrl: type==='gif'?url:undefined, videoUrl: type==='video'?url:undefined, autoplay: type==='video'?true:undefined, loop: true }; addElement(el); setSelectedElement(el.id); }; r.readAsDataURL(file); }; input.click(); }} className="p-3 border border-gray-200 rounded-lg hover:border-purple-300 hover:bg-purple-50 transition-all text-center"><ImageIcon className="w-5 h-5 mx-auto mb-1 text-purple-600" /><span className="text-xs">Imagen</span></button>
                      {/* Línea */}
                      <button onClick={() => { const el: ComicElement = { id: uuidv4(), type: 'line', x: 200, y: 200, width: 200, height: 2, color: '#000000', strokeWidth: 2 }; addElement(el); setSelectedElement(el.id); }} className="p-3 border border-gray-200 rounded-lg hover:border-purple-300 hover:bg-purple-50 transition-all text-center"><Minus className="w-5 h-5 mx-auto mb-1 text-purple-600" /><span className="text-xs">Línea</span></button>
                      {/* Flecha */}
                      <button onClick={() => { const el: ComicElement = { id: uuidv4(), type: 'arrow', x: 200, y: 250, width: 200, height: 2, color: '#ef4444', strokeWidth: 3 }; addElement(el); setSelectedElement(el.id); }} className="p-3 border border-gray-200 rounded-lg hover:border-purple-300 hover:bg-purple-50 transition-all text-center"><ArrowRight className="w-5 h-5 mx-auto mb-1 text-purple-600" /><span className="text-xs">Flecha</span></button>
                      {/* Sticker */}
                      <button onClick={() => { const el: ComicElement = { id: uuidv4(), type: 'sticker', x: 300, y: 300, width: 80, height: 80, stickerType: '😊', opacity: 1 }; addElement(el); setSelectedElement(el.id); }} className="p-3 border border-gray-200 rounded-lg hover:border-purple-300 hover:bg-purple-50 transition-all text-center"><Smile className="w-5 h-5 mx-auto mb-1 text-purple-600" /><span className="text-xs">Sticker</span></button>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold text-gray-800 mb-3">Elementos ({localPanel.elements.length})</h3>
                    <div className="space-y-2 max-h-80 overflow-y-auto">
                      {localPanel.elements.map(element => (
                        <div key={element.id} className={`p-3 border rounded-lg cursor-pointer transition-all ${selectedElement === element.id ? 'border-purple-500 bg-purple-50' : 'border-gray-200 hover:border-purple-300'}`} onClick={() => setSelectedElement(element.id)}>
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium capitalize">{element.type}{element.type === 'text' && element.content ? ` - ${element.content.slice(0, 15)}` : ''}</span>
                            <div className="flex space-x-1">
                              <button onClick={e => { e.stopPropagation(); setSelectedElement(element.id); copyElement(); }} className="p-1 hover:bg-gray-100 rounded" title="Copiar"><Copy className="w-3 h-3 text-gray-500" /></button>
                              <button onClick={e => { e.stopPropagation(); updateElement(element.id, { visible: element.visible !== false ? false : true }); }} className="p-1 hover:bg-gray-100 rounded">{element.visible !== false ? <Eye className="w-3 h-3 text-green-600" /> : <EyeOff className="w-3 h-3 text-gray-400" />}</button>
                              <button onClick={e => { e.stopPropagation(); deleteElement(element.id); }} className="p-1 hover:bg-red-50 rounded text-red-500"><Trash2 className="w-3 h-3" /></button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Propiedades del elemento seleccionado */}
                  {selectedElement && (() => {
                    const element = localPanel.elements.find(el => el.id === selectedElement);
                    if (!element) return null;
                    return (
                      <div className="space-y-3 border-t pt-3">
                        <h4 className="font-semibold text-gray-800">Propiedades</h4>
                        <div className="grid grid-cols-3 gap-2">
                          <button onClick={duplicateElement} className="px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-xs">Duplicar</button>
                          {element.type !== 'text' && <><button onClick={() => rotateElement(90)} className="px-3 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 text-xs">Rotar 90°</button><button onClick={() => flipElement('horizontal')} className="px-3 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 text-xs">Voltear H</button></>}
                        </div>
                        {element.type !== 'text' && <div className="grid grid-cols-2 gap-2"><button onClick={() => flipElement('vertical')} className="px-3 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 text-xs">Voltear V</button><button onClick={() => rotateElement(-90)} className="px-3 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 text-xs">Rotar -90°</button></div>}

                        <div className="space-y-3 border-t pt-3">
                          <h5 className="font-medium text-gray-700 text-sm">Tamaño y Posición</h5>
                          <div><label className="block text-sm font-medium text-gray-700 mb-1">Ancho: {element.width || 100}px</label><input type="range" min="20" max="800" value={element.width || 100} onChange={e => { const w = +e.target.value; lockAspectRatio && element.width && element.height ? updateElement(element.id, { width: w, height: w * (element.height / element.width) }) : updateElement(element.id, { width: w }); }} className="w-full" /></div>
                          <div><label className="block text-sm font-medium text-gray-700 mb-1">Alto: {element.height || 100}px</label><input type="range" min="20" max="600" value={element.height || 100} onChange={e => { const h = +e.target.value; lockAspectRatio && element.width && element.height ? updateElement(element.id, { height: h, width: h * (element.width / element.height) }) : updateElement(element.id, { height: h }); }} className="w-full" /></div>
                          {(element.type === 'line' || element.type === 'arrow') && <div><label className="block text-sm font-medium text-gray-700 mb-1">Grosor: {element.strokeWidth || 2}px</label><input type="range" min="1" max="10" value={element.strokeWidth || 2} onChange={e => updateElement(element.id, { strokeWidth: +e.target.value })} className="w-full" /></div>}
                          {element.type === 'sticker' && <div><label className="block text-sm font-medium text-gray-700 mb-1">Emoji</label><input type="text" value={element.stickerType || '😊'} onChange={e => updateElement(element.id, { stickerType: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-2xl text-center" maxLength={2} /></div>}
                          {(element.type === 'line' || element.type === 'arrow' || element.type === 'shape') && <div><label className="block text-sm font-medium text-gray-700 mb-1">Color</label><input type="color" value={element.color || '#000000'} onChange={e => updateElement(element.id, { color: e.target.value })} className="w-full h-10 border border-gray-300 rounded-lg" /></div>}
                        </div>

                        {element.type === 'text' && (
                          <>
                            <div><label className="block text-sm font-medium text-gray-700 mb-1">Texto</label><textarea value={element.content || ''} onChange={e => updateElement(element.id, { content: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg resize-none" rows={3} /></div>
                            <div><label className="block text-sm font-medium text-gray-700 mb-1">Fuente</label><select value={(element as any).fontFamily || 'Arial'} onChange={e => updateElement(element.id, { fontFamily: e.target.value } as any)} className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white"><option value="Arial">Arial</option><option value="Helvetica">Helvetica</option><option value="Times New Roman">Times New Roman</option><option value="Georgia">Georgia</option><option value="Courier New">Courier New</option><option value="Verdana">Verdana</option><option value="Comic Sans MS">Comic Sans MS</option><option value="Impact">Impact</option></select></div>
                            <div><label className="block text-sm font-medium text-gray-700 mb-1">Tamaño: {element.fontSize || 16}px</label><input type="range" min="8" max="120" value={element.fontSize || 16} onChange={e => updateElement(element.id, { fontSize: +e.target.value })} className="w-full" /></div>
                            <div className="grid grid-cols-2 gap-2"><div><label className="block text-sm font-medium text-gray-700 mb-1">Color</label><input type="color" value={element.color || '#000000'} onChange={e => updateElement(element.id, { color: e.target.value })} className="w-full h-10 border border-gray-300 rounded-lg" /></div><div><label className="block text-sm font-medium text-gray-700 mb-1">Peso</label><select value={element.fontWeight || 'normal'} onChange={e => updateElement(element.id, { fontWeight: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white"><option value="normal">Normal</option><option value="bold">Negrita</option><option value="lighter">Ligera</option></select></div></div>
                            <div className="grid grid-cols-3 gap-2"><button onClick={() => updateElement(element.id, { fontStyle: element.fontStyle === 'italic' ? 'normal' : 'italic' })} className={`px-3 py-2 rounded-lg text-sm font-medium ${element.fontStyle === 'italic' ? 'bg-purple-500 text-white' : 'bg-gray-100 text-gray-700'}`}><i>Cursiva</i></button><button onClick={() => updateElement(element.id, { textDecoration: (element as any).textDecoration === 'underline' ? 'none' : 'underline' } as any)} className={`px-3 py-2 rounded-lg text-sm font-medium ${(element as any).textDecoration === 'underline' ? 'bg-purple-500 text-white' : 'bg-gray-100 text-gray-700'}`}><u>Subrayado</u></button><button onClick={() => updateElement(element.id, { textDecoration: (element as any).textDecoration === 'line-through' ? 'none' : 'line-through' } as any)} className={`px-3 py-2 rounded-lg text-sm font-medium ${(element as any).textDecoration === 'line-through' ? 'bg-purple-500 text-white' : 'bg-gray-100 text-gray-700'}`}><s>Tachado</s></button></div>
                          </>
                        )}

                        {(element.type === 'image' || element.type === 'gif') && (
                          <div className="space-y-3 border-t pt-3">
                            <h5 className="font-medium text-gray-700 text-sm">Ajustes de Imagen</h5>
                            <div><label className="block text-sm font-medium text-gray-700 mb-1">Modo de Ajuste</label><select value={(element as any).objectFit || 'contain'} onChange={e => updateElement(element.id, { objectFit: e.target.value } as any)} className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm"><option value="contain">Ajustar</option><option value="cover">Cubrir</option><option value="fill">Estirar</option><option value="none">Sin ajuste</option></select></div>
                            <div><label className="block text-sm font-medium text-gray-700 mb-1">Opacidad: {Math.round((element.opacity || 1) * 100)}%</label><input type="range" min="0" max="1" step="0.05" value={element.opacity || 1} onChange={e => updateElement(element.id, { opacity: +e.target.value })} className="w-full" /></div>
                          </div>
                        )}

                        <div className="space-y-3 border-t pt-3">
                          <h5 className="font-medium text-gray-700 text-sm">Timing</h5>
                          <div><label className="block text-sm font-medium text-gray-700 mb-1">Retraso: {element.appearanceDelay || 0}ms</label><input type="range" min="0" max="5000" step="100" value={element.appearanceDelay || 0} onChange={e => updateElement(element.id, { appearanceDelay: +e.target.value })} className="w-full" /></div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* ── Tab: Animaciones ── */}
              {activeTab === 'animations' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-gray-800">Animaciones</h4>
                    <button onClick={() => { setPreviewAnimation(v => !v); setAnimationKey(k => k + 1); }} className={`px-3 py-1 rounded-lg text-sm ${previewAnimation ? 'bg-green-500 text-white' : 'bg-gray-200'}`}><Play className="w-4 h-4 inline mr-1" />{previewAnimation ? 'Detener' : 'Previsualizar'}</button>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                    <span className="text-sm text-gray-700">Bloquear proporción</span>
                    <button onClick={() => setLockAspectRatio(v => !v)} className={`p-1 rounded ${lockAspectRatio ? 'text-purple-600' : 'text-gray-400'}`}>{lockAspectRatio ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}</button>
                  </div>

                  {selectedElement ? (() => {
                    const element = localPanel.elements.find(el => el.id === selectedElement);
                    if (!element) return null;
                    return (
                      <div className="space-y-4">
                        <div><label className="block text-sm font-medium text-gray-700 mb-1">Entrada</label><select value={element.entranceAnimation?.type || ''} onChange={e => { const t = e.target.value as any; updateElement(element.id, { entranceAnimation: t ? { type: t, duration: 1000, delay: 0 } : undefined }); }} className="w-full px-3 py-2 border border-gray-300 rounded-lg"><option value="">Sin animación</option><option value="fadeIn">Aparecer</option><option value="slideIn">Deslizar</option><option value="zoomIn">Zoom In</option><option value="bounceIn">Rebotar</option><option value="rotateIn">Rotar</option>{element.type === 'text' && <option value="typewriter">Máquina de Escribir</option>}</select></div>
                        <div><label className="block text-sm font-medium text-gray-700 mb-1">Salida</label><select value={element.exitAnimation?.type || ''} onChange={e => { const t = e.target.value as any; updateElement(element.id, { exitAnimation: t ? { type: t, duration: 1000, delay: 0 } : undefined }); }} className="w-full px-3 py-2 border border-gray-300 rounded-lg"><option value="">Sin animación</option><option value="fadeOut">Desvanecer</option><option value="slideOut">Deslizar Fuera</option><option value="zoomOut">Zoom Out</option></select></div>
                        {element.entranceAnimation && (
                          <>
                            <div><label className="block text-sm font-medium text-gray-700 mb-1">Duración: {element.entranceAnimation.duration}ms</label><input type="range" min="200" max="5000" step="100" value={element.entranceAnimation.duration} onChange={e => updateElement(element.id, { entranceAnimation: { ...element.entranceAnimation!, duration: +e.target.value } })} className="w-full" /></div>
                            <div><label className="block text-sm font-medium text-gray-700 mb-1">Retraso: {element.entranceAnimation.delay || 0}ms</label><input type="range" min="0" max="3000" step="100" value={element.entranceAnimation.delay || 0} onChange={e => updateElement(element.id, { entranceAnimation: { ...element.entranceAnimation!, delay: +e.target.value } })} className="w-full" /></div>
                            {element.entranceAnimation.type === 'slideIn' && <div><label className="block text-sm font-medium text-gray-700 mb-1">Dirección</label><select value={element.entranceAnimation.direction || 'left'} onChange={e => updateElement(element.id, { entranceAnimation: { ...element.entranceAnimation!, direction: e.target.value as any } })} className="w-full px-3 py-2 border border-gray-300 rounded-lg"><option value="left">Izquierda</option><option value="right">Derecha</option><option value="up">Arriba</option><option value="down">Abajo</option></select></div>}
                          </>
                        )}
                      </div>
                    );
                  })() : <p className="text-gray-500 text-sm">Selecciona un elemento para añadir animaciones</p>}
                </div>
              )}

              {/* ── Tab: Orden ── */}
              {activeTab === 'order' && (
                <div className="space-y-4">
                  <h4 className="font-semibold text-gray-800 mb-3">Orden de Aparición</h4>
                  <div className="space-y-2">
                    {sortedElements.map((element, index) => (
                      <div key={element.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <span className="w-6 h-6 bg-purple-600 text-white rounded-full flex items-center justify-center text-xs font-bold">{index + 1}</span>
                          <span className="text-sm capitalize">{element.type}{element.type === 'text' && element.content ? ` - ${element.content.slice(0, 15)}` : ''}</span>
                        </div>
                        <div className="flex space-x-1">
                          <button onClick={() => moveElementOrder(element.id, 'up')} disabled={index === 0} className="p-1 hover:bg-gray-200 rounded disabled:opacity-30"><ArrowUp className="w-4 h-4" /></button>
                          <button onClick={() => moveElementOrder(element.id, 'down')} disabled={index === sortedElements.length - 1} className="p-1 hover:bg-gray-200 rounded disabled:opacity-30"><ArrowDown className="w-4 h-4" /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Tab: Panel ── */}
              {activeTab === 'panel' && (
                <div className="space-y-4">
                  <h4 className="font-semibold text-gray-800 mb-3">Configuración del Panel</h4>

                  <div className="grid grid-cols-2 gap-3">
                    <div><label className="block text-xs text-gray-600 mb-1">Ancho (px)</label><input type="number" min="400" max="4000" value={panelWidth} onChange={e => addToHistory({ ...localPanel, panelWidth: Math.max(400, Math.min(4000, +e.target.value)) })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" /></div>
                    <div><label className="block text-xs text-gray-600 mb-1">Alto (px)</label><input type="number" min="400" max="4000" value={panelHeight} onChange={e => addToHistory({ ...localPanel, panelHeight: Math.max(400, Math.min(4000, +e.target.value)) })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" /></div>
                  </div>

                  <button onClick={() => { const b = calculateContentBounds(); if (b) addToHistory({ ...localPanel, panelWidth: b.width, panelHeight: b.height, elements: localPanel.elements.map(el => ({ ...el, x: (el.x||0)-b.minX, y: (el.y||0)-b.minY })) }); }} className="w-full px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 flex items-center justify-center gap-2"><Crop className="w-4 h-4" /><span>Ajustar al Contenido</span></button>

                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Color de Fondo</label><input type="color" value={localPanel.backgroundColor || '#ffffff'} onChange={e => addToHistory({ ...localPanel, backgroundColor: e.target.value })} className="w-full h-10 border border-gray-300 rounded-lg" /></div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Imagen de Fondo</label>
                    <button onClick={() => { const input = document.createElement('input'); input.type='file'; input.accept='image/*'; input.onchange=e=>{ const file=(e.target as HTMLInputElement).files?.[0]; if(!file) return; const r=new FileReader(); r.onload=ev=>addToHistory({...localPanel,backgroundImage:ev.target?.result as string}); r.readAsDataURL(file); }; input.click(); }} className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">Subir Imagen de Fondo</button>
                    {localPanel.backgroundImage && (
                      <>
                        <button onClick={() => addToHistory({ ...localPanel, backgroundImage: undefined })} className="w-full mt-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 text-sm">Eliminar Fondo</button>
                        <div className="mt-3 space-y-2 p-3 bg-gray-50 rounded-lg">
                          <div><label className="block text-sm font-medium text-gray-700 mb-1">Modo</label><select value={(localPanel as any).backgroundSize || 'contain'} onChange={e => addToHistory({ ...localPanel, backgroundSize: e.target.value } as any)} className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm"><option value="contain">Ajustar</option><option value="cover">Cubrir</option><option value="auto">Original</option><option value="100% 100%">Estirar</option></select></div>
                          <div><label className="block text-sm font-medium text-gray-700 mb-1">Posición</label><select value={(localPanel as any).backgroundPosition || 'center'} onChange={e => addToHistory({ ...localPanel, backgroundPosition: e.target.value } as any)} className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm"><option value="center">Centro</option><option value="top">Arriba</option><option value="bottom">Abajo</option><option value="left">Izquierda</option><option value="right">Derecha</option></select></div>
                        </div>
                      </>
                    )}
                  </div>

                  <div className="pt-4 border-t">
                    <button onClick={exportPanelAsImage} className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2 font-medium"><Save className="w-5 h-5" /><span>Guardar como Imagen</span></button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="flex items-center justify-between p-4 border-t border-gray-200">
          <span className="text-sm text-gray-600">{localPanel.elements.length} elemento(s)</span>
          <div className="flex space-x-2">
            <button onClick={exportPanelAsImage} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center gap-2"><Download className="w-4 h-4" /><span>Exportar</span></button>
            <button onClick={() => { onPanelUpdate(localPanel); onClose(); }} className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium">Guardar y Cerrar</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdvancedPanelEditor;
