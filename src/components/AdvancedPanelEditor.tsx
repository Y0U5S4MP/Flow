import React, { useState, useRef, useEffect, useCallback, useLayoutEffect } from 'react';
import { Panel, ComicElement, ElementAnimation } from '../types/Comic';
import TransitionSettings from './TransitionSettings';
import { injectEntranceCSS, buildEntranceAnimation } from './ViewerCanvas';
import {
  X, Undo, Redo, Grid2x2 as Grid, ZoomIn, ZoomOut,
  Type, Square, Circle, Trash2, Eye, EyeOff, Download,
  Image as ImageIcon, ArrowUp, ArrowDown, Play, Lock, Unlock,
  Minus, ArrowRight, Smile, Settings, Save, Copy,
  Bold, Italic, Underline, ChevronDown, ChevronUp,
  Move, Layers, Pencil, MessageCircle, MessageSquare,
  FileText, Film, AlignLeft, Palette, Clapperboard,
  GripVertical, Timer,
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
  { type: 'text',         icon: Type,          label: 'Texto',        desc: 'Texto libre',           color: 'blue'   },
  { type: 'speech',       icon: MessageCircle, label: 'Globo',        desc: 'Globo de diálogo',      color: 'green'  },
  { type: 'thought',      icon: MessageSquare, label: 'Pensamiento',  desc: 'Burbuja de pensamiento',color: 'purple' },
  { type: 'caption',      icon: FileText,      label: 'Narración',    desc: 'Caja de narrador',      color: 'yellow' },
  { type: 'shape-rect',   icon: Square,        label: 'Rectángulo',   desc: 'Forma cuadrada',        color: 'orange' },
  { type: 'shape-circle', icon: Circle,        label: 'Círculo',      desc: 'Forma circular',        color: 'orange' },
  { type: 'image',        icon: ImageIcon,     label: 'Imagen/GIF',   desc: 'Imagen o GIF animado',  color: 'indigo' },
  { type: 'video',        icon: Film,          label: 'Video',        desc: 'Video MP4/WebM',        color: 'red'    },
  { type: 'sticker',      icon: Smile,         label: 'Emoji',        desc: 'Emoji decorativo',      color: 'pink'   },
  { type: 'line',         icon: Minus,         label: 'Línea',        desc: 'Línea recta',           color: 'gray'   },
  { type: 'arrow',        icon: ArrowRight,    label: 'Flecha',       desc: 'Flecha direccional',    color: 'gray'   },
] as const;

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

  useEffect(() => { injectEntranceCSS(); }, []);

  // Order editor drag state
  const [dragOrderIdx, setDragOrderIdx] = useState<number | null>(null);

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

  // RAF ref for throttling mouse move
  const rafRef = useRef<number | undefined>(undefined);

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

  // ── Scroll preservation for right panel ──────────────────────────────────
  const rightPanelRef  = useRef<HTMLDivElement>(null);
  const rightScrollRef = useRef(0);
  const prevSelIdRef   = useRef<string | null | undefined>(undefined);

  useLayoutEffect(() => {
    const el = rightPanelRef.current;
    if (!el) return;
    if (prevSelIdRef.current !== undefined && selectedId === prevSelIdRef.current) {
      el.scrollTop = rightScrollRef.current;
    }
    prevSelIdRef.current = selectedId;
  });

  // ── Auto-preview timer ────────────────────────────────────────────────────
  const previewTimerRef = useRef<ReturnType<typeof setTimeout>>();

  // ── Helpers ───────────────────────────────────────────────────────────────
  const updateEl = (id: string, changes: Partial<ComicElement>) => {
    commit({
      ...localPanel,
      elements: localPanel.elements.map(e => e.id === id ? { ...e, ...changes } : e),
    });
    // Auto-preview entrance animation on every property change
    const base = localPanel.elements.find(e => e.id === id);
    if (!base) return;
    const merged = { ...base, ...changes };
    if (merged.entranceAnimation?.type) {
      clearTimeout(previewTimerRef.current);
      setPreviewAnim(true);
      setAnimKey(k => k + 1);
      const total = (merged.entranceAnimation.duration || 500) + (merged.entranceAnimation.delay || 0) + 300;
      previewTimerRef.current = setTimeout(() => setPreviewAnim(false), total);
    }
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
      input.type = 'file'; input.accept = 'image/jpeg,image/png,image/webp,image/gif,image/svg+xml';
      input.onchange = e => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (!file) return;
        if (file.size > 15 * 1024 * 1024) { alert('Imagen demasiado grande (máx 15 MB)'); return; }
        const allowed = ['image/jpeg','image/png','image/webp','image/gif','image/svg+xml'];
        if (!allowed.includes(file.type)) { alert('Formato no permitido'); return; }
        const r = new FileReader();
        r.onload = ev => {
          const url = ev.target?.result as string;
          const isGif = file.type === 'image/gif';
          if (isGif) {
            const newEl: ComicElement = {
              id: uuidv4(), type: 'gif',
              x: cx, y: cy, width: Math.round(panelW * 0.4), height: Math.round(panelH * 0.4),
              gifUrl: url, appearanceOrder: maxOrder + 1,
            };
            commit({ ...localPanel, elements: [...localPanel.elements, newEl] });
            setSelectedId(newEl.id);
          } else {
            const img = new Image();
            img.onload = () => {
              const scale = Math.min((panelW * 0.7) / img.naturalWidth, (panelH * 0.7) / img.naturalHeight, 1);
              const w = Math.round(img.naturalWidth * scale);
              const h = Math.round(img.naturalHeight * scale);
              const newEl: ComicElement = {
                id: uuidv4(), type: 'image',
                x: Math.round((panelW - w) / 2), y: Math.round((panelH - h) / 2),
                width: w, height: h,
                imageUrl: url, appearanceOrder: maxOrder + 1,
              };
              commit({ ...localPanel, elements: [...localPanel.elements, newEl] });
              setSelectedId(newEl.id);
            };
            img.src = url;
          }
        };
        r.readAsDataURL(file);
      };
      input.click();
      return;
    } else if (type === 'video') {
      const input = document.createElement('input');
      input.type = 'file'; input.accept = 'video/mp4,video/webm,video/ogg';
      input.onchange = e => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (!file) return;
        if (file.size > 150 * 1024 * 1024) { alert('Video demasiado grande (máx 150 MB)'); return; }
        const allowed = ['video/mp4','video/webm','video/ogg'];
        if (!allowed.includes(file.type)) { alert('Formato de video no permitido (MP4, WebM u OGG)'); return; }
        const r = new FileReader();
        r.onload = ev => {
          const url = ev.target?.result as string;
          // Detect natural video dimensions before inserting
          const probe = document.createElement('video');
          const insertVideo = (vw: number, vh: number) => {
            const scale = Math.min((panelW * 0.8) / vw, (panelH * 0.8) / vh);
            const w = Math.round(vw * scale);
            const h = Math.round(vh * scale);
            const newEl: ComicElement = {
              id: uuidv4(), type: 'video',
              x: Math.round((panelW - w) / 2), y: Math.round((panelH - h) / 2),
              width: w, height: h,
              videoUrl: url, autoplay: true, loop: true,
              objectFit: 'contain',
              appearanceOrder: maxOrder + 1,
            } as any;
            commit({ ...localPanel, elements: [...localPanel.elements, newEl] });
            setSelectedId(newEl.id);
          };
          probe.onloadedmetadata = () => {
            insertVideo(probe.videoWidth || 1280, probe.videoHeight || 720);
          };
          probe.onerror = () => insertVideo(1280, 720);
          probe.src = url;
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

    // Capture coordinates immediately (before RAF)
    const clientX = e.clientX;
    const clientY = e.clientY;

    if (rafRef.current !== undefined) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = undefined;
      const d2 = dragRef.current;
      if (!d2) return;

      const dx = (clientX - d2.startMouse.x) / d2.scaleX;
      const dy = (clientY - d2.startMouse.y) / d2.scaleY;
      const { x: sx, y: sy, w: sw, h: sh } = d2.startEl;
      const ar = sw / sh;

      if (d2.type === 'move') {
        let nx = sx + dx;
        let ny = sy + dy;
        setLocalPanel(prev => {
          const el = prev.elements.find(x => x.id === d2.elementId);
          const ew = el?.width || 100; const eh = el?.height || 100;
          const snapX = [0, panelW / 2 - ew / 2, panelW - ew];
          const snapY = [0, panelH / 2 - eh / 2, panelH - eh];
          snapX.forEach(s => { if (Math.abs(nx - s) < SNAP_THRESHOLD) nx = s; });
          snapY.forEach(s => { if (Math.abs(ny - s) < SNAP_THRESHOLD) ny = s; });
          return {
            ...prev,
            elements: prev.elements.map(el => el.id === d2.elementId ? { ...el, x: nx, y: ny } : el),
          };
        });
      } else if (d2.type === 'resize' && d2.handle) {
        let nx = sx, ny = sy, nw = sw, nh = sh;
        const h = d2.handle;

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
            el.id === d2.elementId ? { ...el, x: nx, y: ny, width: nw, height: nh } : el
          ),
        }));
      }
    });
  }, [panelW, panelH, lockAR]);

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

    // Entrance animation in preview mode (only for the selected element)
    const showingAnim = previewAnim && isSelected && el.entranceAnimation?.type;
    const animStr = showingAnim ? buildEntranceAnimation(el.entranceAnimation!) : '';

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
      ...(animStr ? { animation: animStr, willChange: 'transform, opacity' } : {}),
    };

    let inner: React.ReactNode = null;

    if (el.type === 'text') {
      if (bubbleType) {
        const bgColor = (el as any).bgColor      || '#ffffff';
        const bdColor = (el as any).borderColor  || '#222222';
        const spanStyle: React.CSSProperties = {
          fontSize: Math.max(8, (el.fontSize || 24) * scX),
          color: el.color || '#1a1a1a', fontWeight: el.fontWeight || 'normal',
          fontFamily: (el as any).fontFamily || 'Arial',
          textAlign: 'center', wordBreak: 'break-word', lineHeight: 1.3,
        };
        const editArea = isEditing ? (
          <textarea autoFocus defaultValue={el.content}
            onBlur={e => { updateEl(el.id, { content: e.target.value }); setEditingTextId(null); }}
            style={{ width: '100%', height: '100%', border: 'none', background: 'transparent',
                     fontSize: Math.max(8, (el.fontSize || 24) * scX),
                     resize: 'none', outline: 'none', fontFamily: 'inherit', textAlign: 'center' }} />
        ) : <span style={spanStyle}>{el.content}</span>;

        if (bubbleType === 'speech') {
          inner = (
            <svg viewBox="0 0 200 120" preserveAspectRatio="none"
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'visible' }}>
              <path d="M 15,0 H 185 Q 200,0 200,15 V 78 Q 200,93 185,93 H 58 L 28,120 L 46,93 H 15 Q 0,93 0,78 V 15 Q 0,0 15,0 Z"
                fill={bgColor} stroke={bdColor} strokeWidth="4" strokeLinejoin="round" />
              <foreignObject x="6" y="4" width="188" height="82">
                <div style={{ width: '100%', height: '100%', display: 'flex',
                  alignItems: 'center', justifyContent: 'center', boxSizing: 'border-box', padding: '4px 6px' }}>
                  {editArea}
                </div>
              </foreignObject>
            </svg>
          );
        } else if (bubbleType === 'thought') {
          inner = (
            <svg viewBox="0 0 200 130" preserveAspectRatio="none"
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'visible' }}>
              {/* Cloud shape: smooth bumpy-top path, flat bottom, entirely within viewBox */}
              <path
                d="M 35,88 C 15,88 5,76 8,63 C 4,48 18,36 35,40 C 30,22 48,12 65,18 C 70,6 90,4 100,8 C 110,4 130,6 135,18 C 152,12 170,22 165,40 C 182,36 196,48 192,63 C 195,76 185,88 165,88 Z"
                fill={bgColor} stroke={bdColor} strokeWidth="4" strokeLinejoin="round" strokeLinecap="round"
              />
              {/* Trailing thought dots */}
              <circle cx="40" cy="97"  r="9"   fill={bdColor} /><circle cx="40" cy="97"  r="6"   fill={bgColor} />
              <circle cx="27" cy="109" r="7"   fill={bdColor} /><circle cx="27" cy="109" r="4.5" fill={bgColor} />
              <circle cx="16" cy="119" r="5"   fill={bdColor} /><circle cx="16" cy="119" r="3"   fill={bgColor} />
              <foreignObject x="20" y="10" width="160" height="72">
                <div style={{ width: '100%', height: '100%', display: 'flex',
                  alignItems: 'center', justifyContent: 'center', boxSizing: 'border-box', padding: '4px 8px' }}>
                  {editArea}
                </div>
              </foreignObject>
            </svg>
          );
        } else {
          // caption
          inner = (
            <div style={{
              width: '100%', height: '100%', boxSizing: 'border-box',
              background: bgColor, border: `2px solid ${bdColor}`,
              borderLeft: `6px solid ${bdColor}`, borderRadius: 4,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: 8, position: 'relative',
            }}>
              {editArea}
            </div>
          );
        }
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
    } else if (el.type === 'video') {
      const fit = (el as any).objectFit || 'contain';
      inner = (
        <video src={el.videoUrl}
          style={{ width: '100%', height: '100%', objectFit: fit, display: 'block' }}
          autoPlay loop muted playsInline />
      );
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
        key={showingAnim ? `${el.id}-${animKey}` : el.id}
        style={wrapStyle}
        onMouseDown={e => {
          if (isEditing) return; // allow textarea to handle its own mouse/cursor events
          onElementMouseDown(e, el.id);
        }}
        onDoubleClick={() => { if (el.type === 'text') setEditingTextId(el.id); }}
        title={el.type === 'text' && !isEditing ? 'Doble clic para editar el texto' : undefined}
      >
        {/* Appearance order badge */}
        {(el.appearanceOrder ?? 0) > 0 && !isEditing && (
          <div style={{
            position: 'absolute', top: -9, left: -9,
            width: 18, height: 18, borderRadius: '50%',
            background: isSelected ? '#7c3aed' : '#6b7280',
            color: 'white', fontSize: 9, fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1003, boxShadow: '0 1px 4px rgba(0,0,0,0.4)',
            pointerEvents: 'none',
          }}>
            {el.appearanceOrder}
          </div>
        )}
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
                className="text-white hover:text-purple-300 p-0.5"><Pencil className="w-3.5 h-3.5" /></button>
            )}
            <button onClick={() => { commit({ ...localPanel, elements: [...localPanel.elements.filter(x => x.id !== el.id), el] }); }} title="Al frente" className="text-white hover:text-purple-300 p-0.5"><ArrowUp className="w-3.5 h-3.5" /></button>
            <button onClick={() => { const els = [...localPanel.elements]; const i = els.findIndex(x => x.id === el.id); if (i > 0) { [els[i], els[i-1]] = [els[i-1], els[i]]; commit({ ...localPanel, elements: els }); } }} title="Atrás" className="text-white hover:text-purple-300 p-0.5"><ArrowDown className="w-3.5 h-3.5" /></button>
            <div style={{ width: 1, background: '#4c1d95', margin: '0 2px' }} />
            <button onClick={() => deleteEl(el.id)} title="Eliminar" className="text-red-400 hover:text-red-300 p-0.5"><Trash2 className="w-3.5 h-3.5" /></button>
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

  const Section: React.FC<{
    id: string;
    title: string;
    icon?: React.ComponentType<{ className?: string }>;
    children: React.ReactNode;
  }> = ({ id, title, icon: Icon, children }) => (
    <div className="border border-gray-100 rounded-xl overflow-hidden">
      <button onClick={() => toggle(id)} className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 text-sm font-semibold text-gray-700">
        <span className="flex items-center gap-2">
          {Icon && <Icon className="w-4 h-4 text-purple-500" />}
          {title}
        </span>
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
            <span className="flex items-center gap-2 text-lg font-bold text-gray-800"><Pencil className="w-5 h-5 text-purple-600" />Editor de Panel</span>
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
                <btn.icon className="w-4 h-4 flex-shrink-0" />
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
                  className="mt-1 w-full flex items-center justify-center gap-1 px-2 py-1.5 bg-red-50 border border-red-200 text-red-600 rounded-lg text-xs hover:bg-red-100">
                  <Trash2 className="w-3 h-3" /> Quitar fondo
                </button>
              )}
            </div>
          </div>

          {/* ── Center: canvas ── */}
          <div className="flex-1 bg-gray-800 overflow-auto relative flex items-start justify-center p-6"
               onClick={e => { if (e.target === e.currentTarget) setSelectedId(null); }}
               onWheel={e => {
                 e.preventDefault();
                 setZoom(z => Math.min(150, Math.max(30, z + (e.deltaY < 0 ? 8 : -8))));
               }}>

            {/* Hint para usuarios nuevos */}
            {localPanel.elements.length === 0 && (
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none" style={{ zIndex: 10 }}>
                <div className="bg-black/60 text-white rounded-2xl px-8 py-6 text-center max-w-sm">
                  <AlignLeft className="w-10 h-10 mb-3 opacity-60 mx-auto" />
                  <p className="font-bold text-lg mb-2">Panel vacío</p>
                  <p className="text-sm opacity-80 mb-3">Agrega elementos desde el panel izquierdo:</p>
                  <div className="text-left text-sm space-y-1 opacity-70">
                    <p>• <b>Texto / Globo / Pensamiento</b> → para diálogos</p>
                    <p>• <b>Imagen / GIF / Video</b> → contenido multimedia</p>
                    <p>• <b>Formas / Emoji / Flecha</b> → decoraciones</p>
                  </div>
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
                {selected
                  ? ((selected as any).bubbleType === 'speech' ? 'Globo de diálogo' :
                     (selected as any).bubbleType === 'thought' ? 'Burbuja de pensamiento' :
                     (selected as any).bubbleType === 'caption' ? 'Caja de narración' :
                     selected.type === 'text' ? 'Texto' :
                     selected.type === 'image' ? 'Imagen' :
                     selected.type === 'gif' ? 'GIF' :
                     selected.type === 'video' ? 'Video' :
                     selected.type === 'shape' ? 'Forma' :
                     selected.type === 'sticker' ? 'Emoji' :
                     selected.type === 'line' ? 'Línea' :
                     selected.type === 'arrow' ? 'Flecha' : 'Elemento')
                  : 'Panel y Orden'}
              </p>
              {!selected && <p className="text-xs text-gray-400 mt-0.5">Haz clic en cualquier elemento del canvas para editarlo</p>}
            </div>

            <div
              ref={rightPanelRef}
              className="flex-1 p-3 space-y-3 overflow-y-auto"
              onScroll={e => { rightScrollRef.current = (e.currentTarget as HTMLDivElement).scrollTop; }}
            >
              {!selected ? (
                /* ── Sin selección: config del panel ── */
                <div className="space-y-3">
                  <Section id="panelConfig" title="Configuración del Panel" icon={Settings}>
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

                  {/* Transiciones del panel */}
                  <Section id="panelTransitions" title="Transiciones del Panel" icon={Clapperboard}>
                    <p className="text-xs text-gray-400 -mt-1 mb-2">Configuran cómo entra y sale este panel</p>
                    <div className="space-y-3">
                      <TransitionSettings
                        title="Transición de Entrada"
                        transition={localPanel.entranceTransition}
                        onUpdate={t => commit({ ...localPanel, entranceTransition: t })}
                      />
                      <TransitionSettings
                        title="Transición al Siguiente"
                        transition={localPanel.transitionToNext}
                        onUpdate={t => commit({ ...localPanel, transitionToNext: t })}
                      />
                      <TransitionSettings
                        title="Transición de Salida"
                        transition={localPanel.exitTransition}
                        onUpdate={t => commit({ ...localPanel, exitTransition: t })}
                      />
                    </div>
                  </Section>

                  {/* ── Orden de Aparición ── */}
                  <Section id="orderEditor" title="¿Cuándo aparece cada elemento?" icon={Timer}>
                    <p className="text-xs text-gray-500 -mt-1 mb-3">
                      Elige si todos aparecen juntos o de uno en uno al mostrar el panel.
                    </p>

                    {/* Quick-action buttons */}
                    <div className="grid grid-cols-2 gap-2 mb-3">
                      <button
                        onClick={() => {
                          const updated = localPanel.elements.map(e => ({
                            ...e, appearanceOrder: 1, entranceAnimation: undefined,
                          }));
                          commit({ ...localPanel, elements: updated });
                        }}
                        className="flex flex-col items-center gap-1 px-2 py-2.5 text-xs border-2 border-blue-200 bg-blue-50 text-blue-700 rounded-xl hover:bg-blue-100 transition-all"
                        title="Todos los elementos aparecen al mismo tiempo, sin animación"
                      >
                        <span className="text-base font-bold tracking-widest">■■■</span>
                        <span className="font-semibold">Todo a la vez</span>
                        <span className="text-blue-500 font-normal">(sin retraso)</span>
                      </button>
                      <button
                        onClick={() => {
                          const sorted = [...localPanel.elements].sort((a, b) => (a.appearanceOrder || 0) - (b.appearanceOrder || 0));
                          const updated = localPanel.elements.map(e => {
                            const idx = sorted.findIndex(s => s.id === e.id);
                            return {
                              ...e,
                              appearanceOrder: idx + 1,
                              entranceAnimation: { type: 'fadeIn' as const, duration: 400, delay: idx * 600 },
                            };
                          });
                          commit({ ...localPanel, elements: updated });
                        }}
                        className="flex flex-col items-center gap-1 px-2 py-2.5 text-xs border-2 border-purple-200 bg-purple-50 text-purple-700 rounded-xl hover:bg-purple-100 transition-all"
                        title="Cada elemento aparece 0.6 segundos después del anterior"
                      >
                        <span className="text-base font-bold">1 → 2 → 3</span>
                        <span className="font-semibold">Uno por uno</span>
                        <span className="text-purple-500 font-normal">(escalonado)</span>
                      </button>
                    </div>

                    {sortedEls.length > 0 && (
                      <p className="text-xs text-gray-400 mb-1.5">
                        Arrastra para reordenar · Clic para seleccionar
                      </p>
                    )}

                    <div className="space-y-1">
                      {sortedEls.map((el, idx) => {
                        const delay = el.entranceAnimation?.delay ?? 0;
                        const hasAnim = !!el.entranceAnimation;
                        const delayLabel = !hasAnim ? 'Sin animación' :
                                           delay === 0 ? 'Al instante' :
                                           delay < 1000 ? `+${delay / 1000}s` :
                                           `+${(delay / 1000).toFixed(1)}s`;
                        const elLabel =
                          (el as any).bubbleType === 'speech' ? 'Globo de diálogo' :
                          (el as any).bubbleType === 'thought' ? 'Pensamiento' :
                          (el as any).bubbleType === 'caption' ? 'Narración' :
                          el.type === 'text' ? (el.content?.slice(0, 16) || 'Texto') :
                          el.type === 'image' ? 'Imagen' :
                          el.type === 'gif' ? 'GIF' :
                          el.type === 'video' ? 'Video' :
                          el.type === 'shape' ? 'Forma' :
                          el.type === 'sticker' ? 'Emoji' :
                          el.type === 'line' ? 'Línea' :
                          el.type === 'arrow' ? 'Flecha' : el.type;

                        return (
                          <div
                            key={el.id}
                            draggable
                            onDragStart={() => setDragOrderIdx(idx)}
                            onDragOver={e => e.preventDefault()}
                            onDrop={() => {
                              if (dragOrderIdx === null || dragOrderIdx === idx) { setDragOrderIdx(null); return; }
                              const ordered = [...sortedEls];
                              const [moved] = ordered.splice(dragOrderIdx, 1);
                              ordered.splice(idx, 0, moved);
                              const updated = localPanel.elements.map(e => ({
                                ...e,
                                appearanceOrder: ordered.findIndex(o => o.id === e.id) + 1,
                              }));
                              commit({ ...localPanel, elements: updated });
                              setDragOrderIdx(null);
                            }}
                            onClick={() => setSelectedId(el.id)}
                            className={`flex items-center gap-2 px-2 py-2 rounded-lg cursor-grab text-xs select-none transition-all border ${
                              selectedId === el.id
                                ? 'bg-purple-50 border-purple-200 text-purple-800'
                                : 'hover:bg-gray-50 border-transparent text-gray-700'
                            } ${dragOrderIdx === idx ? 'opacity-40 scale-95' : ''}`}
                          >
                            <GripVertical className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                            <span className="w-5 h-5 rounded-full bg-purple-600 text-white text-xs flex items-center justify-center flex-shrink-0 font-bold">
                              {idx + 1}
                            </span>
                            <span className="flex-1 truncate font-medium">{elLabel}</span>
                            <span className={`text-xs px-1.5 py-0.5 rounded-full flex-shrink-0 whitespace-nowrap ${
                              hasAnim && delay > 0 ? 'bg-purple-100 text-purple-700' :
                              hasAnim ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                            }`}>
                              {delayLabel}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                    {sortedEls.length === 0 && (
                      <p className="text-xs text-gray-400 text-center py-2">Sin elementos aún</p>
                    )}
                  </Section>

                  {/* Capas */}
                  <div>
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Capas ({localPanel.elements.length})</p>
                    <div className="space-y-1">
                      {[...sortedEls].reverse().map((el) => (
                        <div key={el.id} onClick={() => setSelectedId(el.id)}
                          className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-all text-sm ${selectedId === el.id ? 'bg-purple-100 text-purple-800' : 'hover:bg-gray-100 text-gray-700'}`}>
                          <span className="w-4 h-4 flex items-center justify-center text-gray-500">
                            {el.type==='text' ? <Type className="w-3.5 h-3.5" /> :
                             el.type==='image'||el.type==='gif' ? <ImageIcon className="w-3.5 h-3.5" /> :
                             el.type==='video' ? <Film className="w-3.5 h-3.5" /> :
                             el.type==='shape' ? <Square className="w-3.5 h-3.5" /> :
                             el.type==='sticker' ? <Smile className="w-3.5 h-3.5" /> :
                             el.type==='arrow' ? <ArrowRight className="w-3.5 h-3.5" /> :
                             <Minus className="w-3.5 h-3.5" />}
                          </span>
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
                  <Section id="position" title="Posición y Tamaño" icon={Move}>
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
                      Arrastra las esquinas moradas para redimensionar
                    </div>
                  </Section>

                  {/* Estilo (texto) */}
                  {selected.type === 'text' && (
                    <Section id="textStyle" title="Texto y Estilo" icon={Type}>
                      {!(selected as any).bubbleType && (
                        <div className="flex items-start gap-2 p-2 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-700 mb-1">
                          <Pencil className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                          <span><b>Doble clic</b> en el texto del canvas para editarlo. Una vez abierto, haz clic donde quieras para posicionar el cursor.</span>
                        </div>
                      )}
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Contenido del texto</label>
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
                    <Section id="shapeStyle" title="Color y Trazo" icon={Palette}>
                      <div><label className="block text-xs text-gray-500 mb-1">Color</label><input type="color" value={selected.color || '#6366f1'} onChange={e => updateEl(selected.id, { color: e.target.value })} className="w-full h-10 border border-gray-200 rounded-lg cursor-pointer" /></div>
                      {(selected.type === 'line' || selected.type === 'arrow') && <Slider label="Grosor" value={selected.strokeWidth || 4} min={1} max={20} unit="px" onChange={v => updateEl(selected.id, { strokeWidth: v })} />}
                    </Section>
                  )}

                  {/* Sticker */}
                  {selected.type === 'sticker' && (
                    <Section id="stickerStyle" title="Emoji" icon={Smile}>
                      <div><label className="block text-xs text-gray-500 mb-1">Emoji</label>
                        <input type="text" value={selected.stickerType || '⭐'} onChange={e => updateEl(selected.id, { stickerType: e.target.value })}
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-3xl text-center" maxLength={2} /></div>
                      <Slider label="Opacidad" value={(selected.opacity || 1) * 100} min={10} max={100} unit="%" onChange={v => updateEl(selected.id, { opacity: v / 100 })} />
                    </Section>
                  )}

                  {/* Imagen / GIF */}
                  {(selected.type === 'image' || selected.type === 'gif') && (
                    <Section id="imgStyle" title="Imagen" icon={ImageIcon}>
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

                  {/* Video */}
                  {selected.type === 'video' && (
                    <Section id="videoStyle" title="Video" icon={Film}>
                      <div className="flex items-center justify-between text-sm text-gray-600 py-1">
                        <span>Reproducción automática</span>
                        <button onClick={() => updateEl(selected.id, { autoplay: !(selected.autoplay ?? true) })}
                          className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${(selected.autoplay ?? true) ? 'bg-green-500 text-white' : 'bg-gray-300 text-gray-600'}`}>
                          {(selected.autoplay ?? true) ? 'Activado' : 'Desactivado'}
                        </button>
                      </div>
                      <div className="flex items-center justify-between text-sm text-gray-600 py-1">
                        <span>Repetir (Loop)</span>
                        <button onClick={() => updateEl(selected.id, { loop: !(selected.loop ?? true) })}
                          className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${(selected.loop ?? true) ? 'bg-green-500 text-white' : 'bg-gray-300 text-gray-600'}`}>
                          {(selected.loop ?? true) ? 'Activado' : 'Desactivado'}
                        </button>
                      </div>
                      <Slider label="Opacidad" value={(selected.opacity || 1) * 100} min={10} max={100} unit="%" onChange={v => updateEl(selected.id, { opacity: v / 100 })} />
                      <div><label className="block text-xs text-gray-500 mb-1">Ajuste</label>
                        <select value={(selected as any).objectFit || 'cover'} onChange={e => updateEl(selected.id, { objectFit: e.target.value } as any)}
                          className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm bg-white">
                          <option value="cover">Rellenar (Cover)</option>
                          <option value="contain">Ajustar (Contain)</option>
                          <option value="fill">Estirar (Fill)</option>
                        </select>
                      </div>
                    </Section>
                  )}

                  {/* Animaciones */}
                  <Section id="anim" title="¿Cómo aparece este elemento?" icon={Play}>
                    <p className="text-xs text-gray-400 -mt-1 mb-2">Efecto visual cuando el elemento entra en pantalla</p>
                    <select value={selected.entranceAnimation?.type || ''}
                      onChange={e => { const t = e.target.value as any; updateEl(selected.id, { entranceAnimation: t ? { type: t, duration: 500, delay: 0 } : undefined }); }}
                      className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm bg-white">
                      <option value="">Sin efecto (aparece directamente)</option>
                      <option value="fadeIn">Aparecer gradualmente (Fade)</option>
                      <option value="slideIn">Entrar deslizando (Slide)</option>
                      <option value="zoomIn">Crecer desde el centro (Zoom)</option>
                      <option value="bounceIn">Entrar rebotando (Bounce)</option>
                      {selected.type === 'text' && <option value="typewriter">Escribirse letra a letra</option>}
                    </select>
                    {selected.entranceAnimation && (
                      <>
                        {selected.entranceAnimation.type === 'slideIn' && (
                          <div><label className="block text-xs text-gray-500 mb-1">¿Desde dónde entra?</label>
                            <select value={selected.entranceAnimation.direction || 'left'} onChange={e => updateEl(selected.id, { entranceAnimation: { ...selected.entranceAnimation!, direction: e.target.value as any } })}
                              className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm bg-white">
                              <option value="left">Desde la izquierda</option>
                              <option value="right">Desde la derecha</option>
                              <option value="up">Desde arriba</option>
                              <option value="down">Desde abajo</option>
                            </select>
                          </div>
                        )}

                        {/* Duración */}
                        <div>
                          <label className="block text-xs text-gray-500 mb-1.5">Velocidad del efecto</label>
                          <div className="flex gap-1.5 flex-wrap">
                            {([[200,'Rápido'],[500,'Normal'],[1000,'Lento'],[2000,'Muy lento']] as [number,string][]).map(([v, lbl]) => (
                              <button key={v}
                                onClick={() => updateEl(selected.id, { entranceAnimation: { ...selected.entranceAnimation!, duration: v } })}
                                className={`flex-1 py-1.5 text-xs rounded-lg border transition-all ${
                                  selected.entranceAnimation!.duration === v
                                    ? 'bg-purple-600 text-white border-purple-600'
                                    : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-purple-50'
                                }`}
                              >{lbl}</button>
                            ))}
                          </div>
                        </div>

                        {/* Retraso */}
                        <div>
                          <label className="block text-xs text-gray-500 mb-1.5">¿Cuándo aparece?</label>
                          <div className="flex gap-1.5 flex-wrap">
                            {([[0,'Al instante'],[500,'0.5s'],[1000,'1s'],[2000,'2s'],[3000,'3s']] as [number,string][]).map(([v, lbl]) => (
                              <button key={v}
                                onClick={() => updateEl(selected.id, { entranceAnimation: { ...selected.entranceAnimation!, delay: v } })}
                                className={`flex-1 py-1.5 text-xs rounded-lg border transition-all ${
                                  (selected.entranceAnimation!.delay || 0) === v
                                    ? 'bg-purple-600 text-white border-purple-600'
                                    : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-purple-50'
                                }`}
                              >{lbl}</button>
                            ))}
                          </div>
                          <p className="text-xs text-gray-400 mt-1">Tiempo de espera desde que aparece el panel</p>
                        </div>

                        <button onClick={() => { setPreviewAnim(true); setAnimKey(k => k + 1); setTimeout(() => setPreviewAnim(false), 3000); }}
                          className="w-full py-2 bg-purple-100 text-purple-700 border border-purple-200 rounded-lg text-xs font-medium hover:bg-purple-200">
                          ▶ Ver cómo se ve la animación
                        </button>
                      </>
                    )}
                  </Section>

                  {/* Visibilidad */}
                  <div className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-lg text-sm">
                    <span className="text-gray-600">Visible en el panel</span>
                    <button onClick={() => updateEl(selected.id, { visible: selected.visible !== false ? false : true })}
                      className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-all ${selected.visible !== false ? 'bg-green-500 text-white' : 'bg-gray-300 text-gray-600'}`}>
                      {selected.visible !== false ? <><Eye className="w-3.5 h-3.5" />Visible</> : <><EyeOff className="w-3.5 h-3.5" />Oculto</>}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Hint inferior */}
            <div className="px-4 py-3 border-t border-gray-100 bg-gray-50 text-xs text-gray-400 space-y-1 flex-shrink-0">
              <p className="font-semibold text-gray-500 text-xs uppercase tracking-wide mb-1">Guía rápida</p>
              <p>• <b>Clic</b> en un elemento para seleccionarlo</p>
              <p>• <b>Arrastrar</b> para mover · <b>Esquinas moradas</b> para redimensionar</p>
              <p>• <b>Doble clic</b> en texto para editar · luego clic para posicionar cursor</p>
              <p>• <b>Ctrl+Z</b> deshacer · <b>Ctrl+Y</b> rehacer</p>
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