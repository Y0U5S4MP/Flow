import React, { useState } from 'react';
import { PanelTransition } from '../types/Comic';
import TransitionPreview from './TransitionPreview';

interface TransitionSettingsProps {
  title: string;
  transition?: PanelTransition;
  onUpdate: (transition: PanelTransition | undefined) => void;
}

const TransitionSettings: React.FC<TransitionSettingsProps> = ({ title, transition, onUpdate }) => {
  const [showPreview, setShowPreview] = useState(false);

  const defaultTransition: PanelTransition = {
    type: 'fade',
    duration: 500,
    easing: 'ease-in-out',
  };

  const current = transition || defaultTransition;
  const needsDir = current.type === 'slide' || current.type === 'wipe';

  const handleType = (type: PanelTransition['type']) => {
    if (type === 'none') { onUpdate(undefined); }
    else { onUpdate({ ...current, type }); }
  };

  const handleChange = (updates: Partial<PanelTransition>) => {
    onUpdate({ ...current, ...updates });
  };

  // Transición real que se pasa al preview (si no hay, usamos none para que no anime)
  const previewTransition: PanelTransition = transition ?? { type: 'none', duration: 400 };

  return (
    <div className="space-y-3 p-4 bg-gray-50 rounded-xl border border-gray-200">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-gray-700 text-sm">{title}</h4>
        {/* Botón de preview siempre visible */}
        <button
          onClick={() => setShowPreview(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-semibold transition-all"
          title="Ver animación"
        >
          🎬 Preview
        </button>
      </div>

      {/* Tipo */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Tipo de transición</label>
        <select
          value={transition ? current.type : 'none'}
          onChange={e => handleType(e.target.value as PanelTransition['type'])}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm focus:border-purple-400 focus:outline-none"
        >
          <option value="none">Sin transición (corte directo)</option>
          <option value="fade">✨ Fundido (Fade)</option>
          <option value="slide">➡️  Deslizar (Slide)</option>
          <option value="zoom">🔍 Zoom</option>
          <option value="flip">🃏 Voltear (Flip)</option>
          <option value="wipe">🖐 Barrido (Wipe)</option>
          <option value="dissolve">💨 Disolver</option>
        </select>
      </div>

      {/* Opciones extra cuando hay transición seleccionada */}
      {transition && current.type !== 'none' && (
        <>
          <div>
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>Duración</span>
              <span className="font-semibold text-gray-700">{current.duration}ms</span>
            </div>
            <input type="range" min={100} max={2000} step={50} value={current.duration}
              onChange={e => handleChange({ duration: +e.target.value })}
              className="w-full h-1.5 rounded-full bg-gray-200 accent-purple-600 cursor-pointer" />
            <div className="flex justify-between text-xs text-gray-400 mt-0.5">
              <span>Rápido (100ms)</span><span>Lento (2s)</span>
            </div>
          </div>

          {needsDir && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Dirección</label>
              <div className="grid grid-cols-4 gap-1">
                {[
                  { val: 'left',  label: '←' },
                  { val: 'right', label: '→' },
                  { val: 'up',    label: '↑' },
                  { val: 'down',  label: '↓' },
                ].map(({ val, label }) => (
                  <button key={val} onClick={() => handleChange({ direction: val as any })}
                    className={`py-2 rounded-lg text-sm font-bold transition-all border ${
                      (current.direction || 'left') === val
                        ? 'bg-purple-600 text-white border-purple-600'
                        : 'bg-white text-gray-600 border-gray-300 hover:border-purple-300 hover:text-purple-600'
                    }`}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Suavizado</label>
            <select value={current.easing || 'ease-in-out'}
              onChange={e => handleChange({ easing: e.target.value as any })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm focus:border-purple-400 focus:outline-none">
              <option value="linear">Lineal (constante)</option>
              <option value="ease">Suave</option>
              <option value="ease-in">Acelera al inicio</option>
              <option value="ease-out">Desacelera al final</option>
              <option value="ease-in-out">Suave en ambos lados</option>
            </select>
          </div>

          {/* Preview inline compacto — key fuerza remount al cambiar tipo/dirección */}
          <div className="pt-2 border-t border-gray-200">
            <p className="text-xs text-gray-500 mb-2 font-medium">Vista previa:</p>
            <TransitionPreview
              key={`${current.type}-${current.direction ?? 'none'}-${current.duration}`}
              transition={previewTransition}
            />
          </div>
        </>
      )}

      {/* Si no hay transición seleccionada, ofrece preview en modal */}
      {!transition && (
        <p className="text-xs text-gray-400 text-center py-1">
          Selecciona un tipo para configurar y previsualizar la transición
        </p>
      )}

      {/* Modal de preview (botón arriba) */}
      {showPreview && (
        <TransitionPreview
          key={`modal-${current.type}-${current.direction ?? 'none'}`}
          transition={previewTransition}
          asModal
          onClose={() => setShowPreview(false)}
        />
      )}
    </div>
  );
};

export default TransitionSettings;