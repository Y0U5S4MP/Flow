import React, { useState, useEffect, useCallback, useRef, useLayoutEffect } from 'react';
import { Play, Pause, ChevronLeft, ChevronRight, SkipBack, SkipForward, Maximize2, Minimize2 } from 'lucide-react';
import { Panel, PanelTransition } from '../types/Comic';
import ViewerCanvas from './ViewerCanvas';

interface ComicPlayerProps {
  panels: Panel[];
}

// ─── Panel-transition CSS (injected once) ─────────────────────────────────────
const ANIM_CSS = `
@keyframes _fadeIn    { from { opacity:0 }                to { opacity:1 } }
@keyframes _fadeOut   { from { opacity:1 }                to { opacity:0 } }
@keyframes _slideInL  { from { transform:translateX(-100%) } to { transform:translateX(0) } }
@keyframes _slideOutL { from { transform:translateX(0) }     to { transform:translateX(-100%) } }
@keyframes _slideInR  { from { transform:translateX( 100%) } to { transform:translateX(0) } }
@keyframes _slideOutR { from { transform:translateX(0) }     to { transform:translateX( 100%) } }
@keyframes _slideInU  { from { transform:translateY(-100%) } to { transform:translateY(0) } }
@keyframes _slideOutU { from { transform:translateY(0) }     to { transform:translateY(-100%) } }
@keyframes _slideInD  { from { transform:translateY( 100%) } to { transform:translateY(0) } }
@keyframes _slideOutD { from { transform:translateY(0) }     to { transform:translateY( 100%) } }
@keyframes _zoomIn    { from { transform:scale(0.3); opacity:0 } to { transform:scale(1);   opacity:1 } }
@keyframes _zoomOut   { from { transform:scale(1);   opacity:1 } to { transform:scale(0.3); opacity:0 } }
@keyframes _flipIn    { from { transform:perspective(600px) rotateY(90deg); opacity:0 } to { transform:perspective(600px) rotateY(0deg); opacity:1 } }
@keyframes _flipOut   { from { transform:perspective(600px) rotateY(0deg);  opacity:1 } to { transform:perspective(600px) rotateY(90deg); opacity:0 } }
@keyframes _wipeIn    { from { clip-path:inset(0 100% 0 0) } to { clip-path:inset(0 0% 0 0) } }
@keyframes _wipeOut   { from { clip-path:inset(0 0% 0 0) }   to { clip-path:inset(0 100% 0 0) } }
@keyframes _dissolveIn  { from { opacity:0; filter:blur(12px) } to { opacity:1; filter:blur(0) } }
@keyframes _dissolveOut { from { opacity:1; filter:blur(0) }    to { opacity:0; filter:blur(12px) } }
`;

function getAnimName(
  type: PanelTransition['type'],
  phase: 'in' | 'out',
  direction?: string,
): string {
  const d = direction || 'left';
  const dirMap: Record<string, string> = { left: 'L', right: 'R', up: 'U', down: 'D' };
  switch (type) {
    case 'fade':     return phase === 'in' ? '_fadeIn'    : '_fadeOut';
    case 'slide':    return phase === 'in' ? `_slideIn${dirMap[d]}`  : `_slideOut${dirMap[d]}`;
    case 'zoom':     return phase === 'in' ? '_zoomIn'    : '_zoomOut';
    case 'flip':     return phase === 'in' ? '_flipIn'    : '_flipOut';
    case 'wipe':     return phase === 'in' ? '_wipeIn'    : '_wipeOut';
    case 'dissolve': return phase === 'in' ? '_dissolveIn': '_dissolveOut';
    default:         return '';
  }
}

