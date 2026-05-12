import React, { useEffect, useMemo } from 'react';
import { Panel, ComicElement, ElementAnimation } from '../types/Comic';

interface ViewerCanvasProps {
  panel: Panel;
  isPlaying: boolean;
}

// ─── Entrance animation CSS (injected once, shared with editor) ───────────────
const ENTRANCE_CSS = `
@keyframes ea_fadeIn   { from { opacity:0 }                              to { opacity:1 } }
@keyframes ea_slideInL { from { transform:translateX(-110%); opacity:0 } to { transform:translateX(0); opacity:1 } }
@keyframes ea_slideInR { from { transform:translateX( 110%); opacity:0 } to { transform:translateX(0); opacity:1 } }
@keyframes ea_slideInU { from { transform:translateY(-110%); opacity:0 } to { transform:translateY(0); opacity:1 } }
@keyframes ea_slideInD { from { transform:translateY( 110%); opacity:0 } to { transform:translateY(0); opacity:1 } }
@keyframes ea_zoomIn   { from { transform:scale(0.2);  opacity:0 }       to { transform:scale(1);   opacity:1 } }
@keyframes ea_bounceIn {
  0%   { transform:scale(0.3);  opacity:0 }
  55%  { transform:scale(1.1);  opacity:1 }
  75%  { transform:scale(0.95) }
  100% { transform:scale(1);    opacity:1 }
}
`;

export function injectEntranceCSS() {
  const id = '__ea_entrance_css';
  if (!document.getElementById(id)) {
    const s = document.createElement('style');
    s.id = id;
    s.textContent = ENTRANCE_CSS;
    document.head.appendChild(s);
  }
}

export function buildEntranceAnimation(anim: ElementAnimation): string {
  const dirMap: Record<string, string> = { left: 'L', right: 'R', up: 'U', down: 'D' };
  let name = '';
  switch (anim.type) {
    case 'fadeIn':   name = 'ea_fadeIn'; break;
    case 'slideIn':  name = `ea_slideIn${dirMap[anim.direction || 'left'] ?? 'L'}`; break;
    case 'zoomIn':   name = 'ea_zoomIn'; break;
    case 'bounceIn': name = 'ea_bounceIn'; break;
    default: return '';
  }
  return `${name} ${anim.duration}ms ease-out ${anim.delay ?? 0}ms both`;
}

// ─── TypewriterText ───────────────────────────────────────────────────────────
const TypewriterText: React.FC<{
  text: string;
  duration: number;
  delay?: number;
  style?: React.CSSProperties;
}> = React.memo(({ text, duration, delay = 0, style }) => {
  const [displayed, setDisplayed] = React.useState('');
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
});

