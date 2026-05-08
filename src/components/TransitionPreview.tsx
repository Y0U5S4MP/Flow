import React, { useState, useEffect, useRef } from 'react';
import { PanelTransition } from '../types/Comic';

// CSS de todas las animaciones de transición entre paneles
const CSS = `
@keyframes _tp_fadeIn    { from{opacity:0}              to{opacity:1} }
@keyframes _tp_fadeOut   { from{opacity:1}              to{opacity:0} }
@keyframes _tp_slideInL  { from{transform:translateX(-100%)} to{transform:translateX(0)} }
@keyframes _tp_slideOutL { from{transform:translateX(0)}     to{transform:translateX(-100%)} }
@keyframes _tp_slideInR  { from{transform:translateX(100%)}  to{transform:translateX(0)} }
@keyframes _tp_slideOutR { from{transform:translateX(0)}     to{transform:translateX(100%)} }
@keyframes _tp_slideInU  { from{transform:translateY(-100%)} to{transform:translateY(0)} }
@keyframes _tp_slideOutU { from{transform:translateY(0)}     to{transform:translateY(-100%)} }
@keyframes _tp_slideInD  { from{transform:translateY(100%)}  to{transform:translateY(0)} }
@keyframes _tp_slideOutD { from{transform:translateY(0)}     to{transform:translateY(100%)} }
@keyframes _tp_zoomIn    { from{transform:scale(0.2);opacity:0} to{transform:scale(1);opacity:1} }
@keyframes _tp_zoomOut   { from{transform:scale(1);opacity:1}   to{transform:scale(0.2);opacity:0} }
@keyframes _tp_flipIn    { from{transform:perspective(400px) rotateY(90deg);opacity:0} to{transform:perspective(400px) rotateY(0);opacity:1} }
@keyframes _tp_flipOut   { from{transform:perspective(400px) rotateY(0);opacity:1}     to{transform:perspective(400px) rotateY(90deg);opacity:0} }
@keyframes _tp_wipeIn    { from{clip-path:inset(0 100% 0 0)} to{clip-path:inset(0 0% 0 0)} }
@keyframes _tp_wipeOut   { from{clip-path:inset(0 0% 0 0)}   to{clip-path:inset(0 100% 0 0)} }
@keyframes _tp_disIn     { from{opacity:0;filter:blur(14px)} to{opacity:1;filter:blur(0)} }
@keyframes _tp_disOut    { from{opacity:1;filter:blur(0)}    to{opacity:0;filter:blur(14px)} }
`;

function animName(type: PanelTransition['type'], phase: 'in'|'out', dir?: string): string {
  const D: Record<string,string> = { left:'L', right:'R', up:'U', down:'D' };
  const d = D[dir||'left'] || 'L';
  const map: Record<string, [string,string]> = {
    fade:    ['_tp_fadeIn',  '_tp_fadeOut'],
    slide:   [`_tp_slideIn${d}`, `_tp_slideOut${d}`],
    zoom:    ['_tp_zoomIn',  '_tp_zoomOut'],
    flip:    ['_tp_flipIn',  '_tp_flipOut'],
    wipe:    ['_tp_wipeIn',  '_tp_wipeOut'],
    dissolve:['_tp_disIn',   '_tp_disOut'],
  };
  const pair = map[type];
  return pair ? pair[phase === 'in' ? 0 : 1] : '';
}

// Paneles de ejemplo con colores distintos
const PANEL_A = { bg: 'linear-gradient(135deg,#6366f1,#8b5cf6)', label: 'Panel A' };
const PANEL_B = { bg: 'linear-gradient(135deg,#ec4899,#f97316)', label: 'Panel B' };

interface Props {
  transition: PanelTransition;
  /** Si se pasa, se muestra como modal flotante con overlay */
  asModal?: boolean;
  onClose?: () => void;
}

type Phase = 'showing-a' | 'out-a' | 'in-b' | 'showing-b' | 'out-b' | 'in-a';

