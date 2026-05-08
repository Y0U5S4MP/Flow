import React, { useEffect, useRef } from 'react';
import { Panel, ComicElement } from '../types/Comic';

interface ViewerCanvasProps {
  panel: Panel;
  isPlaying: boolean;
}

const ViewerCanvas: React.FC<ViewerCanvasProps> = ({ panel, isPlaying }) => {
  // ── Render con HTML/CSS en vez de <canvas> para soportar imágenes,
  //    GIFs animados, videos y todos los tipos de ComicElement correctamente.
  const panelW = panel.panelWidth || 800;
  const panelH = panel.panelHeight || 600;

  const sorted = [...(panel.elements || [])].sort(
    (a, b) => (a.appearanceOrder ?? 0) - (b.appearanceOrder ?? 0)
  );

  const renderElement = (el: ComicElement) => {
    const style: React.CSSProperties = {
      position: 'absolute',
      left: `${(el.x / panelW) * 100}%`,
      top: `${(el.y / panelH) * 100}%`,
      width: el.width ? `${(el.width / panelW) * 100}%` : 'auto',
      height: el.height ? `${(el.height / panelH) * 100}%` : 'auto',
      pointerEvents: 'none',
      opacity: el.opacity ?? 1,
      transform: [
        el.rotation ? `rotate(${el.rotation}deg)` : '',
        el.flipHorizontal ? 'scaleX(-1)' : '',
        el.flipVertical ? 'scaleY(-1)' : '',
      ]
        .filter(Boolean)
        .join(' ') || undefined,
    };

    switch (el.type) {
      case 'text':
        return (
          <div
            key={el.id}
            style={{
              ...style,
              fontSize: el.fontSize ?? 16,
              color: el.color ?? '#000',
              fontWeight: el.fontWeight ?? 'normal',
              fontStyle: el.fontStyle ?? 'normal',
              fontFamily: (el as any).fontFamily ?? 'Arial',
              textDecoration: (el as any).textDecoration ?? 'none',
              textAlign: (el.textAlign as any) ?? 'left',
              whiteSpace: 'pre-wrap',
              textShadow: '1px 1px 3px rgba(0,0,0,0.4)',
            }}
          >
            {el.content}
          </div>
        );

      case 'image':
        return (
          <img
            key={el.id}
            src={el.imageUrl}
            alt="elemento"
            style={{ ...style, objectFit: (el as any).objectFit ?? 'contain' }}
          />
        );

      case 'gif':
        return (
          <img
            key={el.id}
            src={el.gifUrl}
            alt="gif"
            style={{ ...style, objectFit: 'contain' }}
          />
        );

      case 'video':
        return (
          <video
            key={el.id}
            src={el.videoUrl}
            style={style}
            autoPlay={isPlaying && (el.autoplay ?? true)}
            loop={el.loop ?? true}
            muted
            playsInline
          />
        );

      case 'shape':
        return (
          <div
            key={el.id}
            style={{
              ...style,
              backgroundColor: el.color ?? '#000',
              borderRadius: el.shape === 'circle' ? '50%' : 0,
            }}
          />
        );

      case 'line':
        return (
          <div
            key={el.id}
            style={{
              ...style,
              height: el.strokeWidth ?? 2,
              backgroundColor: el.color ?? '#000',
            }}
          />
        );

      case 'arrow':
        return (
          <svg
            key={el.id}
            style={{ ...style }}
            viewBox="0 0 100 20"
            preserveAspectRatio="none"
          >
            <defs>
              <marker
                id={`ah-${el.id}`}
                markerWidth="10"
                markerHeight="10"
                refX="9"
                refY="3"
                orient="auto"
              >
                <polygon points="0 0,10 3,0 6" fill={el.color ?? '#000'} />
              </marker>
            </defs>
            <line
              x1="0"
              y1="10"
              x2="95"
              y2="10"
              stroke={el.color ?? '#000'}
              strokeWidth={el.strokeWidth ?? 2}
              markerEnd={`url(#ah-${el.id})`}
            />
          </svg>
        );

      case 'sticker':
        return (
          <div
            key={el.id}
            style={{
              ...style,
              fontSize: el.width ? `${(el.width / panelW) * 100}vw` : 40,
              lineHeight: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {el.stickerType ?? '😊'}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-2xl overflow-hidden flex items-center justify-center"
      style={{ width: '100%', maxWidth: 800 }}
    >
      <div
        style={{
          position: 'relative',
          width: '100%',
          aspectRatio: `${panelW} / ${panelH}`,
          backgroundColor: panel.backgroundColor ?? '#ffffff',
          backgroundImage: panel.backgroundImage
            ? `url(${panel.backgroundImage})`
            : undefined,
          backgroundSize: (panel as any).backgroundSize ?? 'cover',
          backgroundRepeat: (panel as any).backgroundRepeat ?? 'no-repeat',
          backgroundPosition: (panel as any).backgroundPosition ?? 'center',
        }}
      >
        {sorted.filter(el => el.visible !== false).map(renderElement)}
      </div>
    </div>
  );
};

export default ViewerCanvas;
