import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Play, Pause, ChevronLeft, ChevronRight, SkipBack, SkipForward } from 'lucide-react';
import { Panel, PanelTransition } from '../types/Comic';
import ViewerCanvas from './ViewerCanvas';

interface ComicPlayerProps {
  panels: Panel[];
}

// ─── CSS de animaciones inyectado una sola vez ────────────────────────────────
const ANIM_CSS = `
@keyframes _fadeIn  { from { opacity:0 }               to { opacity:1 } }
@keyframes _fadeOut { from { opacity:1 }               to { opacity:0 } }
@keyframes _slideInL  { from { transform:translateX(-100%) } to { transform:translateX(0) } }
@keyframes _slideOutL { from { transform:translateX(0) }     to { transform:translateX(-100%) } }
@keyframes _slideInR  { from { transform:translateX( 100%) } to { transform:translateX(0) } }
@keyframes _slideOutR { from { transform:translateX(0) }     to { transform:translateX( 100%) } }
@keyframes _slideInU  { from { transform:translateY(-100%) } to { transform:translateY(0) } }
@keyframes _slideOutU { from { transform:translateX(0) }     to { transform:translateY(-100%) } }
@keyframes _slideInD  { from { transform:translateY( 100%) } to { transform:translateY(0) } }
@keyframes _slideOutD { from { transform:translateX(0) }     to { transform:translateY( 100%) } }
@keyframes _zoomIn    { from { transform:scale(0.3); opacity:0 } to { transform:scale(1);   opacity:1 } }
@keyframes _zoomOut   { from { transform:scale(1);   opacity:1 } to { transform:scale(0.3); opacity:0 } }
@keyframes _flipIn    { from { transform:perspective(600px) rotateY(90deg); opacity:0 } to { transform:perspective(600px) rotateY(0deg); opacity:1 } }
@keyframes _flipOut   { from { transform:perspective(600px) rotateY(0deg);  opacity:1 } to { transform:perspective(600px) rotateY(90deg); opacity:0 } }
@keyframes _wipeIn    { from { clip-path:inset(0 100% 0 0) } to { clip-path:inset(0 0% 0 0) } }
@keyframes _wipeOut   { from { clip-path:inset(0 0% 0 0) }   to { clip-path:inset(0 100% 0 0) } }
@keyframes _dissolveIn  { from { opacity:0; filter:blur(12px) } to { opacity:1; filter:blur(0) } }
@keyframes _dissolveOut { from { opacity:1; filter:blur(0) }    to { opacity:0; filter:blur(12px) } }
`;

// Devuelve el nombre de la animación CSS para cada tipo y fase
function getAnimName(
  type: PanelTransition['type'],
  phase: 'in' | 'out',
  direction?: string
): string {
  const d = direction || 'left';
  const dirMap: Record<string, string> = { left: 'L', right: 'R', up: 'U', down: 'D' };
  switch (type) {
    case 'fade':    return phase === 'in' ? '_fadeIn'    : '_fadeOut';
    case 'slide':   return phase === 'in' ? `_slideIn${dirMap[d]}`  : `_slideOut${dirMap[d]}`;
    case 'zoom':    return phase === 'in' ? '_zoomIn'    : '_zoomOut';
    case 'flip':    return phase === 'in' ? '_flipIn'    : '_flipOut';
    case 'wipe':    return phase === 'in' ? '_wipeIn'    : '_wipeOut';
    case 'dissolve':return phase === 'in' ? '_dissolveIn': '_dissolveOut';
    default:        return '';
  }
}

