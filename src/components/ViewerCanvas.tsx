import React from 'react';
import { Panel, ComicElement } from '../types/Comic';

interface ViewerCanvasProps {
  panel: Panel;
  isPlaying: boolean;
}

const ViewerCanvas: React.FC<ViewerCanvasProps> = ({ panel, isPlaying }) => {
  const panelW = panel.panelWidth  || 800;
  const panelH = panel.panelHeight || 600;

  const sorted = [...(panel.elements || [])]
    .sort((a, b) => (a.appearanceOrder ?? 0) - (b.appearanceOrder ?? 0));

  const renderElement = (el: ComicElement) => {
    const bubbleType = (el as any).bubbleType as string | undefined;

    const style: React.CSSProperties = {
      position: 'absolute',
      left:   `${(el.x / panelW) * 100}%`,
      top:    `${(el.y / panelH) * 100}%`,
      width:  el.width  ? `${(el.width  / panelW) * 100}%` : 'auto',
      height: el.height ? `${(el.height / panelH) * 100}%` : 'auto',
      pointerEvents: 'none',
      opacity: el.opacity ?? 1,
      transform: [
        (el as any).rotation        ? `rotate(${(el as any).rotation}deg)` : '',
        (el as any).flipHorizontal  ? 'scaleX(-1)' : '',
        (el as any).flipVertical    ? 'scaleY(-1)' : '',
      ].filter(Boolean).join(' ') || undefined,
    };

    switch (el.type) {
      case 'text': {
        // Globos de diálogo / pensamiento / narración
        if (bubbleType) {
          const bgColor = (el as any).bgColor  || '#ffffff';
          const bdColor = (el as any).borderColor || '#222222';
          return (
            <div key={el.id} style={{
              ...style,
              background: bgColor,
              border: `2px solid ${bdColor}`,
              borderRadius: bubbleType === 'caption' ? 4 : 12,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: '4% 5%', boxSizing: 'border-box', position: 'absolute',
            }}>
              <span style={{
                fontSize: `clamp(10px, ${((el.fontSize || 24) / panelW) * 100}vw, 200px)`,
                color: el.color || '#1a1a1a',
                fontWeight: el.fontWeight || 'normal',
                fontFamily: (el as any).fontFamily || 'Arial',
                textAlign: 'center', wordBreak: 'break-word', lineHeight: 1.3,
              }}>{el.content}</span>
              {/* Cola del globo */}
              {bubbleType === 'speech' && (
                <div style={{ position: 'absolute', bottom: '-12%', left: '10%', width: 0, height: 0,
                  borderLeft: '8px solid transparent', borderRight: '8px solid transparent',
                  borderTop: `12px solid ${bdColor}` }} />
              )}
              {bubbleType === 'thought' && (
                <>
                  <div style={{ position: 'absolute', bottom: '-8%', left: '8%', width: '4%', aspectRatio:'1', borderRadius: '50%', background: bdColor }} />
                  <div style={{ position: 'absolute', bottom: '-14%', left: '5%', width: '3%', aspectRatio:'1', borderRadius: '50%', background: bdColor }} />
                </>
              )}
              {bubbleType === 'caption' && (
                <div style={{ position: 'absolute', inset: 0, borderLeft: `5px solid ${bdColor}`, borderRadius: 4, pointerEvents: 'none' }} />
              )}
            </div>
          );
        }

        return (
          <div key={el.id} style={{
            ...style,
            fontSize: `clamp(8px, ${((el.fontSize || 24) / panelW) * 100}vw, 300px)`,
            color: el.color || '#1a1a1a',
            fontWeight: el.fontWeight || 'normal',
            fontStyle: el.fontStyle || 'normal',
            fontFamily: (el as any).fontFamily || 'Arial',
            textDecoration: (el as any).textDecoration || 'none',
            textAlign: (el.textAlign as any) || 'left',
            whiteSpace: 'pre-wrap', wordBreak: 'break-word',
            textShadow: '1px 1px 3px rgba(0,0,0,0.25)', lineHeight: 1.3,
          }}>{el.content}</div>
        );
      }

      case 'image':
        return (
          <img key={el.id} src={el.imageUrl} alt=""
            style={{ ...style, objectFit: (el as any).objectFit || 'contain' }} />
        );

      case 'gif':
        return (
          <img key={el.id} src={el.gifUrl} alt=""
            style={{ ...style, objectFit: 'contain' }} />
        );

      case 'video':
        return (
          <video key={el.id} src={el.videoUrl} style={style}
            autoPlay={isPlaying && (el.autoplay ?? true)} loop={el.loop ?? true} muted playsInline />
        );

      case 'shape':
        return (
          <div key={el.id} style={{
            ...style,
            backgroundColor: el.color || '#6366f1',
            borderRadius: el.shape === 'circle' ? '50%' : 4,
          }} />
        );

      case 'line':
        return (
          <div key={el.id} style={{
            ...style,
            height: `${((el.strokeWidth || 4) / panelH) * 100}%`,
            top: `${(el.y / panelH) * 100}%`,
            backgroundColor: el.color || '#1a1a1a',
          }} />
        );

      case 'arrow':
        return (
          <svg key={el.id} style={{ ...style }} viewBox="0 0 100 20" preserveAspectRatio="none">
            <defs>
              <marker id={`ah-${el.id}`} markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto">
                <polygon points="0 0,8 3,0 6" fill={el.color || '#ef4444'} />
              </marker>
            </defs>
            <line x1="0" y1="10" x2="94" y2="10"
              stroke={el.color || '#ef4444'} strokeWidth={el.strokeWidth || 4}
              markerEnd={`url(#ah-${el.id})`} />
          </svg>
        );

      case 'sticker':
        return (
          <div key={el.id} style={{
            ...style,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: `clamp(12px, ${((el.width || 80) / panelW) * 75}vw, 400px)`,
            lineHeight: 1,
          }}>{el.stickerType || '⭐'}</div>
        );

      default:
        return null;
    }
  };

  return (
    // Contenedor que mantiene el aspect ratio COMPLETO del panel
    <div style={{
      position: 'relative',
      width: '100%',
      // El aspect ratio CSS hace que el div ocupe el alto correcto automáticamente
      aspectRatio: `${panelW} / ${panelH}`,
      backgroundColor: panel.backgroundColor || '#ffffff',
      backgroundImage: panel.backgroundImage
        ? `url(${panel.backgroundImage})`
        : panel.imageUrl
        ? `url(${panel.imageUrl})`
        : undefined,
      backgroundSize: (panel as any).backgroundSize || 'cover',
      backgroundRepeat: 'no-repeat',
      backgroundPosition: (panel as any).backgroundPosition || 'center',
      overflow: 'hidden',
      borderRadius: 8,
      boxShadow: '0 4px 24px rgba(0,0,0,0.5)',
    }}>
      {sorted.filter(el => el.visible !== false).map(renderElement)}
    </div>
  );
};

export default ViewerCanvas;