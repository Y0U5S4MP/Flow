import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Panel, ComicElement, ElementAnimation } from '../types/Comic';
import {
  X, Undo, Redo, Grid2x2 as Grid, ZoomIn, ZoomOut,
  Type, Square, Circle, Trash2, Eye, EyeOff, Download,
  Image as ImageIcon, ArrowUp, ArrowDown, Play, Lock, Unlock,
  Minus, ArrowRight, Smile, Settings, Crop, Save, Copy,
  AlignCenter, Bold, Italic, Underline, ChevronDown, ChevronUp,
  Move, RotateCcw, Layers,
} from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

// ─── TypewriterText inline (evita el import roto) ────────────────────────────
const TypewriterText: React.FC<{
  text: string; duration: number; delay?: number; style?: React.CSSProperties;
}> = ({ text, duration, delay = 0, style }) => {
  const [displayed, setDisplayed] = useState('');
  useEffect(() => {
    setDisplayed('');
    const t = setTimeout(() => {
      let i = 0;
      const iv = setInterval(() => {
        setDisplayed(text.slice(0, ++i));
        if (i >= text.length) clearInterval(iv);
      }, duration / Math.max(text.length, 1));
      return () => clearInterval(iv);
    }, delay);
    return () => clearTimeout(t);
  }, [text, duration, delay]);
  return <span style={style}>{displayed}</span>;
};

// ─── Constantes ───────────────────────────────────────────────────────────────
const HANDLE_SIZE = 10; // px, tamaño de los handles de resize
const SNAP_THRESHOLD = 8; // px, distancia para snap

// Handles: posición relativa al elemento
const HANDLES = [
  { id: 'nw', cursor: 'nw-resize', x: 0,   y: 0   },
  { id: 'n',  cursor: 'n-resize',  x: 0.5, y: 0   },
  { id: 'ne', cursor: 'ne-resize', x: 1,   y: 0   },
  { id: 'e',  cursor: 'e-resize',  x: 1,   y: 0.5 },
  { id: 'se', cursor: 'se-resize', x: 1,   y: 1   },
  { id: 's',  cursor: 's-resize',  x: 0.5, y: 1   },
  { id: 'sw', cursor: 'sw-resize', x: 0,   y: 1   },
  { id: 'w',  cursor: 'w-resize',  x: 0,   y: 0.5 },
];

// ─── Tipos de elementos con etiquetas amigables ───────────────────────────────
const ELEMENT_BUTTONS = [
  { type: 'text',    icon: Type,      label: 'Texto',       desc: 'Añade texto libre', color: 'blue' },
  { type: 'speech',  icon: null,      label: '💬 Globo',    desc: 'Globo de diálogo',  color: 'green', emoji: '💬' },
  { type: 'thought', icon: null,      label: '💭 Pensamiento', desc: 'Burbuja de pensamiento', color: 'purple', emoji: '💭' },
  { type: 'caption', icon: null,      label: '📋 Narración', desc: 'Caja de narrador',  color: 'yellow', emoji: '📋' },
  { type: 'shape-rect', icon: Square, label: 'Rectángulo',  desc: 'Forma cuadrada',    color: 'orange' },
  { type: 'shape-circle', icon: Circle, label: 'Círculo',   desc: 'Forma circular',    color: 'red' },
  { type: 'image',   icon: ImageIcon, label: 'Imagen',      desc: 'Sube una imagen o GIF', color: 'indigo' },
  { type: 'sticker', icon: Smile,     label: 'Emoji',       desc: 'Emoji decorativo',  color: 'pink' },
  { type: 'line',    icon: Minus,     label: 'Línea',       desc: 'Línea recta',       color: 'gray' },
  { type: 'arrow',   icon: ArrowRight,label: 'Flecha',      desc: 'Flecha direccional',color: 'gray' },
];

const COLOR_BTN: Record<string, string> = {
  blue:   'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100',
  green:  'bg-green-50 border-green-200 text-green-700 hover:bg-green-100',
  purple: 'bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100',
  yellow: 'bg-yellow-50 border-yellow-200 text-yellow-700 hover:bg-yellow-100',
  orange: 'bg-orange-50 border-orange-200 text-orange-700 hover:bg-orange-100',
  red:    'bg-red-50 border-red-200 text-red-700 hover:bg-red-100',
  indigo: 'bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100',
  pink:   'bg-pink-50 border-pink-200 text-pink-700 hover:bg-pink-100',
  gray:   'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100',
};

// ─── Componente principal ─────────────────────────────────────────────────────
interface Props {
  panel: Panel;
  onPanelUpdate: (panel: Panel) => void;
  onClose: () => void;
}

