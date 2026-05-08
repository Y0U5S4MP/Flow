import React, { useState, useEffect, useCallback } from 'react';
import { Play, Pause, ChevronLeft, ChevronRight, SkipBack, SkipForward } from 'lucide-react';
import { Panel, PanelTransition } from '../types/Comic';

interface ComicPlayerProps {
  panels: Panel[];
}

const ComicPlayer: React.FC<ComicPlayerProps> = ({ panels }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlay, setIsAutoPlay] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [transitionDirection, setTransitionDirection] = useState<'next' | 'prev'>('next');
  const [hasEntered, setHasEntered] = useState(false);

  const goToNext = useCallback(() => {
    if (currentIndex < panels.length - 1 && !isTransitioning) {
      setTransitionDirection('next');
      setIsTransitioning(true);
      const currentPanel = panels[currentIndex];
      const duration = currentPanel.transitionToNext?.duration || 500;
      setTimeout(() => {
        setCurrentIndex(currentIndex + 1);
        setIsTransitioning(false);
      }, duration);
    }
  }, [panels, currentIndex, isTransitioning]);

  const goToPrevious = useCallback(() => {
    if (currentIndex > 0 && !isTransitioning) {
      setTransitionDirection('prev');
      setIsTransitioning(true);
      setTimeout(() => {
        setCurrentIndex(currentIndex - 1);
        setIsTransitioning(false);
      }, 500);
    }
  }, [currentIndex, isTransitioning]);

  const goToFirst = () => {
    setCurrentIndex(0);
  };

  const goToLast = () => {
    setCurrentIndex(panels.length - 1);
  };

  useEffect(() => {
    if (currentIndex === 0 && panels[0]?.entranceTransition && !hasEntered) {
      const timer = setTimeout(() => {
        setHasEntered(true);
      }, panels[0].entranceTransition.duration || 500);
      return () => clearTimeout(timer);
    }
  }, [currentIndex, panels, hasEntered]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        goToNext();
      } else if (e.key === 'ArrowLeft') {
        goToPrevious();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goToNext, goToPrevious]);

  useEffect(() => {
    if (!isAutoPlay) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => {
        if (prev < panels.length - 1) {
          return prev + 1;
        } else {
          setIsAutoPlay(false);
          return prev;
        }
      });
    }, 3000);

    return () => clearInterval(interval);
  }, [isAutoPlay, panels.length]);

  if (panels.length === 0) return null;

  const currentPanel = panels[currentIndex];

  const getTransitionStyle = (): React.CSSProperties => {
    let transition: PanelTransition | undefined;
    let isEntering = false;
    let isExiting = false;

    if (currentIndex === 0 && currentPanel.entranceTransition && !hasEntered) {
      transition = currentPanel.entranceTransition;
      isEntering = true;
    } else if (isTransitioning && transitionDirection === 'next') {
      const previousPanel = panels[currentIndex - 1];
      if (previousPanel?.transitionToNext) {
        transition = previousPanel.transitionToNext;
        isExiting = true;
      }
    } else if (currentIndex === panels.length - 1 && currentPanel.exitTransition && isTransitioning) {
      transition = currentPanel.exitTransition;
      isExiting = true;
    }

    if (!transition || transition.type === 'none') return {};

    const duration = `${transition.duration}ms`;
    const easing = transition.easing || 'ease-in-out';

    const baseStyle: React.CSSProperties = {
      transition: `all ${duration} ${easing}`,
    };

    const getTransformStyle = (reverse: boolean = false) => {
      switch (transition!.type) {
        case 'fade':
          return { opacity: reverse ? 1 : 0 };
        case 'slide':
          const direction = transition!.direction || 'left';
          let transform = '';
          if (direction === 'left') transform = reverse ? 'translateX(0)' : 'translateX(-100%)';
          else if (direction === 'right') transform = reverse ? 'translateX(0)' : 'translateX(100%)';
          else if (direction === 'up') transform = reverse ? 'translateY(0)' : 'translateY(-100%)';
          else if (direction === 'down') transform = reverse ? 'translateY(0)' : 'translateY(100%)';
          return { transform };
        case 'zoom':
          return { transform: reverse ? 'scale(1)' : 'scale(0)' };
        case 'flip':
          return { transform: reverse ? 'rotateY(0deg)' : 'rotateY(90deg)' };
        case 'wipe':
          return { clipPath: reverse ? 'inset(0 0 0 0)' : 'inset(0 100% 0 0)' };
        case 'dissolve':
          return { opacity: reverse ? 1 : 0, filter: reverse ? 'blur(0px)' : 'blur(10px)' };
        default:
          return {};
      }
    };

    if (isEntering) {
      return { ...baseStyle, ...getTransformStyle(false) };
    } else if (isExiting) {
      return { ...baseStyle, ...getTransformStyle(true) };
    }

    return baseStyle;
  };

  return (
    <div className="space-y-4">
      <div className="relative bg-gray-800 rounded-lg overflow-hidden" style={{ aspectRatio: '16/9' }}>
        <div className="absolute inset-0 flex items-center justify-center p-8">
          <div
            className="relative max-w-full max-h-full"
            style={{
              aspectRatio: `${currentPanel.panelWidth} / ${currentPanel.panelHeight}`,
              ...getTransitionStyle()
            }}
          >
            <div className="relative w-full h-full rounded-lg overflow-hidden shadow-2xl"
              style={{
                backgroundColor: currentPanel.backgroundColor || '#ffffff',
                backgroundImage: currentPanel.imageUrl ? `url(${currentPanel.imageUrl})` : undefined,
                backgroundSize: (currentPanel as any).backgroundSize || 'contain',
                backgroundRepeat: (currentPanel as any).backgroundRepeat || 'no-repeat',
                backgroundPosition: (currentPanel as any).backgroundPosition || 'center'
              }}
            >

              {currentPanel.elements && currentPanel.elements.length > 0 && currentPanel.elements.map((element) => {
                if (element.type === 'text') {
                  return (
                    <div
                      key={element.id}
                      style={{
                        position: 'absolute',
                        left: `${(element.x / currentPanel.panelWidth) * 100}%`,
                        top: `${(element.y / currentPanel.panelHeight) * 100}%`,
                        fontSize: `${element.fontSize}px`,
                        color: element.color,
                        fontWeight: element.fontWeight,
                        fontStyle: element.fontStyle,
                        fontFamily: (element as any).fontFamily || 'Arial',
                        textDecoration: (element as any).textDecoration || 'none',
                        whiteSpace: 'pre-wrap',
                        pointerEvents: 'none',
                        textShadow: '2px 2px 4px rgba(0,0,0,0.5)'
                      }}
                    >
                      {element.content}
                    </div>
                  );
                }
                if ((element.type === 'image' || element.type === 'gif') && (element.imageUrl || element.gifUrl)) {
                  return (
                    <img
                      key={element.id}
                      src={element.imageUrl || element.gifUrl}
                      alt="Element"
                      style={{
                        position: 'absolute',
                        left: `${(element.x / currentPanel.panelWidth) * 100}%`,
                        top: `${(element.y / currentPanel.panelHeight) * 100}%`,
                        width: `${(element.width! / currentPanel.panelWidth) * 100}%`,
                        height: `${(element.height! / currentPanel.panelHeight) * 100}%`,
                        objectFit: (element as any).objectFit || 'contain',
                        opacity: element.opacity || 1,
                        pointerEvents: 'none'
                      }}
                    />
                  );
                }
                if (element.type === 'shape') {
                  return (
                    <div
                      key={element.id}
                      style={{
                        position: 'absolute',
                        left: `${(element.x / currentPanel.panelWidth) * 100}%`,
                        top: `${(element.y / currentPanel.panelHeight) * 100}%`,
                        width: `${(element.width! / currentPanel.panelWidth) * 100}%`,
                        height: `${(element.height! / currentPanel.panelHeight) * 100}%`,
                        backgroundColor: element.color,
                        borderRadius: element.shape === 'circle' ? '50%' : '0',
                        pointerEvents: 'none'
                      }}
                    />
                  );
                }
                if (element.type === 'sticker') {
                  return (
                    <div
                      key={element.id}
                      style={{
                        position: 'absolute',
                        left: `${(element.x / currentPanel.panelWidth) * 100}%`,
                        top: `${(element.y / currentPanel.panelHeight) * 100}%`,
                        fontSize: `${element.width}px`,
                        lineHeight: '1',
                        pointerEvents: 'none'
                      }}
                    >
                      {element.stickerType}
                    </div>
                  );
                }
                return null;
              })}
            </div>
          </div>
        </div>

        <div className="absolute top-4 right-4 bg-black bg-opacity-75 text-white px-3 py-1 rounded-full text-sm font-semibold">
          {currentIndex + 1} / {panels.length}
        </div>
      </div>

      <div className="flex items-center justify-center gap-4 bg-gray-800 rounded-lg p-4">
        <button
          onClick={goToFirst}
          disabled={currentIndex === 0}
          className="p-2 rounded-lg bg-gray-700 hover:bg-gray-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-white"
          title="Primer panel"
        >
          <SkipBack className="w-5 h-5" />
        </button>

        <button
          onClick={goToPrevious}
          disabled={currentIndex === 0}
          className="p-2 rounded-lg bg-gray-700 hover:bg-gray-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-white"
          title="Panel anterior (←)"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <button
          onClick={() => setIsAutoPlay(!isAutoPlay)}
          className="p-3 rounded-lg bg-blue-600 hover:bg-blue-700 transition-colors text-white"
          title={isAutoPlay ? 'Pausar' : 'Reproducir automático'}
        >
          {isAutoPlay ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
        </button>

        <button
          onClick={goToNext}
          disabled={currentIndex === panels.length - 1}
          className="p-2 rounded-lg bg-gray-700 hover:bg-gray-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-white"
          title="Panel siguiente (→)"
        >
          <ChevronRight className="w-5 h-5" />
        </button>

        <button
          onClick={goToLast}
          disabled={currentIndex === panels.length - 1}
          className="p-2 rounded-lg bg-gray-700 hover:bg-gray-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-white"
          title="Último panel"
        >
          <SkipForward className="w-5 h-5" />
        </button>
      </div>

      <div className="flex items-center justify-center gap-2 flex-wrap">
        {panels.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentIndex(index)}
            className={`w-10 h-10 rounded-lg font-semibold transition-all ${
              index === currentIndex
                ? 'bg-blue-600 text-white scale-110'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            {index + 1}
          </button>
        ))}
      </div>

      <div className="text-center text-sm text-gray-400">
        Usa las flechas ← → del teclado para navegar
      </div>
    </div>
  );
};

export default ComicPlayer;
