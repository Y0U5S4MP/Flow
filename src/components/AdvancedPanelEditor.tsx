import React, { useState, useRef, useEffect } from 'react';
import { Panel, ComicElement, ElementAnimation } from '../types/Comic';
import { X, Undo, Redo, Copy, Layers, Grid2x2 as Grid, ZoomIn, ZoomOut, Type, Square, Circle, Trash2, Eye, EyeOff, Download, Image as ImageIcon, ArrowUp, ArrowDown, Play, Lock, Unlock, Minus, ArrowRight, Smile, Settings } from 'lucide-react';
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
  onClose
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
      appearanceOrder: maxOrder + 1
    };

    const updatedPanel: Panel = {
      ...localPanel,
      elements: [...localPanel.elements, newElement]
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

    const flipH = (element as any).flipHorizontal || false;
    const flipV = (element as any).flipVertical || false;

    if (direction === 'horizontal') {
      updateElement(selectedElement, { flipHorizontal: !flipH } as any);
    } else {
      updateElement(selectedElement, { flipVertical: !flipV } as any);
    }
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

      const element = localPanel.elements.find(el => el.id === elementId);
      if (!element) return;

      const canvas = document.querySelector('.editor-canvas') as HTMLElement;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();

      setResizeStartSize({
        width: element.width || 100,
        height: element.height || 100,
        x: element.x,
        y: element.y
      });
      setResizeStartMouse({
        x: e.clientX,
        y: e.clientY
      });
    } else {
      setDraggingElement(elementId);
      const element = localPanel.elements.find(el => el.id === elementId);
      if (!element) return;

      setDragOffset({
        x: element.x,
        y: element.y
      });
      setResizeStartMouse({
        x: e.clientX,
        y: e.clientY
      });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (draggingElement) {
      const element = localPanel.elements.find(el => el.id === draggingElement);
      if (!element) return;

      const scaleX = panelWidth / canvasDisplayWidth;
      const scaleY = panelHeight / canvasDisplayHeight;

      const mouseDeltaX = (e.clientX - resizeStartMouse.x) / (zoom / 100) * scaleX;
      const mouseDeltaY = (e.clientY - resizeStartMouse.y) / (zoom / 100) * scaleY;

      const newX = dragOffset.x + mouseDeltaX;
      const newY = dragOffset.y + mouseDeltaY;

      updateElement(draggingElement, {
        x: Math.max(0, Math.min(panelWidth - (element.width || 100), newX)),
        y: Math.max(0, Math.min(panelHeight - (element.height || 100), newY))
      });
    }

    if (resizingElement && resizeHandle) {
      const element = localPanel.elements.find(el => el.id === resizingElement);
      if (!element) return;

      const scaleX = panelWidth / canvasDisplayWidth;
      const scaleY = panelHeight / canvasDisplayHeight;

      const mouseDeltaX = (e.clientX - resizeStartMouse.x) / (zoom / 100) * scaleX;
      const mouseDeltaY = (e.clientY - resizeStartMouse.y) / (zoom / 100) * scaleY;

      let newWidth = resizeStartSize.width;
      let newHeight = resizeStartSize.height;
      let newX = resizeStartSize.x;
      let newY = resizeStartSize.y;

      const originalAspectRatio = resizeStartSize.width / resizeStartSize.height;

      switch (resizeHandle) {
        case 'se':
          newWidth = Math.max(20, resizeStartSize.width + mouseDeltaX);
          newHeight = lockAspectRatio ? newWidth / originalAspectRatio : Math.max(20, resizeStartSize.height + mouseDeltaY);
          break;
        case 'sw':
          newWidth = Math.max(20, resizeStartSize.width - mouseDeltaX);
          newHeight = lockAspectRatio ? newWidth / originalAspectRatio : Math.max(20, resizeStartSize.height + mouseDeltaY);
          newX = resizeStartSize.x + (resizeStartSize.width - newWidth);
          break;
        case 'ne':
          newWidth = Math.max(20, resizeStartSize.width + mouseDeltaX);
          newHeight = lockAspectRatio ? newWidth / originalAspectRatio : Math.max(20, resizeStartSize.height - mouseDeltaY);
          if (!lockAspectRatio) {
            newY = resizeStartSize.y + (resizeStartSize.height - newHeight);
          } else {
            newY = resizeStartSize.y + (resizeStartSize.height - newHeight);
          }
          break;
        case 'nw':
          newWidth = Math.max(20, resizeStartSize.width - mouseDeltaX);
          newHeight = lockAspectRatio ? newWidth / originalAspectRatio : Math.max(20, resizeStartSize.height - mouseDeltaY);
          newX = resizeStartSize.x + (resizeStartSize.width - newWidth);
          newY = resizeStartSize.y + (resizeStartSize.height - newHeight);
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
    const scaleX = canvasDisplayWidth / panelWidth;
    const scaleY = canvasDisplayHeight / panelHeight;

    const rotation = (element as any).rotation || 0;
    const flipH = (element as any).flipHorizontal || false;
    const flipV = (element as any).flipVertical || false;

    const transforms = [];
    if (rotation !== 0) transforms.push(`rotate(${rotation}deg)`);
    if (flipH) transforms.push('scaleX(-1)');
    if (flipV) transforms.push('scaleY(-1)');

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
      zIndex: isSelected ? 1000 : 1,
      transform: transforms.length > 0 ? transforms.join(' ') : undefined,
      transformOrigin: 'center'
    };

    const animationStyle: React.CSSProperties = element.entranceAnimation ? {
      '--animation-duration': `${element.entranceAnimation.duration}ms`,
      '--animation-delay': `${element.entranceAnimation.delay || 0}ms`
    } as React.CSSProperties : {};

    const elementContent = (() => {
      switch (element.type) {
        case 'text':
          const isTypewriter = previewAnimation && element.entranceAnimation?.type === 'typewriter';
          return (
            <div style={{ ...style, padding: '4px' }}>
              {isTypewriter ? (
                <TypewriterText
                  key={animationKey}
                  text={element.content || ''}
                  duration={element.entranceAnimation!.duration}
                  delay={element.entranceAnimation!.delay || 0}
                  style={{ color: element.color, fontSize: element.fontSize }}
                />
              ) : (
                element.content
              )}
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

        case 'line':
          return (
            <div
              style={{
                ...style,
                height: `${element.strokeWidth || 2}px`,
                backgroundColor: element.color,
                width: element.width ? `${element.width * scaleX}px` : '100px'
              }}
            />
          );

        case 'arrow':
          return (
            <svg
              style={{
                ...style,
                width: element.width ? `${element.width * scaleX}px` : '100px',
                height: `${20 * scaleY}px`
              }}
              viewBox="0 0 100 20"
            >
              <defs>
                <marker
                  id={`arrowhead-${element.id}`}
                  markerWidth="10"
                  markerHeight="10"
                  refX="9"
                  refY="3"
                  orient="auto"
                >
                  <polygon points="0 0, 10 3, 0 6" fill={element.color || '#000000'} />
                </marker>
              </defs>
              <line
                x1="0"
                y1="10"
                x2="95"
                y2="10"
                stroke={element.color || '#000000'}
                strokeWidth={element.strokeWidth || 2}
                markerEnd={`url(#arrowhead-${element.id})`}
              />
            </svg>
          );

        case 'sticker':
          return (
            <div
              style={{
                ...style,
                fontSize: `${(element.width || 80) * scaleX * 0.8}px`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: element.opacity || 1
              }}
            >
              {element.stickerType || '😊'}
            </div>
          );

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
        style={shouldAnimate ? animationStyle : {}}
      >
        {elementContent}

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
              onClick={() => {
                onPanelUpdate(localPanel);
                onClose();
              }}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          <div className="flex-1 bg-gray-100 rounded-lg overflow-hidden relative">
            <div
              className="editor-canvas relative bg-white mx-auto"
              style={{
                width: `${canvasDisplayWidth}px`,
                height: `${canvasDisplayHeight}px`,
                transform: `scale(${zoom / 100})`,
                transformOrigin: 'top left',
                backgroundColor: localPanel.backgroundColor || '#ffffff',
                backgroundImage: localPanel.backgroundImage ? `url(${localPanel.backgroundImage})` : undefined,
                backgroundSize: 'cover',
                backgroundPosition: 'center'
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
              { key: 'order', icon: ArrowUp, label: 'Orden' },
              { key: 'panel', icon: Settings, label: 'Panel' }
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

                    <button
                      onClick={() => {
                        const element: ComicElement = {
                          id: uuidv4(),
                          type: 'line',
                          x: 200,
                          y: 200,
                          width: 200,
                          height: 2,
                          color: '#000000',
                          strokeWidth: 2
                        };
                        addElement(element);
                        setSelectedElement(element.id);
                      }}
                      className="p-3 border border-gray-200 rounded-lg hover:border-purple-300 hover:bg-purple-50 transition-all text-center"
                    >
                      <Minus className="w-5 h-5 mx-auto mb-1 text-purple-600" />
                      <span className="text-xs">Línea</span>
                    </button>

                    <button
                      onClick={() => {
                        const element: ComicElement = {
                          id: uuidv4(),
                          type: 'arrow',
                          x: 200,
                          y: 250,
                          width: 200,
                          height: 2,
                          color: '#ef4444',
                          strokeWidth: 3
                        };
                        addElement(element);
                        setSelectedElement(element.id);
                      }}
                      className="p-3 border border-gray-200 rounded-lg hover:border-purple-300 hover:bg-purple-50 transition-all text-center"
                    >
                      <ArrowRight className="w-5 h-5 mx-auto mb-1 text-purple-600" />
                      <span className="text-xs">Flecha</span>
                    </button>

                    <button
                      onClick={() => {
                        const element: ComicElement = {
                          id: uuidv4(),
                          type: 'sticker',
                          x: 300,
                          y: 300,
                          width: 80,
                          height: 80,
                          stickerType: '😊',
                          opacity: 1
                        };
                        addElement(element);
                        setSelectedElement(element.id);
                      }}
                      className="p-3 border border-gray-200 rounded-lg hover:border-purple-300 hover:bg-purple-50 transition-all text-center"
                    >
                      <Smile className="w-5 h-5 mx-auto mb-1 text-purple-600" />
                      <span className="text-xs">Sticker</span>
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

                      <div className="grid grid-cols-3 gap-2">
                        <button
                          onClick={duplicateElement}
                          className="px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-xs font-medium"
                        >
                          Duplicar
                        </button>
                        {element.type !== 'text' && (
                          <>
                            <button
                              onClick={() => rotateElement(90)}
                              className="px-3 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-xs font-medium"
                            >
                              Rotar 90°
                            </button>
                            <button
                              onClick={() => flipElement('horizontal')}
                              className="px-3 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors text-xs font-medium"
                            >
                              Voltear H
                            </button>
                          </>
                        )}
                      </div>

                      {element.type !== 'text' && (
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            onClick={() => flipElement('vertical')}
                            className="px-3 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors text-xs font-medium"
                          >
                            Voltear V
                          </button>
                          <button
                            onClick={() => rotateElement(-90)}
                            className="px-3 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-xs font-medium"
                          >
                            Rotar -90°
                          </button>
                        </div>
                      )}

                      <div className="space-y-3 border-t pt-3">
                        <h5 className="font-medium text-gray-700 text-sm">Tamaño y Posición</h5>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Ancho: {element.width || 100}px
                          </label>
                          <input
                            type="range"
                            min="20"
                            max="800"
                            value={element.width || 100}
                            onChange={(e) => {
                              const newWidth = Number(e.target.value);
                              if (lockAspectRatio && element.width && element.height) {
                                const ratio = element.height / element.width;
                                updateElement(element.id, { width: newWidth, height: newWidth * ratio });
                              } else {
                                updateElement(element.id, { width: newWidth });
                              }
                            }}
                            className="w-full"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Alto: {element.height || 100}px
                          </label>
                          <input
                            type="range"
                            min="20"
                            max="600"
                            value={element.height || 100}
                            onChange={(e) => {
                              const newHeight = Number(e.target.value);
                              if (lockAspectRatio && element.width && element.height) {
                                const ratio = element.width / element.height;
                                updateElement(element.id, { height: newHeight, width: newHeight * ratio });
                              } else {
                                updateElement(element.id, { height: newHeight });
                              }
                            }}
                            className="w-full"
                          />
                        </div>

                        {(element.type === 'line' || element.type === 'arrow') && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Grosor: {element.strokeWidth || 2}px
                            </label>
                            <input
                              type="range"
                              min="1"
                              max="10"
                              value={element.strokeWidth || 2}
                              onChange={(e) => updateElement(element.id, { strokeWidth: Number(e.target.value) })}
                              className="w-full"
                            />
                          </div>
                        )}

                        {element.type === 'sticker' && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Emoji/Sticker</label>
                            <input
                              type="text"
                              value={element.stickerType || '😊'}
                              onChange={(e) => updateElement(element.id, { stickerType: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-2xl text-center"
                              maxLength={2}
                            />
                          </div>
                        )}

                        {(element.type === 'line' || element.type === 'arrow' || element.type === 'shape') && (
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

                      <div className="space-y-3 border-t pt-3">
                        <h5 className="font-medium text-gray-700 text-sm">Timing y Sonido</h5>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Retraso de Aparición: {element.appearanceDelay || 0}ms
                          </label>
                          <input
                            type="range"
                            min="0"
                            max="5000"
                            step="100"
                            value={element.appearanceDelay || 0}
                            onChange={(e) => updateElement(element.id, { appearanceDelay: Number(e.target.value) })}
                            className="w-full"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Efecto de Sonido
                          </label>
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
                                    updateElement(element.id, { soundEffect: url });
                                  };
                                  reader.readAsDataURL(file);
                                }
                              };
                              input.click();
                            }}
                            className="w-full px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors text-sm"
                          >
                            {element.soundEffect ? 'Cambiar Sonido' : 'Agregar Sonido'}
                          </button>
                          {element.soundEffect && (
                            <button
                              onClick={() => updateElement(element.id, { soundEffect: undefined })}
                              className="w-full mt-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-xs"
                            >
                              Eliminar Sonido
                            </button>
                          )}
                        </div>
                      </div>

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
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-gray-800">Animaciones de Elementos</h4>
                    <button
                      onClick={() => {
                        setPreviewAnimation(!previewAnimation);
                        if (!previewAnimation) {
                          setAnimationKey(prev => prev + 1);
                        }
                      }}
                      className={`px-3 py-1 rounded-lg text-sm ${previewAnimation ? 'bg-green-500 text-white' : 'bg-gray-200'}`}
                    >
                      <Play className="w-4 h-4 inline mr-1" />
                      {previewAnimation ? 'Detener' : 'Previsualizar'}
                    </button>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                    <span className="text-sm text-gray-700">Bloquear proporción</span>
                    <button
                      onClick={() => setLockAspectRatio(!lockAspectRatio)}
                      className={`p-1 rounded ${lockAspectRatio ? 'text-purple-600' : 'text-gray-400'}`}
                    >
                      {lockAspectRatio ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                    </button>
                  </div>
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
                          {element.type === 'text' && <option value="typewriter">Máquina de Escribir</option>}
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
                        <>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Duración: {element.entranceAnimation.duration}ms
                            </label>
                            <input
                              type="range"
                              min="200"
                              max="5000"
                              step="100"
                              value={element.entranceAnimation.duration}
                              onChange={(e) => updateElement(element.id, {
                                entranceAnimation: { ...element.entranceAnimation!, duration: Number(e.target.value) }
                              })}
                              className="w-full"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Retraso: {element.entranceAnimation.delay || 0}ms
                            </label>
                            <input
                              type="range"
                              min="0"
                              max="3000"
                              step="100"
                              value={element.entranceAnimation.delay || 0}
                              onChange={(e) => updateElement(element.id, {
                                entranceAnimation: { ...element.entranceAnimation!, delay: Number(e.target.value) }
                              })}
                              className="w-full"
                            />
                          </div>

                          {element.entranceAnimation.type === 'slideIn' && (
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">Dirección</label>
                              <select
                                value={element.entranceAnimation.direction || 'left'}
                                onChange={(e) => updateElement(element.id, {
                                  entranceAnimation: { ...element.entranceAnimation!, direction: e.target.value as any }
                                })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                              >
                                <option value="left">Izquierda</option>
                                <option value="right">Derecha</option>
                                <option value="up">Arriba</option>
                                <option value="down">Abajo</option>
                              </select>
                            </div>
                          )}
                        </>
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

            {activeTab === 'panel' && (
              <div className="space-y-4">
                <h4 className="font-semibold text-gray-800 mb-3">Configuración del Panel</h4>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Ancho del Panel: {panelWidth}px
                  </label>
                  <input
                    type="range"
                    min="800"
                    max="3200"
                    step="100"
                    value={panelWidth}
                    onChange={(e) => {
                      const updatedPanel = { ...localPanel, panelWidth: Number(e.target.value) };
                      addToHistory(updatedPanel);
                    }}
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Alto del Panel: {panelHeight}px
                  </label>
                  <input
                    type="range"
                    min="600"
                    max="2400"
                    step="100"
                    value={panelHeight}
                    onChange={(e) => {
                      const updatedPanel = { ...localPanel, panelHeight: Number(e.target.value) };
                      addToHistory(updatedPanel);
                    }}
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Color de Fondo</label>
                  <input
                    type="color"
                    value={localPanel.backgroundColor || '#ffffff'}
                    onChange={(e) => {
                      const updatedPanel = { ...localPanel, backgroundColor: e.target.value };
                      addToHistory(updatedPanel);
                    }}
                    className="w-full h-10 border border-gray-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Imagen de Fondo</label>
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
                            const url = event.target?.result as string;
                            const updatedPanel = { ...localPanel, backgroundImage: url };
                            addToHistory(updatedPanel);
                          };
                          reader.readAsDataURL(file);
                        }
                      };
                      input.click();
                    }}
                    className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                  >
                    Subir Imagen de Fondo
                  </button>
                  {localPanel.backgroundImage && (
                    <button
                      onClick={() => {
                        const updatedPanel = { ...localPanel, backgroundImage: undefined };
                        addToHistory(updatedPanel);
                      }}
                      className="w-full mt-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm"
                    >
                      Eliminar Fondo
                    </button>
                  )}
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
              onClick={() => {
                onPanelUpdate(localPanel);
                onClose();
              }}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
            >
              Guardar y Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdvancedPanelEditor;