const AdvancedPanelEditor: React.FC<Props> = ({ panel, onPanelUpdate, onClose }) => {
  const [localPanel, setLocalPanel] = useState<Panel>(() => JSON.parse(JSON.stringify(panel)));
  const [history, setHistory] = useState<Panel[]>([JSON.parse(JSON.stringify(panel))]);
  const [histIdx, setHistIdx] = useState(0);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingTextId, setEditingTextId] = useState<string | null>(null);

  const [zoom, setZoom] = useState(80);
  const [showGrid, setShowGrid] = useState(false);
  const [lockAR, setLockAR] = useState(true);
  const [previewAnim, setPreviewAnim] = useState(false);
  const [animKey, setAnimKey] = useState(0);

  // Drag / resize state
  const dragRef = useRef<{
    type: 'move' | 'resize';
    elementId: string;
    handle?: string;
    startMouse: { x: number; y: number };
    startEl: { x: number; y: number; w: number; h: number };
    scaleX: number;
    scaleY: number;
  } | null>(null);

  const canvasRef = useRef<HTMLDivElement>(null);

  const panelW = localPanel.panelWidth  || 1600;
  const panelH = localPanel.panelHeight || 900;
  // El lienzo se muestra siempre con aspect ratio correcto
  const CANVAS_DISPLAY_W = 760;
  const CANVAS_DISPLAY_H = Math.round((panelH / panelW) * CANVAS_DISPLAY_W);

  // ── Historia ──────────────────────────────────────────────────────────────
  const commit = useCallback((next: Panel) => {
    setHistory(h => {
      const sliced = h.slice(0, histIdx + 1);
      sliced.push(next);
      setHistIdx(sliced.length - 1);
      return sliced;
    });
    setLocalPanel(next);
    onPanelUpdate(next);
  }, [histIdx, onPanelUpdate]);

  const undo = () => {
    if (histIdx <= 0) return;
    const p = history[histIdx - 1];
    setHistIdx(i => i - 1);
    setLocalPanel(p);
    onPanelUpdate(p);
  };
  const redo = () => {
    if (histIdx >= history.length - 1) return;
    const p = history[histIdx + 1];
    setHistIdx(i => i + 1);
    setLocalPanel(p);
    onPanelUpdate(p);
  };

  // ── Helpers ───────────────────────────────────────────────────────────────
  const updateEl = (id: string, changes: Partial<ComicElement>) => {
    commit({
      ...localPanel,
      elements: localPanel.elements.map(e => e.id === id ? { ...e, ...changes } : e),
    });
  };

  const deleteEl = (id: string) => {
    commit({ ...localPanel, elements: localPanel.elements.filter(e => e.id !== id) });
    setSelectedId(null);
  };

  const selected = localPanel.elements.find(e => e.id === selectedId) ?? null;

  // ── Crear elementos ───────────────────────────────────────────────────────
  const addElement = (type: string) => {
    const maxOrder = Math.max(0, ...localPanel.elements.map(e => e.appearanceOrder || 0));
    const cx = panelW * 0.3;
    const cy = panelH * 0.3;

    let el: ComicElement | null = null;

    if (type === 'text') {
      el = { id: uuidv4(), type: 'text', x: cx, y: cy, content: 'Doble clic para editar', fontSize: 32, color: '#1a1a1a', fontWeight: 'bold', appearanceOrder: maxOrder + 1 };
    } else if (type === 'speech' || type === 'thought' || type === 'caption') {
      // Los globos los manejamos como 'text' con metadata extra
      el = { id: uuidv4(), type: 'text', x: cx, y: cy, width: 300, height: 120,
             content: type === 'caption' ? 'NARRACIÓN...' : '¡Texto aquí!',
             fontSize: 28, color: '#1a1a1a', fontWeight: 'normal',
             bubbleType: type, bgColor: '#ffffff', borderColor: '#222222',
             appearanceOrder: maxOrder + 1 } as any;
    } else if (type === 'shape-rect') {
      el = { id: uuidv4(), type: 'shape', shape: 'rectangle', x: cx, y: cy, width: 200, height: 150, color: '#6366f1', appearanceOrder: maxOrder + 1 };
    } else if (type === 'shape-circle') {
      el = { id: uuidv4(), type: 'shape', shape: 'circle', x: cx, y: cy, width: 150, height: 150, color: '#ec4899', appearanceOrder: maxOrder + 1 };
    } else if (type === 'image') {
      const input = document.createElement('input');
      input.type = 'file'; input.accept = 'image/*,.gif';
      input.onchange = e => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (!file) return;
        const r = new FileReader();
        r.onload = ev => {
          const url = ev.target?.result as string;
          const isGif = file.name.toLowerCase().endsWith('.gif');
          const newEl: ComicElement = {
            id: uuidv4(), type: isGif ? 'gif' : 'image',
            x: cx, y: cy, width: 300, height: 200,
            imageUrl: isGif ? undefined : url,
            gifUrl: isGif ? url : undefined,
            appearanceOrder: maxOrder + 1,
          };
          commit({ ...localPanel, elements: [...localPanel.elements, newEl] });
          setSelectedId(newEl.id);
        };
        r.readAsDataURL(file);
      };
      input.click();
      return;
    } else if (type === 'sticker') {
      el = { id: uuidv4(), type: 'sticker', x: cx, y: cy, width: 120, height: 120, stickerType: '⭐', opacity: 1, appearanceOrder: maxOrder + 1 };
    } else if (type === 'line') {
      el = { id: uuidv4(), type: 'line', x: cx, y: cy, width: 300, height: 4, color: '#1a1a1a', strokeWidth: 4, appearanceOrder: maxOrder + 1 };
    } else if (type === 'arrow') {
      el = { id: uuidv4(), type: 'arrow', x: cx, y: cy, width: 300, height: 4, color: '#ef4444', strokeWidth: 4, appearanceOrder: maxOrder + 1 };
    }

    if (!el) return;
    commit({ ...localPanel, elements: [...localPanel.elements, el] });
    setSelectedId(el.id);
  };

  // ── Mouse handlers para drag & resize ─────────────────────────────────────
  const getScales = () => {
    const scX = (CANVAS_DISPLAY_W * zoom / 100) / panelW;
    const scY = (CANVAS_DISPLAY_H * zoom / 100) / panelH;
    return { scX, scY };
  };

  const onElementMouseDown = (e: React.MouseEvent, id: string, handle?: string) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedId(id);
    if (editingTextId && editingTextId !== id) setEditingTextId(null);

    const el = localPanel.elements.find(x => x.id === id);
    if (!el) return;
    const { scX, scY } = getScales();

    dragRef.current = {
      type: handle ? 'resize' : 'move',
      elementId: id,
      handle,
      startMouse: { x: e.clientX, y: e.clientY },
      startEl: { x: el.x, y: el.y, w: el.width || 100, h: el.height || 100 },
      scaleX: scX, scaleY: scY,
    };
  };

  const onCanvasMouseMove = useCallback((e: React.MouseEvent) => {
    const d = dragRef.current;
    if (!d) return;

    const dx = (e.clientX - d.startMouse.x) / d.scaleX;
    const dy = (e.clientY - d.startMouse.y) / d.scaleY;
    const { x: sx, y: sy, w: sw, h: sh } = d.startEl;
    const ar = sw / sh;

    if (d.type === 'move') {
      // Snap al centro y bordes
      let nx = sx + dx;
      let ny = sy + dy;
      const el = localPanel.elements.find(x => x.id === d.elementId);
      const ew = el?.width || 100; const eh = el?.height || 100;
      const snapX = [0, panelW / 2 - ew / 2, panelW - ew];
      const snapY = [0, panelH / 2 - eh / 2, panelH - eh];
      snapX.forEach(s => { if (Math.abs(nx - s) < SNAP_THRESHOLD) nx = s; });
      snapY.forEach(s => { if (Math.abs(ny - s) < SNAP_THRESHOLD) ny = s; });
      setLocalPanel(prev => ({
        ...prev,
        elements: prev.elements.map(el => el.id === d.elementId ? { ...el, x: nx, y: ny } : el),
      }));
    } else if (d.type === 'resize' && d.handle) {
      let nx = sx, ny = sy, nw = sw, nh = sh;
      const h = d.handle;

      if (h.includes('e')) nw = Math.max(20, sw + dx);
      if (h.includes('s')) nh = Math.max(20, sh + dy);
      if (h.includes('w')) { nw = Math.max(20, sw - dx); nx = sx + sw - nw; }
      if (h.includes('n')) { nh = Math.max(20, sh - dy); ny = sy + sh - nh; }

      if (lockAR && (h === 'se' || h === 'sw' || h === 'ne' || h === 'nw')) {
        if (Math.abs(dx) > Math.abs(dy)) { nh = nw / ar; }
        else { nw = nh * ar; }
        if (h.includes('n')) ny = sy + sh - nh;
        if (h.includes('w')) nx = sx + sw - nw;
      }

      setLocalPanel(prev => ({
        ...prev,
        elements: prev.elements.map(el =>
          el.id === d.elementId ? { ...el, x: nx, y: ny, width: nw, height: nh } : el
        ),
      }));
    }
  }, [localPanel, panelW, panelH, lockAR]);

  const onCanvasMouseUp = useCallback(() => {
    if (!dragRef.current) return;
    // Commit el estado actual al historial al soltar
    setLocalPanel(prev => {
      commit(prev);
      return prev;
    });
    dragRef.current = null;
  }, [commit]);

  // ── Render de elementos en el canvas ─────────────────────────────────────
  const renderCanvasElement = (el: ComicElement) => {
    const { scX, scY } = getScales();
    const isSelected = el.id === selectedId;
    const isEditing = el.id === editingTextId;

    const left = el.x * scX;
    const top  = el.y * scY;
    const w    = (el.width  || 100) * scX;
    const h    = (el.height || 100) * scY;
    const bubbleType = (el as any).bubbleType as string | undefined;

    const wrapStyle: React.CSSProperties = {
      position: 'absolute',
      left, top,
      width: w,
      height: h,
      cursor: isSelected ? 'move' : 'pointer',
      outline: isSelected ? '2px solid #8b5cf6' : 'none',
      outlineOffset: 2,
      boxShadow: isSelected ? '0 0 0 1px rgba(139,92,246,0.3)' : 'none',
      userSelect: 'none',
      zIndex: isSelected ? 999 : (el.appearanceOrder || 1),
      transform: [
        (el as any).rotation ? `rotate(${(el as any).rotation}deg)` : '',
        (el as any).flipHorizontal ? 'scaleX(-1)' : '',
        (el as any).flipVertical   ? 'scaleY(-1)'  : '',
      ].filter(Boolean).join(' ') || undefined,
    };

    const innerStyle: React.CSSProperties = {
      width: '100%', height: '100%',
      overflow: 'hidden',
      borderRadius: bubbleType === 'speech' || bubbleType === 'thought' ? 12 : 0,
    };

    let inner: React.ReactNode = null;

    if (el.type === 'text') {
      if (bubbleType) {
        const bgColor  = (el as any).bgColor  || '#ffffff';
        const bdColor  = (el as any).borderColor || '#222222';
        inner = (
          <div style={{
            ...innerStyle,
            background: bgColor,
            border: `2px solid ${bdColor}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 8, position: 'relative',
          }}>
            {isEditing ? (
              <textarea
                autoFocus
                defaultValue={el.content}
                onBlur={e => { updateEl(el.id, { content: e.target.value }); setEditingTextId(null); }}
                style={{ width: '100%', height: '100%', border: 'none', background: 'transparent',
                         fontSize: (el.fontSize || 24) * scX / (CANVAS_DISPLAY_W / panelW * zoom / 100 * panelW / CANVAS_DISPLAY_W),
                         resize: 'none', outline: 'none', fontFamily: 'inherit', textAlign: 'center' }}
              />
            ) : (
              <span style={{ fontSize: Math.max(8, (el.fontSize || 24) * scX), color: el.color || '#1a1a1a',
                             fontWeight: el.fontWeight || 'normal', textAlign: 'center', wordBreak: 'break-word' }}>
                {el.content}
              </span>
            )}
            {/* Cola del globo */}
            {bubbleType === 'speech' && (
              <div style={{ position: 'absolute', bottom: -14, left: 24, width: 0, height: 0,
                borderLeft: '8px solid transparent', borderRight: '8px solid transparent',
                borderTop: `14px solid ${bdColor}` }} />
            )}
            {bubbleType === 'thought' && (
              <>
                <div style={{ position: 'absolute', bottom: -10, left: 20, width: 10, height: 10, borderRadius: '50%', background: bdColor }} />
                <div style={{ position: 'absolute', bottom: -18, left: 14, width: 7, height: 7, borderRadius: '50%', background: bdColor }} />
                <div style={{ position: 'absolute', bottom: -24, left: 10, width: 5, height: 5, borderRadius: '50%', background: bdColor }} />
              </>
            )}
            {bubbleType === 'caption' && (
              <div style={{ position: 'absolute', inset: 0, borderLeft: `6px solid ${bdColor}`, borderRadius: 0, pointerEvents: 'none' }} />
            )}
          </div>
        );
      } else {
        inner = isEditing ? (
          <textarea
            autoFocus
            defaultValue={el.content}
            onBlur={e => { updateEl(el.id, { content: e.target.value }); setEditingTextId(null); }}
            style={{ width: '100%', height: '100%', border: '1px dashed #8b5cf6', background: 'rgba(255,255,255,0.8)',
                     fontSize: Math.max(8, (el.fontSize || 24) * scX), resize: 'none', outline: 'none',
                     color: el.color || '#1a1a1a', fontWeight: el.fontWeight || 'normal',
                     fontStyle: el.fontStyle || 'normal', fontFamily: (el as any).fontFamily || 'Arial',
                     padding: 4, borderRadius: 4 }}
          />
        ) : (
          <div style={{ fontSize: Math.max(8, (el.fontSize || 24) * scX),
                        color: el.color || '#1a1a1a', fontWeight: el.fontWeight || 'normal',
                        fontStyle: el.fontStyle || 'normal', fontFamily: (el as any).fontFamily || 'Arial',
                        textDecoration: (el as any).textDecoration || 'none',
                        whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                        textShadow: '1px 1px 2px rgba(0,0,0,0.2)', lineHeight: 1.3 }}>
            {el.content || 'Texto'}
          </div>
        );
      }
    } else if (el.type === 'image') {
      inner = <img src={el.imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: (el as any).objectFit || 'contain', display: 'block' }} />;
    } else if (el.type === 'gif') {
      inner = <img src={el.gifUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }} />;
    } else if (el.type === 'shape') {
      inner = <div style={{ width: '100%', height: '100%', backgroundColor: el.color || '#6366f1', borderRadius: el.shape === 'circle' ? '50%' : 4 }} />;
    } else if (el.type === 'line') {
      inner = <div style={{ width: '100%', height: el.strokeWidth || 4, backgroundColor: el.color || '#1a1a1a', marginTop: 'auto', marginBottom: 'auto', position: 'absolute', top: '50%', transform: 'translateY(-50%)' }} />;
    } else if (el.type === 'arrow') {
      inner = (
        <svg viewBox="0 0 100 20" style={{ width: '100%', height: '100%' }} preserveAspectRatio="none">
          <defs><marker id={`ah-${el.id}`} markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto"><polygon points="0 0,8 3,0 6" fill={el.color || '#ef4444'} /></marker></defs>
          <line x1="0" y1="10" x2="94" y2="10" stroke={el.color || '#ef4444'} strokeWidth={el.strokeWidth || 4} markerEnd={`url(#ah-${el.id})`} />
        </svg>
      );
    } else if (el.type === 'sticker') {
      inner = (
        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: Math.min(w, h) * 0.75, lineHeight: 1, opacity: el.opacity ?? 1 }}>
          {el.stickerType || '⭐'}
        </div>
      );
    }

    return (
      <div
        key={el.id}
        style={wrapStyle}
        onMouseDown={e => onElementMouseDown(e, el.id)}
        onDoubleClick={() => { if (el.type === 'text') setEditingTextId(el.id); }}
        title={el.type === 'text' ? 'Doble clic para editar el texto' : undefined}
      >
        {inner}

        {/* ── Handles de resize ── */}
        {isSelected && !isEditing && HANDLES.map(h => (
          <div
            key={h.id}
            onMouseDown={e => { e.stopPropagation(); onElementMouseDown(e, el.id, h.id); }}
            style={{
              position: 'absolute',
              left: `calc(${h.x * 100}% - ${HANDLE_SIZE / 2}px)`,
              top:  `calc(${h.y * 100}% - ${HANDLE_SIZE / 2}px)`,
              width: HANDLE_SIZE, height: HANDLE_SIZE,
              background: '#8b5cf6',
              border: '2px solid white',
              borderRadius: 2,
              cursor: h.cursor,
              zIndex: 1001,
              boxShadow: '0 1px 4px rgba(0,0,0,0.4)',
            }}
          />
        ))}

        {/* ── Toolbar flotante encima del elemento ── */}
        {isSelected && !isEditing && (
          <div style={{
            position: 'absolute', top: -36, left: '50%', transform: 'translateX(-50%)',
            display: 'flex', gap: 4, background: '#1e1b4b', borderRadius: 8,
            padding: '4px 8px', whiteSpace: 'nowrap', zIndex: 1002, boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
          }}>
            {el.type === 'text' && (
              <button onClick={() => setEditingTextId(el.id)} title="Editar texto"
                className="text-white hover:text-purple-300 text-xs px-1">✏️</button>
            )}
            <button onClick={() => { commit({ ...localPanel, elements: [...localPanel.elements.filter(x => x.id !== el.id), el] }); }} title="Al frente" className="text-white hover:text-purple-300 text-xs px-1">⬆︎</button>
            <button onClick={() => { const els = [...localPanel.elements]; const i = els.findIndex(x => x.id === el.id); if (i > 0) { [els[i], els[i-1]] = [els[i-1], els[i]]; commit({ ...localPanel, elements: els }); } }} title="Atrás" className="text-white hover:text-purple-300 text-xs px-1">⬇︎</button>
            <div style={{ width: 1, background: '#4c1d95', margin: '0 2px' }} />
            <button onClick={() => deleteEl(el.id)} title="Eliminar" className="text-red-400 hover:text-red-300 text-xs px-1">🗑</button>
          </div>
        )}
      </div>
    );
  };

  // ── Hint de snap ─────────────────────────────────────────────────────────
  const snapLines = (() => {
    if (!dragRef.current || dragRef.current.type !== 'move' || !selected) return null;
    const { scX, scY } = getScales();
    const lines: React.ReactNode[] = [];
    const cx = selected.x + (selected.width || 0) / 2;
    const cy = selected.y + (selected.height || 0) / 2;
    if (Math.abs(cx - panelW / 2) < SNAP_THRESHOLD)
      lines.push(<div key="vx" style={{ position: 'absolute', left: CANVAS_DISPLAY_W * zoom / 100 / 2 - 0.5, top: 0, width: 1, height: '100%', background: 'rgba(139,92,246,0.7)', pointerEvents: 'none' }} />);
    if (Math.abs(cy - panelH / 2) < SNAP_THRESHOLD)
      lines.push(<div key="hy" style={{ position: 'absolute', top: CANVAS_DISPLAY_H * zoom / 100 / 2 - 0.5, left: 0, height: 1, width: '100%', background: 'rgba(139,92,246,0.7)', pointerEvents: 'none' }} />);
    return lines;
  })();

  // ── Panel lateral: propiedades del elemento seleccionado ──────────────────
  const [propSection, setPropSection] = useState<Record<string, boolean>>({ position: true, style: true, text: true, anim: false });
  const toggle = (k: string) => setPropSection(p => ({ ...p, [k]: !p[k] }));

  const Section: React.FC<{ id: string; title: string; children: React.ReactNode }> = ({ id, title, children }) => (
    <div className="border border-gray-100 rounded-xl overflow-hidden">
      <button onClick={() => toggle(id)} className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 text-sm font-semibold text-gray-700">
        {title}
        {propSection[id] ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>
      {propSection[id] && <div className="p-3 space-y-3">{children}</div>}
    </div>
  );

  const Slider: React.FC<{ label: string; value: number; min: number; max: number; step?: number; unit?: string; onChange: (v: number) => void }> =
    ({ label, value, min, max, step = 1, unit = '', onChange }) => (
      <div>
        <div className="flex justify-between text-xs text-gray-500 mb-1"><span>{label}</span><span className="font-semibold text-gray-700">{Math.round(value)}{unit}</span></div>
        <input type="range" min={min} max={max} step={step} value={value} onChange={e => onChange(+e.target.value)}
          className="w-full h-1.5 bg-gray-200 rounded-full appearance-none cursor-pointer accent-purple-600" />
      </div>
    );

  const sortedEls = [...localPanel.elements].sort((a, b) => (a.appearanceOrder || 0) - (b.appearanceOrder || 0));

  // ── Export ────────────────────────────────────────────────────────────────
  const exportAsImage = async () => {
    const canvas = document.createElement('canvas');
    canvas.width = panelW; canvas.height = panelH;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = localPanel.backgroundColor || '#ffffff';
    ctx.fillRect(0, 0, panelW, panelH);
    if (localPanel.backgroundImage) {
      const img = new Image();
      await new Promise<void>(r => { img.onload = () => { ctx.drawImage(img, 0, 0, panelW, panelH); r(); }; img.src = localPanel.backgroundImage!; });
    }
    for (const el of sortedEls) {
      if (el.visible === false) continue;
      ctx.save();
      if (el.type === 'text') {
        ctx.font = `${el.fontWeight || 'normal'} ${el.fontSize || 24}px ${(el as any).fontFamily || 'Arial'}`;
        ctx.fillStyle = el.color || '#000'; ctx.fillText(el.content || '', el.x, el.y + (el.fontSize || 24));
      } else if ((el.type === 'image' || el.type === 'gif') && (el.imageUrl || el.gifUrl)) {
        const img = new Image();
        await new Promise<void>(r => { img.onload = () => { ctx.drawImage(img, el.x, el.y, el.width || 200, el.height || 150); r(); }; img.src = (el.imageUrl || el.gifUrl)!; });
      } else if (el.type === 'shape') {
        ctx.fillStyle = el.color || '#6366f1';
        if (el.shape === 'circle') { ctx.beginPath(); ctx.arc(el.x + (el.width||100)/2, el.y + (el.height||100)/2, (el.width||100)/2, 0, Math.PI*2); ctx.fill(); }
        else ctx.fillRect(el.x, el.y, el.width || 100, el.height || 100);
      }
      ctx.restore();
    }
    canvas.toBlob(b => {
      if (!b) return;
      const a = document.createElement('a');
      a.href = URL.createObjectURL(b); a.download = `panel-${Date.now()}.png`; a.click();
    });
  };

  // ─── JSX principal ────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-2">
      <div className="bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden"
           style={{ width: '98vw', maxWidth: 1280, height: '95vh' }}>

        {/* ── Top bar ── */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-white z-10 flex-shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-lg font-bold text-gray-800">✏️ Editor de Panel</span>
            <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
              <button onClick={undo} disabled={histIdx === 0} className="p-1.5 rounded hover:bg-white disabled:opacity-30 transition-all" title="Deshacer (Ctrl+Z)"><Undo className="w-4 h-4" /></button>
              <button onClick={redo} disabled={histIdx >= history.length - 1} className="p-1.5 rounded hover:bg-white disabled:opacity-30 transition-all" title="Rehacer (Ctrl+Y)"><Redo className="w-4 h-4" /></button>
            </div>
            <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
              <button onClick={() => setShowGrid(v => !v)} className={`p-1.5 rounded transition-all ${showGrid ? 'bg-purple-500 text-white' : 'hover:bg-white'}`} title="Cuadrícula"><Grid className="w-4 h-4" /></button>
              <button onClick={() => setLockAR(v => !v)} className={`p-1.5 rounded transition-all ${lockAR ? 'bg-purple-500 text-white' : 'hover:bg-white'}`} title={lockAR ? 'Proporción bloqueada' : 'Proporción libre'}>{lockAR ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}</button>
            </div>
            <div className="flex items-center gap-2 bg-gray-100 rounded-lg px-2 py-1">
              <button onClick={() => setZoom(z => Math.max(30, z - 10))} className="hover:text-purple-600"><ZoomOut className="w-4 h-4" /></button>
              <input type="range" min={30} max={150} value={zoom} onChange={e => setZoom(+e.target.value)} className="w-24 h-1.5 rounded accent-purple-600 cursor-pointer" />
              <button onClick={() => setZoom(z => Math.min(150, z + 10))} className="hover:text-purple-600"><ZoomIn className="w-4 h-4" /></button>
              <span className="text-xs font-semibold text-gray-600 min-w-[36px]">{zoom}%</span>
              <button onClick={() => setZoom(80)} className="text-xs text-purple-600 hover:underline">Reset</button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button onClick={exportAsImage} className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-all">
              <Download className="w-4 h-4" /> Exportar
            </button>
            <button onClick={() => { onPanelUpdate(localPanel); onClose(); }}
              className="flex items-center gap-1.5 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700 transition-all">
              <Save className="w-4 h-4" /> Guardar y Cerrar
            </button>
            <button onClick={() => { onPanelUpdate(localPanel); onClose(); }} className="p-2 rounded-lg hover:bg-gray-100"><X className="w-5 h-5" /></button>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">

          {/* ── Left: botones de elementos ── */}
          <div className="w-44 border-r border-gray-200 bg-gray-50 flex flex-col overflow-y-auto flex-shrink-0 p-3 gap-2">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Agregar</p>
            {ELEMENT_BUTTONS.map(btn => (
              <button key={btn.type} onClick={() => addElement(btn.type)}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-xs font-medium text-left transition-all ${COLOR_BTN[btn.color]}`}
                title={btn.desc}>
                {btn.icon ? <btn.icon className="w-4 h-4 flex-shrink-0" /> : <span className="text-base leading-none">{btn.emoji}</span>}
                <span>{btn.label}</span>
              </button>
            ))}

            <div className="border-t border-gray-200 pt-2 mt-1">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Fondo</p>
              <div className="flex items-center gap-2 mb-2">
                <label className="text-xs text-gray-600">Color</label>
                <input type="color" value={localPanel.backgroundColor || '#ffffff'}
                  onChange={e => commit({ ...localPanel, backgroundColor: e.target.value, backgroundImage: undefined })}
                  className="w-8 h-8 rounded-lg border cursor-pointer flex-shrink-0" />
              </div>
              <label className="flex items-center justify-center gap-1 px-2 py-2 bg-white border border-gray-200 rounded-lg text-xs text-gray-600 cursor-pointer hover:bg-gray-100 transition-all">
                <ImageIcon className="w-3.5 h-3.5" /> Imagen
                <input type="file" accept="image/*" className="hidden" onChange={e => {
                  const f = e.target.files?.[0]; if (!f) return;
                  const r = new FileReader(); r.onload = ev => commit({ ...localPanel, backgroundImage: ev.target?.result as string }); r.readAsDataURL(f);
                }} />
              </label>
              {localPanel.backgroundImage && (
                <button onClick={() => commit({ ...localPanel, backgroundImage: undefined })}
                  className="mt-1 w-full px-2 py-1.5 bg-red-50 border border-red-200 text-red-600 rounded-lg text-xs hover:bg-red-100">
                  🗑 Quitar fondo
                </button>
              )}
            </div>
          </div>

          {/* ── Center: canvas ── */}
          <div className="flex-1 bg-gray-800 overflow-auto relative flex items-start justify-center p-6"
               onClick={e => { if (e.target === e.currentTarget) setSelectedId(null); }}>

            {/* Hint para usuarios nuevos */}
            {localPanel.elements.length === 0 && (
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none" style={{ zIndex: 10 }}>
                <div className="bg-black/50 text-white rounded-2xl px-8 py-6 text-center max-w-xs">
                  <p className="text-4xl mb-3">👈</p>
                  <p className="font-semibold text-lg mb-1">¡Comienza aquí!</p>
                  <p className="text-sm opacity-80">Usa los botones de la izquierda para agregar texto, imágenes y más a tu panel.</p>
                </div>
              </div>
            )}

            <div
              ref={canvasRef}
              className="relative bg-white shadow-2xl flex-shrink-0"
              style={{
                width:  CANVAS_DISPLAY_W * zoom / 100,
                height: CANVAS_DISPLAY_H * zoom / 100,
                backgroundColor: localPanel.backgroundColor || '#ffffff',
                backgroundImage: localPanel.backgroundImage ? `url(${localPanel.backgroundImage})` : undefined,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                cursor: dragRef.current ? 'grabbing' : 'default',
              }}
              onMouseMove={onCanvasMouseMove}
              onMouseUp={onCanvasMouseUp}
              onMouseLeave={onCanvasMouseUp}
              onClick={e => { if (e.target === e.currentTarget) setSelectedId(null); }}
            >
              {/* Grid */}
              {showGrid && (
                <div className="absolute inset-0 pointer-events-none opacity-20" style={{ zIndex: 0 }}>
                  <svg width="100%" height="100%">
                    <defs><pattern id="grid" width={20 * zoom / 100} height={20 * zoom / 100} patternUnits="userSpaceOnUse">
                      <path d={`M ${20 * zoom / 100} 0 L 0 0 0 ${20 * zoom / 100}`} fill="none" stroke="#888" strokeWidth="0.5" />
                    </pattern></defs>
                    <rect width="100%" height="100%" fill="url(#grid)" />
                  </svg>
                </div>
              )}

              {/* Guías de snap */}
              {snapLines}

              {/* Elementos */}
              {sortedEls.filter(e => e.visible !== false).map(renderCanvasElement)}
            </div>
          </div>

          {/* ── Right: propiedades ── */}
          <div className="w-72 border-l border-gray-200 bg-white flex flex-col overflow-y-auto flex-shrink-0">
            <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
              <p className="text-sm font-bold text-gray-700 flex items-center gap-2">
                <Layers className="w-4 h-4 text-purple-600" />
                {selected ? `Elemento: ${selected.type}` : 'Propiedades'}
              </p>
              {!selected && <p className="text-xs text-gray-400 mt-0.5">Selecciona un elemento en el canvas</p>}
            </div>

            <div className="flex-1 p-3 space-y-3 overflow-y-auto">
              {!selected ? (
                /* ── Sin selección: config del panel ── */
                <div className="space-y-3">
                  <Section id="panelConfig" title="⚙️ Configuración del Panel">
                    <div className="grid grid-cols-2 gap-2">
                      <div><label className="block text-xs text-gray-500 mb-1">Ancho (px)</label>
                        <input type="number" min={400} max={4000} value={panelW} onChange={e => commit({ ...localPanel, panelWidth: +e.target.value })}
                          className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm" /></div>
                      <div><label className="block text-xs text-gray-500 mb-1">Alto (px)</label>
                        <input type="number" min={400} max={4000} value={panelH} onChange={e => commit({ ...localPanel, panelHeight: +e.target.value })}
                          className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm" /></div>
                    </div>
                    <div className="grid grid-cols-3 gap-1.5 text-xs">
                      {[['16:9','1920','1080'],['4:3','1600','1200'],['1:1','1080','1080'],['Cómic','816','1056']].map(([l,w,h]) => (
                        <button key={l} onClick={() => commit({ ...localPanel, panelWidth: +w, panelHeight: +h })}
                          className="px-2 py-1.5 bg-gray-100 hover:bg-purple-100 hover:text-purple-700 rounded-lg transition-all font-medium">{l}</button>
                      ))}
                    </div>
                  </Section>

                  {/* Lista de elementos */}
                  <div>
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Capas ({localPanel.elements.length})</p>
                    <div className="space-y-1">
                      {[...sortedEls].reverse().map((el, i) => (
                        <div key={el.id} onClick={() => setSelectedId(el.id)}
                          className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-all text-sm ${selectedId === el.id ? 'bg-purple-100 text-purple-800' : 'hover:bg-gray-100 text-gray-700'}`}>
                          <span className="text-base">{el.type==='text'?'📝':el.type==='image'||el.type==='gif'?'🖼️':el.type==='shape'?'⬛':el.type==='sticker'?el.stickerType||'⭐':el.type==='arrow'?'➡️':'➖'}</span>
                          <span className="flex-1 truncate text-xs">{el.type === 'text' ? (el.content?.slice(0,20) || 'Texto') : el.type}</span>
                          <button onClick={e => { e.stopPropagation(); updateEl(el.id, { visible: el.visible !== false ? false : true }); }}
                            className="opacity-60 hover:opacity-100">{el.visible !== false ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5 text-red-400" />}</button>
                          <button onClick={e => { e.stopPropagation(); deleteEl(el.id); }} className="opacity-60 hover:opacity-100 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                /* ── Con selección: propiedades del elemento ── */
                <div className="space-y-3">
                  {/* Quick actions */}
                  <div className="flex gap-2 flex-wrap">
                    <button onClick={() => deleteEl(selected.id)} className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-red-50 border border-red-200 text-red-600 rounded-lg text-xs font-medium hover:bg-red-100"><Trash2 className="w-3.5 h-3.5" />Eliminar</button>
                    <button onClick={() => {
                      const copy = { ...selected, id: uuidv4(), x: selected.x + 30, y: selected.y + 30 };
                      commit({ ...localPanel, elements: [...localPanel.elements, copy] });
                      setSelectedId(copy.id);
                    }} className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-blue-50 border border-blue-200 text-blue-600 rounded-lg text-xs font-medium hover:bg-blue-100"><Copy className="w-3.5 h-3.5" />Duplicar</button>
                  </div>

                  {/* Posición y tamaño */}
                  <Section id="position" title="📐 Posición y Tamaño">
                    <div className="grid grid-cols-2 gap-2">
                      {[['X', 'x', 0, panelW], ['Y', 'y', 0, panelH], ['Ancho', 'width', 10, panelW], ['Alto', 'height', 10, panelH]].map(([label, key, min, max]) => (
                        <div key={key as string}>
                          <label className="block text-xs text-gray-500 mb-1">{label as string}</label>
                          <input type="number" min={min as number} max={max as number}
                            value={Math.round((selected as any)[key as string] || 0)}
                            onChange={e => updateEl(selected.id, { [key as string]: +e.target.value })}
                            className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm" />
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center justify-between text-xs text-gray-500 mt-1">
                      <span>Mantener proporción al redimensionar</span>
                      <button onClick={() => setLockAR(v => !v)} className={`p-1 rounded ${lockAR ? 'text-purple-600' : 'text-gray-400'}`}>{lockAR ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}</button>
                    </div>
                    <div className="pt-1 border-t border-gray-100 text-xs text-gray-400">
                      💡 Arrastra las esquinas del elemento para redimensionar
                    </div>
                  </Section>

                  {/* Estilo (texto) */}
                  {selected.type === 'text' && (
                    <Section id="textStyle" title="🔤 Estilo de Texto">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Contenido</label>
                        <textarea value={selected.content || ''} onChange={e => updateEl(selected.id, { content: e.target.value })}
                          rows={3} className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm resize-none focus:border-purple-400 focus:outline-none" />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Fuente</label>
                        <select value={(selected as any).fontFamily || 'Arial'} onChange={e => updateEl(selected.id, { fontFamily: e.target.value } as any)}
                          className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm bg-white">
                          {['Arial','Comic Sans MS','Impact','Georgia','Verdana','Courier New','Times New Roman','Helvetica'].map(f => <option key={f} value={f}>{f}</option>)}
                        </select>
                      </div>
                      <Slider label="Tamaño" value={selected.fontSize || 24} min={8} max={200} unit="px" onChange={v => updateEl(selected.id, { fontSize: v })} />
                      <div className="grid grid-cols-2 gap-2">
                        <div><label className="block text-xs text-gray-500 mb-1">Color texto</label><input type="color" value={selected.color || '#000000'} onChange={e => updateEl(selected.id, { color: e.target.value })} className="w-full h-9 border border-gray-200 rounded-lg cursor-pointer" /></div>
                        {(selected as any).bubbleType && <div><label className="block text-xs text-gray-500 mb-1">Color fondo</label><input type="color" value={(selected as any).bgColor || '#ffffff'} onChange={e => updateEl(selected.id, { bgColor: e.target.value } as any)} className="w-full h-9 border border-gray-200 rounded-lg cursor-pointer" /></div>}
                      </div>
                      <div className="flex gap-2">
                        {[
                          { label: 'N', prop: 'fontWeight', on: 'bold', off: 'normal', style: 'font-bold' },
                          { label: 'I', prop: 'fontStyle', on: 'italic', off: 'normal', style: 'italic' },
                          { label: 'S', prop: 'textDecoration', on: 'underline', off: 'none', style: 'underline' },
                        ].map(({ label, prop, on, off, style }) => (
                          <button key={prop} onClick={() => updateEl(selected.id, { [prop]: (selected as any)[prop] === on ? off : on } as any)}
                            className={`flex-1 py-2 rounded-lg text-sm border transition-all ${(selected as any)[prop] === on ? 'bg-purple-600 text-white border-purple-600' : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'} ${style}`}>
                            {label}
                          </button>
                        ))}
                      </div>
                    </Section>
                  )}

                  {/* Color para shapes */}
                  {(selected.type === 'shape' || selected.type === 'line' || selected.type === 'arrow') && (
                    <Section id="shapeStyle" title="🎨 Color">
                      <div><label className="block text-xs text-gray-500 mb-1">Color</label><input type="color" value={selected.color || '#6366f1'} onChange={e => updateEl(selected.id, { color: e.target.value })} className="w-full h-10 border border-gray-200 rounded-lg cursor-pointer" /></div>
                      {(selected.type === 'line' || selected.type === 'arrow') && <Slider label="Grosor" value={selected.strokeWidth || 4} min={1} max={20} unit="px" onChange={v => updateEl(selected.id, { strokeWidth: v })} />}
                    </Section>
                  )}

                  {/* Sticker */}
                  {selected.type === 'sticker' && (
                    <Section id="stickerStyle" title="😊 Emoji">
                      <div><label className="block text-xs text-gray-500 mb-1">Emoji</label>
                        <input type="text" value={selected.stickerType || '⭐'} onChange={e => updateEl(selected.id, { stickerType: e.target.value })}
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-3xl text-center" maxLength={2} /></div>
                      <Slider label="Opacidad" value={(selected.opacity || 1) * 100} min={10} max={100} unit="%" onChange={v => updateEl(selected.id, { opacity: v / 100 })} />
                    </Section>
                  )}

                  {/* Imagen */}
                  {(selected.type === 'image' || selected.type === 'gif') && (
                    <Section id="imgStyle" title="🖼️ Imagen">
                      <Slider label="Opacidad" value={(selected.opacity || 1) * 100} min={10} max={100} unit="%" onChange={v => updateEl(selected.id, { opacity: v / 100 })} />
                      <div><label className="block text-xs text-gray-500 mb-1">Ajuste</label>
                        <select value={(selected as any).objectFit || 'contain'} onChange={e => updateEl(selected.id, { objectFit: e.target.value } as any)}
                          className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm bg-white">
                          <option value="contain">Ajustar (Contain)</option>
                          <option value="cover">Rellenar (Cover)</option>
                          <option value="fill">Estirar (Fill)</option>
                        </select>
                      </div>
                    </Section>
                  )}

                  {/* Animaciones */}
                  <Section id="anim" title="🎬 Animación de Entrada">
                    <p className="text-xs text-gray-400 -mt-1">Se reproduce al mostrar el panel</p>
                    <select value={selected.entranceAnimation?.type || ''}
                      onChange={e => { const t = e.target.value as any; updateEl(selected.id, { entranceAnimation: t ? { type: t, duration: 800, delay: 0 } : undefined }); }}
                      className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm bg-white">
                      <option value="">Sin animación</option>
                      <option value="fadeIn">✨ Aparecer (Fade)</option>
                      <option value="slideIn">➡️ Deslizar</option>
                      <option value="zoomIn">🔍 Zoom In</option>
                      <option value="bounceIn">🏀 Rebotar</option>
                      {selected.type === 'text' && <option value="typewriter">⌨️ Máquina de escribir</option>}
                    </select>
                    {selected.entranceAnimation && (
                      <>
                        <Slider label="Duración" value={selected.entranceAnimation.duration} min={200} max={3000} step={100} unit="ms" onChange={v => updateEl(selected.id, { entranceAnimation: { ...selected.entranceAnimation!, duration: v } })} />
                        <Slider label="Retraso" value={selected.entranceAnimation.delay || 0} min={0} max={3000} step={100} unit="ms" onChange={v => updateEl(selected.id, { entranceAnimation: { ...selected.entranceAnimation!, delay: v } })} />
                        {selected.entranceAnimation.type === 'slideIn' && (
                          <div><label className="block text-xs text-gray-500 mb-1">Dirección</label>
                            <select value={selected.entranceAnimation.direction || 'left'} onChange={e => updateEl(selected.id, { entranceAnimation: { ...selected.entranceAnimation!, direction: e.target.value as any } })}
                              className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm bg-white">
                              <option value="left">Desde la izquierda</option><option value="right">Desde la derecha</option>
                              <option value="up">Desde arriba</option><option value="down">Desde abajo</option>
                            </select>
                          </div>
                        )}
                        <button onClick={() => { setPreviewAnim(true); setAnimKey(k => k + 1); setTimeout(() => setPreviewAnim(false), 3000); }}
                          className="w-full py-2 bg-purple-100 text-purple-700 border border-purple-200 rounded-lg text-xs font-medium hover:bg-purple-200">
                          ▶ Previsualizar animación
                        </button>
                      </>
                    )}
                  </Section>

                  {/* Visibilidad */}
                  <div className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-lg text-sm">
                    <span className="text-gray-600">Visible en el panel</span>
                    <button onClick={() => updateEl(selected.id, { visible: selected.visible !== false ? false : true })}
                      className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${selected.visible !== false ? 'bg-green-500 text-white' : 'bg-gray-300 text-gray-600'}`}>
                      {selected.visible !== false ? '👁 Visible' : '🙈 Oculto'}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Hint inferior */}
            <div className="px-4 py-3 border-t border-gray-100 bg-gray-50 text-xs text-gray-400 space-y-0.5 flex-shrink-0">
              <p>• <b>Clic</b> para seleccionar · <b>Arrastrar</b> para mover</p>
              <p>• <b>Esquinas moradas</b> para redimensionar</p>
              <p>• <b>Doble clic</b> en texto para editar</p>
              <p>• <b>Ctrl+Z</b> para deshacer</p>
            </div>
          </div>
        </div>

        {/* ── Status bar ── */}
        <div className="flex items-center justify-between px-4 py-2 border-t border-gray-200 bg-gray-50 text-xs text-gray-500 flex-shrink-0">
          <span>{localPanel.elements.length} elementos · {panelW}×{panelH}px</span>
          {selected && <span className="text-purple-600 font-medium">Seleccionado: {selected.type} — {Math.round(selected.x)}, {Math.round(selected.y)} · {Math.round(selected.width || 0)}×{Math.round(selected.height || 0)}px</span>}
          <span>Zoom: {zoom}%</span>
        </div>
      </div>
    </div>
  );
};

export default AdvancedPanelEditor;