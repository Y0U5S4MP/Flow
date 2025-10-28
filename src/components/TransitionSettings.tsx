import React from 'react';
import { PanelTransition } from '../types/Comic';

interface TransitionSettingsProps {
  title: string;
  transition?: PanelTransition;
  onUpdate: (transition: PanelTransition | undefined) => void;
}

const TransitionSettings: React.FC<TransitionSettingsProps> = ({ title, transition, onUpdate }) => {
  const defaultTransition: PanelTransition = {
    type: 'fade',
    duration: 500,
    easing: 'ease-in-out'
  };

  const currentTransition = transition || defaultTransition;

  const handleTypeChange = (type: PanelTransition['type']) => {
    if (type === 'none') {
      onUpdate(undefined);
    } else {
      onUpdate({ ...currentTransition, type });
    }
  };

  const handleChange = (updates: Partial<PanelTransition>) => {
    onUpdate({ ...currentTransition, ...updates });
  };

  const needsDirection = currentTransition.type === 'slide' || currentTransition.type === 'wipe';

  return (
    <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
      <h4 className="font-medium text-gray-700 text-sm">{title}</h4>

      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Tipo</label>
        <select
          value={transition ? currentTransition.type : 'none'}
          onChange={(e) => handleTypeChange(e.target.value as PanelTransition['type'])}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm"
        >
          <option value="none">Sin transición</option>
          <option value="fade">Fundido (Fade)</option>
          <option value="slide">Deslizar (Slide)</option>
          <option value="zoom">Zoom</option>
          <option value="flip">Voltear (Flip)</option>
          <option value="wipe">Barrido (Wipe)</option>
          <option value="dissolve">Disolver (Dissolve)</option>
        </select>
      </div>

      {transition && currentTransition.type !== 'none' && (
        <>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Duración: {currentTransition.duration}ms
            </label>
            <input
              type="range"
              min="200"
              max="2000"
              step="100"
              value={currentTransition.duration}
              onChange={(e) => handleChange({ duration: Number(e.target.value) })}
              className="w-full"
            />
          </div>

          {needsDirection && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Dirección</label>
              <select
                value={currentTransition.direction || 'left'}
                onChange={(e) => handleChange({ direction: e.target.value as PanelTransition['direction'] })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm"
              >
                <option value="left">Izquierda</option>
                <option value="right">Derecha</option>
                <option value="up">Arriba</option>
                <option value="down">Abajo</option>
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Suavizado</label>
            <select
              value={currentTransition.easing || 'ease-in-out'}
              onChange={(e) => handleChange({ easing: e.target.value as PanelTransition['easing'] })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm"
            >
              <option value="linear">Lineal</option>
              <option value="ease">Suave</option>
              <option value="ease-in">Suave entrada</option>
              <option value="ease-out">Suave salida</option>
              <option value="ease-in-out">Suave ambos</option>
            </select>
          </div>
        </>
      )}
    </div>
  );
};

export default TransitionSettings;