// ─── Componente ───────────────────────────────────────────────────────────────
const ComicPlayer: React.FC<ComicPlayerProps> = ({ panels }) => {
  // Índice que el usuario ve (puede diferir de displayIdx durante transición)
  const [currentIndex, setCurrentIndex] = useState(0);
  // Índice del panel actualmente renderizado en pantalla
  const [displayIndex, setDisplayIndex]  = useState(0);
  const [isAutoPlay, setIsAutoPlay]      = useState(false);
  // 'idle' | 'out' (salida del panel actual) | 'in' (entrada del siguiente)
  const [phase, setPhase] = useState<'idle' | 'out' | 'in'>('idle');
  const [transition, setTransition]      = useState<PanelTransition | undefined>();
  const busyRef  = useRef(false);
  const autoRef  = useRef<ReturnType<typeof setInterval>>();

  // Inyectar CSS una sola vez
  useEffect(() => {
    const id = '__comic_player_css';
    if (!document.getElementById(id)) {
      const s = document.createElement('style');
      s.id = id; s.textContent = ANIM_CSS;
      document.head.appendChild(s);
    }
  }, []);

  // ── Navegar con animación ─────────────────────────────────────────────────
  const navigate = useCallback((nextIdx: number) => {
    if (busyRef.current) return;
    if (nextIdx < 0 || nextIdx >= panels.length) return;
    if (nextIdx === currentIndex) return;

    const tr = panels[currentIndex]?.transitionToNext;
    const dur = tr?.duration ?? 400;

    if (!tr || tr.type === 'none') {
      // Sin transición: cambio instantáneo
      setDisplayIndex(nextIdx);
      setCurrentIndex(nextIdx);
      return;
    }

    busyRef.current = true;
    setTransition(tr);

    // 1. Fase salida (el panel actual sale)
    setPhase('out');

    setTimeout(() => {
      // 2. Cambiar al panel siguiente (aún invisible / entrando)
      setDisplayIndex(nextIdx);
      setCurrentIndex(nextIdx);
      setPhase('in');

      setTimeout(() => {
        // 3. Reposo
        setPhase('idle');
        setTransition(undefined);
        busyRef.current = false;
      }, dur);
    }, dur);
  }, [currentIndex, panels]);

  // ── Teclado ───────────────────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') navigate(currentIndex + 1);
      if (e.key === 'ArrowLeft')  navigate(currentIndex - 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [navigate, currentIndex]);

  // ── Autoplay ──────────────────────────────────────────────────────────────
  useEffect(() => {
    clearInterval(autoRef.current);
    if (!isAutoPlay) return;
    autoRef.current = setInterval(() => {
      setCurrentIndex(prev => {
        const next = prev + 1;
        if (next >= panels.length) { setIsAutoPlay(false); return prev; }
        navigate(next);
        return prev; // navigate actualiza el índice internamente
      });
    }, 3200);
    return () => clearInterval(autoRef.current);
  }, [isAutoPlay, panels.length, navigate]);

  if (panels.length === 0) return null;

  // ── Construir el estilo de animación CSS para el contenedor del panel ─────
  const panelContainerStyle = (): React.CSSProperties => {
    if (!transition || transition.type === 'none' || phase === 'idle') return {};
    const animName = getAnimName(transition.type, phase === 'out' ? 'out' : 'in', transition.direction);
    if (!animName) return {};
    return {
      animation: `${animName} ${transition.duration ?? 400}ms ${transition.easing ?? 'ease-in-out'} both`,
    };
  };

  const panel = panels[displayIndex];

  return (
    <div className="space-y-4">
      {/* ── Vista del panel ── */}
      {/* overflow:hidden es clave para que slide/wipe no desborde */}
      <div className="relative bg-gray-900 rounded-xl overflow-hidden">
        {/* Contador */}
        <div className="absolute top-3 right-3 z-10 bg-black/70 text-white text-sm font-semibold px-3 py-1 rounded-full">
          {currentIndex + 1} / {panels.length}
        </div>

        {/*
          Este div intermedio tiene overflow:hidden para contener las animaciones
          de slide/wipe que mueven el panel fuera de sus bordes.
          El panel dentro usa aspectRatio para mantener su forma COMPLETA.
        */}
        <div className="w-full overflow-hidden" style={{ padding: '8px' }}>
          <div style={panelContainerStyle()}>
            {/* ViewerCanvas ya usa aspectRatio internamente → lienzo siempre completo */}
            <ViewerCanvas panel={panel} isPlaying={isAutoPlay} />
          </div>
        </div>
      </div>

      {/* ── Controles ── */}
      <div className="flex items-center justify-center gap-3 bg-gray-800 rounded-xl p-4">
        <button
          onClick={() => navigate(0)}
          disabled={currentIndex === 0 || phase !== 'idle'}
          className="p-2 rounded-lg bg-gray-700 hover:bg-gray-600 disabled:opacity-30 text-white transition-colors"
          title="Primer panel"
        >
          <SkipBack className="w-5 h-5" />
        </button>

        <button
          onClick={() => navigate(currentIndex - 1)}
          disabled={currentIndex === 0 || phase !== 'idle'}
          className="p-2 rounded-lg bg-gray-700 hover:bg-gray-600 disabled:opacity-30 text-white transition-colors"
          title="Anterior (←)"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <button
          onClick={() => setIsAutoPlay(v => !v)}
          className="p-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors"
        >
          {isAutoPlay ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
        </button>

        <button
          onClick={() => navigate(currentIndex + 1)}
          disabled={currentIndex === panels.length - 1 || phase !== 'idle'}
          className="p-2 rounded-lg bg-gray-700 hover:bg-gray-600 disabled:opacity-30 text-white transition-colors"
          title="Siguiente (→)"
        >
          <ChevronRight className="w-5 h-5" />
        </button>

        <button
          onClick={() => navigate(panels.length - 1)}
          disabled={currentIndex === panels.length - 1 || phase !== 'idle'}
          className="p-2 rounded-lg bg-gray-700 hover:bg-gray-600 disabled:opacity-30 text-white transition-colors"
          title="Último panel"
        >
          <SkipForward className="w-5 h-5" />
        </button>
      </div>

      {/* ── Miniaturas numéricas ── */}
      <div className="flex items-center justify-center gap-2 flex-wrap">
        {panels.map((_, i) => (
          <button
            key={i}
            onClick={() => navigate(i)}
            disabled={phase !== 'idle'}
            className={`w-10 h-10 rounded-lg font-semibold transition-all text-sm ${
              i === currentIndex
                ? 'bg-blue-600 text-white scale-110 shadow-lg'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            {i + 1}
          </button>
        ))}
      </div>

      {/* Tipo de transición activa */}
      {panels[currentIndex]?.transitionToNext?.type &&
       panels[currentIndex].transitionToNext!.type !== 'none' &&
       currentIndex < panels.length - 1 && (
        <p className="text-center text-xs text-gray-500">
          Siguiente: transición <span className="text-purple-400 font-medium">{panels[currentIndex].transitionToNext!.type}</span>
          {' · '}{panels[currentIndex].transitionToNext!.duration}ms
        </p>
      )}

      <p className="text-center text-xs text-gray-500">← → para navegar · Espacio para play</p>
    </div>
  );
};

export default ComicPlayer;