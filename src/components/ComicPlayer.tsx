import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Play, Pause, ChevronLeft, ChevronRight, SkipBack, SkipForward } from 'lucide-react';
import { Panel, PanelTransition } from '../types/Comic';
import ViewerCanvas from './ViewerCanvas';

interface ComicPlayerProps {
  panels: Panel[];
}

// Genera los estilos CSS para cada tipo de transición
const buildTransitionCSS = (
  transition: PanelTransition | undefined,
  phase: 'enter' | 'exit'
): React.CSSProperties => {
  if (!transition || transition.type === 'none') return {};

  const dur = transition.duration ?? 500;
  const ease = transition.easing ?? 'ease-in-out';
  const dir = transition.direction ?? 'left';

  // Valores de inicio (para enter) o fin (para exit)
  const offscreen = {
    left:  'translateX(-110%)',
    right: 'translateX(110%)',
    up:    'translateY(-110%)',
    down:  'translateY(110%)',
  };

  const hidden: Record<PanelTransition['type'], React.CSSProperties> = {
    none:    {},
    fade:    { opacity: 0 },
    slide:   { transform: offscreen[dir] },
    zoom:    { transform: 'scale(0.2)', opacity: 0 },
    flip:    { transform: 'rotateY(90deg)', opacity: 0 },
    wipe:    { clipPath: 'inset(0 100% 0 0)' },
    dissolve:{ opacity: 0, filter: 'blur(12px)' },
  };

  const visible: Record<PanelTransition['type'], React.CSSProperties> = {
    none:    {},
    fade:    { opacity: 1 },
    slide:   { transform: 'translateX(0) translateY(0)' },
    zoom:    { transform: 'scale(1)', opacity: 1 },
    flip:    { transform: 'rotateY(0deg)', opacity: 1 },
    wipe:    { clipPath: 'inset(0 0% 0 0)' },
    dissolve:{ opacity: 1, filter: 'blur(0px)' },
  };

  const base: React.CSSProperties = {
    transition: `all ${dur}ms ${ease}`,
  };

  return phase === 'enter'
    ? { ...hidden[transition.type], ...base }   // arranca oculto, anima hacia visible
    : { ...visible[transition.type], ...base };  // arranca visible, anima hacia oculto
};

type Phase = 'idle' | 'exiting' | 'entering';

const ComicPlayer: React.FC<ComicPlayerProps> = ({ panels }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlay, setIsAutoPlay] = useState(false);
  const [phase, setPhase] = useState<Phase>('idle');
  // Guarda el panel que se está mostrando durante la transición
  const [visibleIndex, setVisibleIndex] = useState(0);
  const autoRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Navegar con animación de transición
  const navigate = useCallback(
    (nextIndex: number) => {
      if (phase !== 'idle' || nextIndex < 0 || nextIndex >= panels.length) return;

      const currentPanel = panels[currentIndex];
      const transition = currentPanel.transitionToNext;
      const dur = transition?.duration ?? 400;

      if (!transition || transition.type === 'none') {
        setVisibleIndex(nextIndex);
        setCurrentIndex(nextIndex);
        return;
      }

      // 1. Fase salida
      setPhase('exiting');
      setTimeout(() => {
        // 2. Cambia panel mientras sigue invisible / oculto
        setVisibleIndex(nextIndex);
        setCurrentIndex(nextIndex);
        setPhase('entering');
        setTimeout(() => {
          // 3. Reposo
          setPhase('idle');
        }, dur);
      }, dur);
    },
    [currentIndex, panels, phase]
  );

  // Teclado
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') navigate(currentIndex + 1);
      if (e.key === 'ArrowLeft')  navigate(currentIndex - 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [navigate, currentIndex]);

  // Autoplay
  useEffect(() => {
    if (!isAutoPlay) return;
    autoRef.current = setInterval(() => {
      setCurrentIndex(prev => {
        if (prev >= panels.length - 1) {
          setIsAutoPlay(false);
          return prev;
        }
        navigate(prev + 1);
        return prev;
      });
    }, 3000);
    return () => { if (autoRef.current) clearInterval(autoRef.current); };
  }, [isAutoPlay, panels.length, navigate]);

  if (panels.length === 0) return null;

  const panel = panels[visibleIndex];

  // Calcula el estilo de transición para el panel actual
  const transition = panels[currentIndex]?.transitionToNext;
  let panelStyle: React.CSSProperties = {};
  if (phase === 'exiting') {
    panelStyle = buildTransitionCSS(transition, 'exit');
  } else if (phase === 'entering') {
    panelStyle = buildTransitionCSS(transition, 'enter');
  }

  return (
    <div className="space-y-4">
      {/* Panel con transición */}
      <div
        className="relative bg-gray-800 rounded-lg overflow-hidden"
        style={{ aspectRatio: '16/9' }}
      >
        <div className="absolute inset-0 flex items-center justify-center p-4">
          <div
            style={{
              width: '100%',
              maxHeight: '100%',
              ...panelStyle,
            }}
          >
            <ViewerCanvas panel={panel} isPlaying={isAutoPlay} />
          </div>
        </div>

        {/* Contador */}
        <div className="absolute top-3 right-3 bg-black/70 text-white px-3 py-1 rounded-full text-sm font-semibold">
          {currentIndex + 1} / {panels.length}
        </div>
      </div>

      {/* Controles */}
      <div className="flex items-center justify-center gap-4 bg-gray-800 rounded-lg p-4">
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

      {/* Miniaturas numéricas */}
      <div className="flex items-center justify-center gap-2 flex-wrap">
        {panels.map((_, i) => (
          <button
            key={i}
            onClick={() => navigate(i)}
            disabled={phase !== 'idle'}
            className={`w-10 h-10 rounded-lg font-semibold transition-all ${
              i === currentIndex
                ? 'bg-blue-600 text-white scale-110'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            {i + 1}
          </button>
        ))}
      </div>

      <p className="text-center text-sm text-gray-400">
        Usa las flechas ← → del teclado para navegar
      </p>
    </div>
  );
};

export default ComicPlayer;