// ─── Component ────────────────────────────────────────────────────────────────
const ViewerCanvas: React.FC<ViewerCanvasProps> = React.memo(({ panel }) => {
  const panelW = panel.panelWidth  || 800;
  const panelH = panel.panelHeight || 600;

  useEffect(() => { injectEntranceCSS(); }, []);

  const sorted = useMemo(
    () => [...(panel.elements || [])].sort((a, b) => (a.appearanceOrder ?? 0) - (b.appearanceOrder ?? 0)),
    [panel.elements],
  );

  const renderElement = (el: ComicElement) => {
    if (el.visible === false) return null;
    const bubbleType = (el as any).bubbleType as string | undefined;

    // Per-element transforms
    const transforms: string[] = [];
    if ((el as any).rotation)       transforms.push(`rotate(${(el as any).rotation}deg)`);
    if ((el as any).flipHorizontal) transforms.push('scaleX(-1)');
    if ((el as any).flipVertical)   transforms.push('scaleY(-1)');

    // Entrance animation
    const anim = el.entranceAnimation;
    const animStr = anim?.type ? buildEntranceAnimation(anim) : '';

    // Common wrapper: handles position, size, opacity, transform and entrance animation
    const wrapStyle: React.CSSProperties = {
      position: 'absolute',
      left:   `${(el.x / panelW) * 100}%`,
      top:    `${(el.y / panelH) * 100}%`,
      width:  el.width  ? `${(el.width  / panelW) * 100}%` : 'auto',
      height: el.height ? `${(el.height / panelH) * 100}%` : 'auto',
      pointerEvents: 'none',
      opacity: el.opacity ?? 1,
      transform: transforms.join(' ') || undefined,
      ...(animStr ? { animation: animStr, willChange: 'transform, opacity' } : {}),
    };

    // Typewriter — special: uses component state, skip CSS anim
    if (el.type === 'text' && !bubbleType && anim?.type === 'typewriter') {
      return (
        <div key={el.id} style={{
          ...wrapStyle,
          animation: undefined,
          willChange: undefined,
          fontSize: `clamp(8px, ${((el.fontSize || 24) / panelW) * 100}vw, 300px)`,
          color: el.color || '#1a1a1a',
          fontWeight: el.fontWeight || 'normal',
          fontStyle: el.fontStyle || 'normal',
          fontFamily: (el as any).fontFamily || 'Arial',
          textDecoration: (el as any).textDecoration || 'none',
          textAlign: (el.textAlign as any) || 'left',
          whiteSpace: 'pre-wrap', wordBreak: 'break-word',
          textShadow: '1px 1px 3px rgba(0,0,0,0.25)', lineHeight: 1.3,
        }}>
          <TypewriterText text={el.content || ''} duration={anim.duration} delay={anim.delay} />
        </div>
      );
    }

    let content: React.ReactNode = null;

    switch (el.type) {
      case 'text': {
        if (bubbleType) {
          const bgColor = (el as any).bgColor    || '#ffffff';
          const bdColor = (el as any).borderColor || '#222222';
          const txtStyle: React.CSSProperties = {
            fontSize: `clamp(10px, ${((el.fontSize || 24) / panelW) * 100}vw, 200px)`,
            color: el.color || '#1a1a1a', fontWeight: el.fontWeight || 'normal',
            fontFamily: (el as any).fontFamily || 'Arial',
            textAlign: 'center', wordBreak: 'break-word', lineHeight: 1.3,
          };

          if (bubbleType === 'speech') {
            // SVG speech bubble: rounded rect + pointed tail bottom-left
            content = (
              <svg viewBox="0 0 200 120" preserveAspectRatio="none"
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'visible' }}>
                <path d="M 15,0 H 185 Q 200,0 200,15 V 78 Q 200,93 185,93 H 58 L 28,120 L 46,93 H 15 Q 0,93 0,78 V 15 Q 0,0 15,0 Z"
                  fill={bgColor} stroke={bdColor} strokeWidth="4" strokeLinejoin="round" />
                <foreignObject x="6" y="4" width="188" height="82">
                  <div
                    style={{ width: '100%', height: '100%', display: 'flex',
                      alignItems: 'center', justifyContent: 'center', boxSizing: 'border-box', padding: '4px 6px' }}>
                    <span style={txtStyle}>{el.content}</span>
                  </div>
                </foreignObject>
              </svg>
            );
          } else if (bubbleType === 'thought') {
            // Cloud path: smooth bumpy top via cubic beziers, all within viewBox 0 0 200 130
            content = (
              <svg viewBox="0 0 200 130" preserveAspectRatio="none"
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'visible' }}>
                <path
                  d="M 35,88 C 15,88 5,76 8,63 C 4,48 18,36 35,40 C 30,22 48,12 65,18 C 70,6 90,4 100,8 C 110,4 130,6 135,18 C 152,12 170,22 165,40 C 182,36 196,48 192,63 C 195,76 185,88 165,88 Z"
                  fill={bgColor} stroke={bdColor} strokeWidth="4" strokeLinejoin="round" strokeLinecap="round"
                />
                <circle cx="40" cy="97"  r="9"   fill={bdColor} /><circle cx="40" cy="97"  r="6"   fill={bgColor} />
                <circle cx="27" cy="109" r="7"   fill={bdColor} /><circle cx="27" cy="109" r="4.5" fill={bgColor} />
                <circle cx="16" cy="119" r="5"   fill={bdColor} /><circle cx="16" cy="119" r="3"   fill={bgColor} />
                <foreignObject x="20" y="10" width="160" height="72">
                  <div
                    style={{ width: '100%', height: '100%', display: 'flex',
                      alignItems: 'center', justifyContent: 'center', boxSizing: 'border-box', padding: '4px 8px' }}>
                    <span style={txtStyle}>{el.content}</span>
                  </div>
                </foreignObject>
              </svg>
            );
          } else {
            // caption
            content = (
              <div style={{
                width: '100%', height: '100%', boxSizing: 'border-box',
                background: bgColor, border: `2px solid ${bdColor}`,
                borderRadius: 4, borderLeft: `6px solid ${bdColor}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: '4% 5%', position: 'relative',
              }}>
                <span style={txtStyle}>{el.content}</span>
              </div>
            );
          }
        } else {
          content = (
            <div style={{
              width: '100%', height: '100%',
              fontSize: `clamp(8px, ${((el.fontSize || 24) / panelW) * 100}vw, 300px)`,
              color: el.color || '#1a1a1a', fontWeight: el.fontWeight || 'normal',
              fontStyle: el.fontStyle || 'normal',
              fontFamily: (el as any).fontFamily || 'Arial',
              textDecoration: (el as any).textDecoration || 'none',
              textAlign: (el.textAlign as any) || 'left',
              whiteSpace: 'pre-wrap', wordBreak: 'break-word',
              textShadow: '1px 1px 3px rgba(0,0,0,0.25)', lineHeight: 1.3,
            }}>{el.content}</div>
          );
        }
        break;
      }

      case 'image':
        content = (
          <img src={el.imageUrl} alt=""
            loading="lazy" decoding="async"
            style={{ width: '100%', height: '100%', objectFit: (el as any).objectFit || 'contain', display: 'block' }} />
        );
        break;

      case 'gif':
        content = (
          <img src={el.gifUrl} alt=""
            style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }} />
        );
        break;

      case 'video':
        content = (
          <video src={el.videoUrl}
            style={{ width: '100%', height: '100%', objectFit: ((el as any).objectFit || 'contain') as any, display: 'block' }}
            autoPlay={el.autoplay ?? true} loop={el.loop ?? true} muted playsInline />
        );
        break;

      case 'shape':
        content = (
          <div style={{
            width: '100%', height: '100%',
            backgroundColor: el.color || '#6366f1',
            borderRadius: el.shape === 'circle' ? '50%' : 4,
          }} />
        );
        break;

      case 'line':
        content = (
          <div style={{
            position: 'absolute', top: '50%', left: 0,
            width: '100%', height: `${el.strokeWidth || 4}px`,
            transform: 'translateY(-50%)',
            backgroundColor: el.color || '#1a1a1a',
          }} />
        );
        break;

      case 'arrow':
        content = (
          <svg style={{ width: '100%', height: '100%' }} viewBox="0 0 100 20" preserveAspectRatio="none">
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
        break;

      case 'sticker':
        content = (
          <div style={{
            width: '100%', height: '100%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: `clamp(12px, ${((el.width || 80) / panelW) * 75}vw, 400px)`,
            lineHeight: 1,
          }}>{el.stickerType || '⭐'}</div>
        );
        break;

      default:
        return null;
    }

    return (
      <div key={el.id} style={wrapStyle}>
        {content}
      </div>
    );
  };

  return (
    <div style={{
      position: 'relative',
      width: '100%',
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
      contain: 'layout style',
    }}>
      {sorted.map(renderElement)}
    </div>
  );
});

export default ViewerCanvas;