const TransitionPreview: React.FC<Props> = ({ transition, asModal, onClose }) => {
  const [phase, setPhase] = useState<Phase>('showing-a');
  const [running, setRunning] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  // Inyectar CSS una vez
  useEffect(() => {
    const id = '__tp_css';
    if (!document.getElementById(id)) {
      const s = document.createElement('style');
      s.id = id; s.textContent = CSS;
      document.head.appendChild(s);
    }
  }, []);

  const dur   = transition.duration ?? 500;
  const ease  = transition.easing   ?? 'ease-in-out';
  const dir   = transition.direction;
  const type  = transition.type;
  const pause = 900; // ms que se ve cada panel quieto

  const play = () => {
    if (running) return;
    setRunning(true);
    setPhase('showing-a');

    const seq = [
      { phase: 'out-a'     as Phase, delay: pause },
      { phase: 'in-b'      as Phase, delay: dur   },
      { phase: 'showing-b' as Phase, delay: pause },
      { phase: 'out-b'     as Phase, delay: pause },
      { phase: 'in-a'      as Phase, delay: dur   },
      { phase: 'showing-a' as Phase, delay: 0     },
    ];

    let elapsed = 0;
    seq.forEach(({ phase: p, delay }) => {
      elapsed += delay;
      timerRef.current = setTimeout(() => setPhase(p), elapsed);
    });

    setTimeout(() => setRunning(false), elapsed + 50);
  };

  // Auto-play al abrir
  useEffect(() => { play(); }, []);

  // Limpieza
  useEffect(() => () => clearTimeout(timerRef.current), []);

  const panelStyle = (panel: typeof PANEL_A, ph: Phase): React.CSSProperties => {
    const isA = panel === PANEL_A;
    const isVisible = isA
      ? (ph === 'showing-a' || ph === 'out-a' || ph === 'in-a')
      : (ph === 'showing-b' || ph === 'out-b' || ph === 'in-b');

    if (!isVisible || type === 'none') {
      return { display: isVisible ? 'flex' : 'none', background: panel.bg };
    }

    // Determina animación
    let anim = '';
    if (isA && ph === 'out-a') anim = animName(type, 'out', dir);
    if (!isA && ph === 'in-b') anim = animName(type, 'in',  dir);
    if (!isA && ph === 'out-b') anim = animName(type, 'out', dir);
    if (isA && ph === 'in-a')  anim = animName(type, 'in',  dir);

    return {
      display: 'flex',
      background: panel.bg,
      animation: anim ? `${anim} ${dur}ms ${ease} both` : 'none',
    };
  };

  const content = (
    <div style={{ width: 340, userSelect: 'none' }}>
      {/* Pantalla de preview */}
      <div style={{
        position: 'relative', width: '100%', aspectRatio: '16/9',
        background: '#111', borderRadius: 12, overflow: 'hidden',
        boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
      }}>
        {[PANEL_A, PANEL_B].map(p => {
          const st = panelStyle(p, phase);
          if (st.display === 'none') return null;
          return (
            <div key={p.label} style={{
              position: 'absolute', inset: 0,
              alignItems: 'center', justifyContent: 'center',
              flexDirection: 'column', gap: 8,
              ...st,
            }}>
              <span style={{ fontSize: 32 }}>{p === PANEL_A ? '📖' : '📗'}</span>
              <span style={{ color: 'white', fontWeight: 700, fontSize: 18, textShadow: '0 1px 4px rgba(0,0,0,0.5)' }}>{p.label}</span>
            </div>
          );
        })}

        {/* Badge de transición */}
        <div style={{
          position: 'absolute', top: 8, left: 8,
          background: 'rgba(0,0,0,0.65)', color: 'white',
          fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 20,
        }}>
          {type === 'none' ? 'Sin transición' : type} · {dur}ms
        </div>
      </div>

      {/* Controles */}
      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <button onClick={play} disabled={running}
          style={{
            flex: 1, padding: '8px 0', borderRadius: 8,
            background: running ? '#4c1d95' : '#7c3aed',
            color: 'white', fontWeight: 600, fontSize: 13,
            border: 'none', cursor: running ? 'default' : 'pointer',
            opacity: running ? 0.7 : 1,
          }}>
          {running ? '⏳ Reproduciendo...' : '▶ Reproducir'}
        </button>
        {onClose && (
          <button onClick={onClose}
            style={{
              padding: '8px 16px', borderRadius: 8,
              background: '#f3f4f6', color: '#374151',
              fontWeight: 600, fontSize: 13, border: 'none', cursor: 'pointer',
            }}>
            Cerrar
          </button>
        )}
      </div>

      {/* Info */}
      <p style={{ marginTop: 8, fontSize: 11, color: '#9ca3af', textAlign: 'center' }}>
        {type === 'none' ? 'Selecciona un tipo de transición para previsualizar' : `Transición "${type}" — ${dur}ms · ${ease}`}
      </p>
    </div>
  );

  if (!asModal) return content;

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 9999,
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()}
        style={{ background: '#1e1b4b', borderRadius: 16, padding: 20, boxShadow: '0 20px 60px rgba(0,0,0,0.8)' }}>
        <p style={{ color: 'white', fontWeight: 700, fontSize: 15, marginBottom: 12, textAlign: 'center' }}>
          🎬 Vista previa de transición
        </p>
        {content}
      </div>
    </div>
  );
};

export default TransitionPreview;