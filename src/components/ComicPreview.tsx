import React, { useState, useEffect } from 'react';
import { Comic, Panel, ComicElement } from '../types/Comic';
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, X } from 'lucide-react';

interface ComicPreviewProps {
  comic: Partial<Comic>;
  isOpen: boolean;
  onClose: () => void;
}

const ComicPreview: React.FC<ComicPreviewProps> = ({ comic, isOpen, onClose }) => {
  const [currentPanelIndex, setCurrentPanelIndex] = useState(0);
  const [isAutoPlay, setIsAutoPlay] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [backgroundMusicAudio, setBackgroundMusicAudio] = useState<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (isOpen && comic.backgroundMusic?.backgroundMusic) {
      const audio = new Audio(comic.backgroundMusic.backgroundMusic.url);
      audio.loop = comic.backgroundMusic.backgroundMusic.loop;
      audio.volume = isMuted ? 0 : (comic.backgroundMusic.backgroundMusic.volume || 0.5);
      setBackgroundMusicAudio(audio);
      audio.play().catch(e => console.log('Audio play failed:', e));
      return () => {
        audio.pause();
        audio.remove();
      };
    }
  }, [isOpen, comic.backgroundMusic]);

  useEffect(() => {
    if (backgroundMusicAudio) {
      backgroundMusicAudio.volume = isMuted ? 0 : (comic.backgroundMusic?.backgroundMusic?.volume || 0.5);
    }
  }, [isMuted, backgroundMusicAudio]);

  const nextPanel = () => {
    if (!comic.panels) return;
    setCurrentPanelIndex(prev =>
      prev < comic.panels!.length - 1 ? prev + 1 : prev
    );
  };

  const prevPanel = () => {
    setCurrentPanelIndex(prev => prev > 0 ? prev - 1 : prev);
  };

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === 'ArrowRight') {
        nextPanel();
      } else if (e.key === 'ArrowLeft') {
        prevPanel();
      } else if (e.key === ' ' || e.key === 'Spacebar') {
        e.preventDefault();
        setIsAutoPlay(prev => !prev);
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isOpen, currentPanelIndex, comic.panels, isAutoPlay]);

  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isAutoPlay && comic.panels && comic.panels.length > 0) {
      interval = setInterval(() => {
        setCurrentPanelIndex(prev => {
          if (prev >= comic.panels!.length - 1) {
            return 0;
          }
          return prev + 1;
        });
      }, 3000);
    }

    return () => clearInterval(interval);
  }, [isAutoPlay, comic.panels]);

  if (!isOpen || !comic.panels || comic.panels.length === 0) return null;

  const currentPanel = comic.panels[currentPanelIndex];

  const renderElement = (element: ComicElement) => {
    const panelWidth = currentPanel.panelWidth || 1600;
    const panelHeight = currentPanel.panelHeight || 900;
    const scaleX = 1600 / panelWidth;
    const scaleY = 900 / panelHeight;

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
      fontSize: element.fontSize ? `${element.fontSize * scaleX}px` : `${16 * scaleX}px`,
      color: element.color || '#000000',
      fontWeight: element.fontWeight || 'normal',
      fontStyle: element.fontStyle || 'normal',
      textAlign: (element.textAlign as any) || 'left',
      opacity: element.opacity || 1,
      transform: transforms.length > 0 ? transforms.join(' ') : undefined,
      transformOrigin: 'center',
      filter: element.filters?.map(f => {
        switch (f.type) {
          case 'brightness': return `brightness(${f.value})`;
          case 'contrast': return `contrast(${f.value})`;
          case 'saturation': return `saturate(${f.value})`;
          case 'blur': return `blur(${f.value}px)`;
          case 'sepia': return `sepia(${f.value})`;
          case 'grayscale': return `grayscale(${f.value})`;
          default: return '';
        }
      }).join(' ') || 'none',
      animation: isPlaying && currentPanel.animations?.find(a => a.elementId === element.id) 
        ? `${getAnimationName(currentPanel.animations.find(a => a.elementId === element.id)!)} ${currentPanel.animations.find(a => a.elementId === element.id)!.duration}ms ${currentPanel.animations.find(a => a.elementId === element.id)!.easing || 'ease'} ${currentPanel.animations.find(a => a.elementId === element.id)!.delay}ms`
        : 'none'
    };

    switch (element.type) {
      case 'text':
        return (
          <div key={element.id} style={style}>
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
          />
        );
      
      case 'gif':
        return (
          <img
            key={element.id}
            src={element.gifUrl}
            alt="GIF"
            style={style}
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
            muted={isMuted}
            controls={false}
          />
        );

      case 'shape':
        return (
          <div
            key={element.id}
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
            key={element.id}
            style={{
              ...style,
              height: `${(element.strokeWidth || 2) * scaleY}px`,
              backgroundColor: element.color
            }}
          />
        );

      case 'arrow':
        return (
          <svg
            key={element.id}
            style={{
              ...style,
              height: `${20 * scaleY}px`
            }}
            viewBox="0 0 100 20"
          >
            <defs>
              <marker
                id={`arrowhead-preview-${element.id}`}
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
              markerEnd={`url(#arrowhead-preview-${element.id})`}
            />
          </svg>
        );

      case 'sticker':
        return (
          <div
            key={element.id}
            style={{
              ...style,
              fontSize: `${(element.width || 80) * scaleX * 0.8}px`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            {element.stickerType || '😊'}
          </div>
        );

      case 'brush':
        return (
          <svg
            key={element.id}
            style={{
              position: 'absolute',
              left: `${element.x * scaleX}px`,
              top: `${element.y * scaleY}px`,
              width: `${100 * scaleX}px`,
              height: `${100 * scaleY}px`,
              pointerEvents: 'none'
            }}
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

  const getAnimationName = (animation: any) => {
    switch (animation.type) {
      case 'fadeIn': return 'fadeIn';
      case 'slideIn': return 'slideInLeft';
      case 'rotateIn': return 'rotateIn';
      case 'bounce': return 'bounceIn';
      case 'typewriter': return 'typewriter';
      default: return 'fadeIn';
    }
  };

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* Header */}
      <div className="bg-black/80 backdrop-blur-sm border-b border-white/20 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={onClose}
              className="text-white hover:text-purple-300 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
            <h1 className="text-xl font-bold text-white">
              {comic.title || 'Vista Previa de Historieta'}
            </h1>
          </div>
          
          <div className="flex items-center space-x-4">
            <span className="text-white/60 text-xs hidden md:block">
              ← → Flechas para navegar | Espacio para auto-play
            </span>
            <button
              onClick={() => setIsMuted(!isMuted)}
              className="text-white hover:text-purple-300 transition-colors"
            >
              {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
            </button>
            <div className="text-white text-sm">
              Panel {currentPanelIndex + 1} de {comic.panels.length}
            </div>
          </div>
        </div>
      </div>

      {/* Main Viewer */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="relative">
          <div
            className="shadow-2xl overflow-hidden"
            style={{
              width: '100vw',
              height: '100vh',
              maxWidth: '1600px',
              maxHeight: '900px',
              backgroundColor: currentPanel.backgroundColor || '#ffffff',
              backgroundImage: currentPanel.backgroundImage ? `url(${currentPanel.backgroundImage})` : undefined,
              backgroundSize: 'cover',
              backgroundPosition: 'center'
            }}
          >
            <div className="relative w-full h-full">
              {currentPanel.elements
                .filter(el => el.visible !== false)
                .sort((a, b) => (a.appearanceOrder || 0) - (b.appearanceOrder || 0))
                .map(renderElement)}
            </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-black/80 backdrop-blur-sm border-t border-white/20 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-center space-x-6 mb-4">
            <button
              onClick={prevPanel}
              disabled={currentPanelIndex === 0}
              className="p-3 bg-white/20 hover:bg-white/30 disabled:opacity-50 disabled:cursor-not-allowed rounded-full text-white transition-all duration-200"
            >
              <SkipBack className="w-6 h-6" />
            </button>
            
            <button
              onClick={() => setIsAutoPlay(!isAutoPlay)}
              className="p-4 bg-purple-600 hover:bg-purple-700 rounded-full text-white transition-all duration-200 transform hover:scale-105"
            >
              {isAutoPlay ? <Pause className="w-8 h-8" /> : <Play className="w-8 h-8" />}
            </button>
            
            <button
              onClick={nextPanel}
              disabled={currentPanelIndex === comic.panels.length - 1}
              className="p-3 bg-white/20 hover:bg-white/30 disabled:opacity-50 disabled:cursor-not-allowed rounded-full text-white transition-all duration-200"
            >
              <SkipForward className="w-6 h-6" />
            </button>
          </div>
          
          <div className="flex space-x-2 justify-center">
            {comic.panels.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentPanelIndex(index)}
                className={`w-3 h-3 rounded-full transition-all duration-200 ${
                  index === currentPanelIndex
                    ? 'bg-white'
                    : 'bg-white/40 hover:bg-white/60'
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* CSS Animations */}
      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes slideInLeft {
          from { transform: translateX(-100%); }
          to { transform: translateX(0); }
        }
        
        @keyframes rotateIn {
          from { transform: rotate(-180deg) scale(0); }
          to { transform: rotate(0) scale(1); }
        }
        
        @keyframes bounceIn {
          0% { transform: scale(0.3); opacity: 0; }
          50% { transform: scale(1.05); }
          70% { transform: scale(0.9); }
          100% { transform: scale(1); opacity: 1; }
        }
        
        @keyframes typewriter {
          from { width: 0; }
          to { width: 100%; }
        }
      `}</style>
    </div>
  );
};

export default ComicPreview;