// ─── Component ────────────────────────────────────────────────────────────────
const ComicPlayer: React.FC<ComicPlayerProps> = ({ panels }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [displayIndex, setDisplayIndex]  = useState(0);
  const [isAutoPlay, setIsAutoPlay]      = useState(false);
  const [phase, setPhase]               = useState<'idle' | 'out' | 'in'>('idle');
  const [transition, setTransition]      = useState<PanelTransition | undefined>();
  const [isFullscreen, setIsFullscreen]  = useState(false);

  const busyRef      = useRef(false);
  const autoRef      = useRef<ReturnType<typeof setInterval>>();
  const containerRef = useRef<HTMLDivElement>(null);
  const panelAreaRef = useRef<HTMLDivElement>(null);

  // Computed panel size for fullscreen (JS-calculated to maintain AR perfectly)
  const [fsSize, setFsSize] = useState<{ width: number; height: number } | null>(null);

  // ── Inject CSS once ────────────────────────────────────────────────────────
  useEffect(() => {
    const id = '__comic_player_css';
    if (!document.getElementById(id)) {
      const s = document.createElement('style');
      s.id = id; s.textContent = ANIM_CSS;
      document.head.appendChild(s);
    }
  }, []);

  // ── Fullscreen panel sizing via ResizeObserver ─────────────────────────────
  useLayoutEffect(() => {
    if (!isFullscreen || !panelAreaRef.current) { setFsSize(null); return; }
    const ar = (panels[displayIndex]?.panelWidth || 800) / (panels[displayIndex]?.panelHeight || 600);
    const calc = (w: number, h: number) => {
      if (w / h > ar) setFsSize({ width: h * ar, height: h });
      else             setFsSize({ width: w,      height: w / ar });
    };
    const obs = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect;
      calc(width, height);
    });
    obs.observe(panelAreaRef.current);
    const { clientWidth: w, clientHeight: h } = panelAreaRef.current;
    calc(w, h);
    return () => obs.disconnect();
  }, [isFullscreen, displayIndex, panels]);

  // ── Navigate with transition ───────────────────────────────────────────────
  const navigate = useCallback((nextIdx: number) => {
    if (busyRef.current) return;
    if (nextIdx < 0 || nextIdx >= panels.length) return;
    if (nextIdx === currentIndex) return;

    const tr  = panels[currentIndex]?.transitionToNext;
    const dur = tr?.duration ?? 400;

    if (!tr || tr.type === 'none') {
      setDisplayIndex(nextIdx);
      setCurrentIndex(nextIdx);
      return;
    }

    busyRef.current = true;
    setTransition(tr);
    setPhase('out');

    setTimeout(() => {
      setDisplayIndex(nextIdx);
      setCurrentIndex(nextIdx);
      setPhase('in');
      setTimeout(() => {
        setPhase('idle');
        setTransition(undefined);
        busyRef.current = false;
      }, dur);
    }, dur);
  }, [currentIndex, panels]);

  // ── Keyboard ───────────────────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') navigate(currentIndex + 1);
      if (e.key === 'ArrowLeft')  navigate(currentIndex - 1);
      if (e.key === 'Escape' && isFullscreen) exitFS();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [navigate, currentIndex, isFullscreen]);

  // ── Fullscreen ─────────────────────────────────────────────────────────────
  const enterFS = useCallback(() => {
    setIsFullscreen(true);
    document.body.style.overflow = 'hidden';
    containerRef.current?.requestFullscreen().catch(() => {});
  }, []);

  const exitFS = useCallback(() => {
    setIsFullscreen(false);
    document.body.style.overflow = '';
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  }, []);

  const toggleFullscreen = useCallback(() => {
    isFullscreen ? exitFS() : enterFS();
  }, [isFullscreen, enterFS, exitFS]);

  // Sync when browser exits fullscreen (ESC key etc.)
  useEffect(() => {
    const onChange = () => {
      if (!document.fullscreenElement) {
        setIsFullscreen(false);
        document.body.style.overflow = '';
      }
    };
    document.addEventListener('fullscreenchange', onChange);
    return () => {
      document.removeEventListener('fullscreenchange', onChange);
      document.body.style.overflow = '';
    };
  }, []);

  // ── Autoplay ───────────────────────────────────────────────────────────────
  useEffect(() => {
    clearInterval(autoRef.current);
    if (!isAutoPlay) return;
    autoRef.current = setInterval(() => {
      setCurrentIndex(prev => {
        const next = prev + 1;
        if (next >= panels.length) { setIsAutoPlay(false); return prev; }
        navigate(next);
        return prev;
      });
    }, 3200);
    return () => clearInterval(autoRef.current);
  }, [isAutoPlay, panels.length, navigate]);

  if (panels.length === 0) return null;

  // ── Panel transition style ─────────────────────────────────────────────────
  const panelContainerStyle = (): React.CSSProperties => {
    if (!transition || transition.type === 'none' || phase === 'idle') return {};
    const animName = getAnimName(transition.type, phase === 'out' ? 'out' : 'in', transition.direction);
    if (!animName) return {};
    return {
      animation: `${animName} ${transition.duration ?? 400}ms ${transition.easing ?? 'ease-in-out'} both`,
      willChange: 'transform, opacity',
    };
  };

  const panel = panels[displayIndex];

  return (
    <div
      ref={containerRef}
      className={isFullscreen
        ? 'fixed inset-0 z-[9999] bg-gray-950 flex flex-col gap-3 overflow-hidden p-4'
        : 'space-y-4'}
    >
      {/* ── Panel view ── */}
      <div
        ref={panelAreaRef}
        className={isFullscreen
          ? 'flex-1 min-h-0 relative bg-gray-900 rounded-xl overflow-hidden'
          : 'relative bg-gray-900 rounded-xl overflow-hidden'}
      >
        {/* Counter */}
        <div className="absolute top-3 left-3 z-10 bg-black/70 text-white text-sm font-semibold px-3 py-1 rounded-full">
          {currentIndex + 1} / {panels.length}
        </div>
        {/* Fullscreen toggle */}
        <button
          onClick={toggleFullscreen}
          className="absolute top-3 right-3 z-10 p-1.5 bg-black/70 hover:bg-black/90 text-white rounded-lg transition-colors"
          title={isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
        >
          {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>

        {isFullscreen ? (
          /* Fullscreen: JS-calculated size to perfectly maintain AR */
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <div style={{
              ...(fsSize ? { width: fsSize.width, height: fsSize.height } : { width: '100%' }),
              ...panelContainerStyle(),
            }}>
              <ViewerCanvas key={displayIndex} panel={panel} isPlaying={isAutoPlay} />
            </div>
          </div>
        ) : (
          /* Normal: let ViewerCanvas fill width naturally */
          <div className="w-full overflow-hidden">
            <div style={panelContainerStyle()}>
              <ViewerCanvas key={displayIndex} panel={panel} isPlaying={isAutoPlay} />
            </div>
          </div>
        )}
      </div>

      {/* ── Controls ── */}
      <div className="flex items-center justify-center gap-3 bg-gray-800 rounded-xl p-4 flex-shrink-0">
        <button onClick={() => navigate(0)} disabled={currentIndex === 0 || phase !== 'idle'}
          className="p-2 rounded-lg bg-gray-700 hover:bg-gray-600 disabled:opacity-30 text-white transition-colors" title="Primer panel">
          <SkipBack className="w-5 h-5" />
        </button>
        <button onClick={() => navigate(currentIndex - 1)} disabled={currentIndex === 0 || phase !== 'idle'}
          className="p-2 rounded-lg bg-gray-700 hover:bg-gray-600 disabled:opacity-30 text-white transition-colors" title="Anterior (←)">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <button onClick={() => setIsAutoPlay(v => !v)}
          className="p-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors">
          {isAutoPlay ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
        </button>
        <button onClick={() => navigate(currentIndex + 1)} disabled={currentIndex === panels.length - 1 || phase !== 'idle'}
          className="p-2 rounded-lg bg-gray-700 hover:bg-gray-600 disabled:opacity-30 text-white transition-colors" title="Siguiente (→)">
          <ChevronRight className="w-5 h-5" />
        </button>
        <button onClick={() => navigate(panels.length - 1)} disabled={currentIndex === panels.length - 1 || phase !== 'idle'}
          className="p-2 rounded-lg bg-gray-700 hover:bg-gray-600 disabled:opacity-30 text-white transition-colors" title="Último panel">
          <SkipForward className="w-5 h-5" />
        </button>
      </div>

      {/* ── Thumbnails ── */}
      <div className="flex items-center justify-center gap-2 flex-wrap flex-shrink-0">
        {panels.map((_, i) => (
          <button key={i} onClick={() => navigate(i)} disabled={phase !== 'idle'}
            className={`w-10 h-10 rounded-lg font-semibold transition-all text-sm ${
              i === currentIndex
                ? 'bg-blue-600 text-white scale-110 shadow-lg'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}>
            {i + 1}
          </button>
        ))}
      </div>

      {panels[currentIndex]?.transitionToNext?.type &&
       panels[currentIndex].transitionToNext!.type !== 'none' &&
       currentIndex < panels.length - 1 && (
        <p className="text-center text-xs text-gray-500 flex-shrink-0">
          Siguiente: <span className="text-purple-400 font-medium">{panels[currentIndex].transitionToNext!.type}</span>
          {' · '}{panels[currentIndex].transitionToNext!.duration}ms
        </p>
      )}

      <p className="text-center text-xs text-gray-500 flex-shrink-0">← → para navegar</p>
    </div>
  );
};

export default ComicPlayer;
