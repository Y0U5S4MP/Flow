import React, { useState } from 'react';
import { Panel, ComicElement } from '../types/Comic';
import {
  FileText, Image, Film, Upload as UploadIcon,
  Edit, Trash2, Eye, EyeOff, Copy,
  RotateCw, Move3D, Zap, Music, Sparkles, ArrowUp, ArrowDown
} from 'lucide-react';

interface DraggablePanelPreviewProps {
  panels: Panel[];
  onPanelsReorder: (panels: Panel[]) => void;
  onPanelEdit: (panel: Panel, index: number) => void;
  onPanelDelete: (index: number) => void;
  currentPanelIndex?: number;
}

const DraggablePanelPreview: React.FC<DraggablePanelPreviewProps> = ({ 
  panels, 
  onPanelsReorder,
  onPanelEdit,
  onPanelDelete,
  currentPanelIndex = -1
}) => {
  const [hiddenPanels, setHiddenPanels] = useState<Set<number>>(new Set());

  const movePanelUp = (index: number) => {
    if (index === 0) return;
    const items = Array.from(panels);
    [items[index - 1], items[index]] = [items[index], items[index - 1]];
    onPanelsReorder(items);
  };

  const movePanelDown = (index: number) => {
    if (index === panels.length - 1) return;
    const items = Array.from(panels);
    [items[index], items[index + 1]] = [items[index + 1], items[index]];
    onPanelsReorder(items);
  };

  const duplicatePanel = (index: number) => {
    const panelToDuplicate = panels[index];
    const duplicatedPanel: Panel = {
      ...panelToDuplicate,
      id: `${panelToDuplicate.id}-copy-${Date.now()}`,
      elements: panelToDuplicate.elements.map(el => ({
        ...el,
        id: `${el.id}-copy-${Date.now()}`
      }))
    };
    
    const newPanels = [...panels];
    newPanels.splice(index + 1, 0, duplicatedPanel);
    onPanelsReorder(newPanels);
  };
  const togglePanelVisibility = (index: number) => {
    const newHidden = new Set(hiddenPanels);
    if (newHidden.has(index)) {
      newHidden.delete(index);
    } else {
      newHidden.add(index);
    }
    setHiddenPanels(newHidden);
  };

  const renderElement = (element: ComicElement) => {
    const style: React.CSSProperties = {
      position: 'absolute',
      left: `${(element.x / 800) * 100}%`,
      top: `${(element.y / 600) * 100}%`,
      fontSize: element.fontSize ? `${element.fontSize * 0.3}px` : '8px',
      color: element.color || '#000000',
      maxWidth: element.width ? `${(element.width / 800) * 100}%` : 'auto',
      maxHeight: element.height ? `${(element.height / 600) * 100}%` : 'auto',
      opacity: element.visible === false ? 0.3 : 1,
    };

    switch (element.type) {
      case 'text':
        return (
          <div key={element.id} style={style} className="text-xs truncate">
            {element.content || 'Texto'}
          </div>
        );
      
      case 'image':
        return (
          <img
            key={element.id}
            src={element.imageUrl}
            alt="Imagen"
            style={{
              ...style,
              width: element.width ? `${(element.width / 800) * 100}%` : '20%',
              height: element.height ? `${(element.height / 600) * 100}%` : '15%',
              objectFit: 'cover',
              borderRadius: '2px'
            }}
          />
        );
      
      case 'gif':
        return (
          <img
            key={element.id}
            src={element.gifUrl}
            alt="GIF"
            style={{
              ...style,
              width: element.width ? `${(element.width / 800) * 100}%` : '20%',
              height: element.height ? `${(element.height / 600) * 100}%` : '15%',
              objectFit: 'cover',
              borderRadius: '2px'
            }}
          />
        );
      
      case 'video':
        return (
          <div
            key={element.id}
            style={{
              ...style,
              width: element.width ? `${(element.width / 800) * 100}%` : '25%',
              height: element.height ? `${(element.height / 600) * 100}%` : '20%',
              backgroundColor: '#000',
              borderRadius: '2px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <Film className="w-3 h-3 text-white" />
          </div>
        );

      case 'brush':
        return (
          <div
            key={element.id}
            style={{
              ...style,
              width: '15%',
              height: '10%',
              backgroundColor: element.color || '#000000',
              borderRadius: '50%',
              opacity: 0.7
            }}
          />
        );
      
      default:
        return null;
    }
  };

  const getElementIcon = (type: string) => {
    switch (type) {
      case 'text': return <FileText className="w-3 h-3" />;
      case 'image': return <Image className="w-3 h-3" />;
      case 'gif': return <UploadIcon className="w-3 h-3" />;
      case 'video': return <Film className="w-3 h-3" />;
      default: return null;
    }
  };

  const getAnimationBadges = (panel: Panel) => {
    const badges = [];
    if (panel.animations && panel.animations.length > 0) {
      badges.push(
        <span key="anim" className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs flex items-center space-x-1">
          <Zap className="w-3 h-3" />
          <span>{panel.animations.length}</span>
        </span>
      );
    }
    if (panel.transitions && panel.transitions.length > 0) {
      badges.push(
        <span key="trans" className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs flex items-center space-x-1">
          <Move3D className="w-3 h-3" />
          <span>{panel.transitions.length}</span>
        </span>
      );
    }
    if (panel.audio) {
      badges.push(
        <span key="audio" className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs flex items-center space-x-1">
          <Music className="w-3 h-3" />
          <span>Audio</span>
        </span>
      );
    }
    if (panel.elements.some(el => el.filters && el.filters.length > 0)) {
      badges.push(
        <span key="effects" className="bg-purple-100 text-purple-800 px-2 py-1 rounded-full text-xs flex items-center space-x-1">
          <Sparkles className="w-3 h-3" />
          <span>FX</span>
        </span>
      );
    }
    return badges;
  };

  if (panels.length === 0) {
    return (
      <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-purple-100">
        <h3 className="text-xl font-bold text-gray-800 mb-4">Previsualización</h3>
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Image className="w-8 h-8 text-gray-400" />
          </div>
          <p className="text-gray-500">No hay paneles para mostrar</p>
          <p className="text-sm text-gray-400 mt-2">Sube archivos o crea paneles para comenzar</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-purple-100">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-bold text-gray-800">
          Previsualización ({panels.length} panel{panels.length !== 1 ? 'es' : ''})
        </h3>
        <div className="text-sm text-gray-600">
          Usa las flechas para reordenar
        </div>
      </div>
      
      <div className="space-y-4 max-h-96 overflow-y-auto">
        {panels.map((panel, index) => (
          <div
            key={panel.id}
            className={`relative border-2 rounded-lg transition-all duration-200 ${
              index === currentPanelIndex
                ? 'border-purple-500 bg-purple-50'
                : 'border-gray-200 hover:border-purple-300 bg-white'
            } ${hiddenPanels.has(index) ? 'opacity-50' : ''}`}
          >
                      {/* Panel Header */}
                      <div className="flex items-center justify-between p-3 border-b border-gray-100">
                        <div className="flex items-center space-x-2">
                          <div className="flex flex-col">
                            <button
                              onClick={() => movePanelUp(index)}
                              disabled={index === 0}
                              className="p-0.5 hover:bg-gray-100 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                              title="Mover arriba"
                            >
                              <ArrowUp className="w-3 h-3 text-gray-600" />
                            </button>
                            <button
                              onClick={() => movePanelDown(index)}
                              disabled={index === panels.length - 1}
                              className="p-0.5 hover:bg-gray-100 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                              title="Mover abajo"
                            >
                              <ArrowDown className="w-3 h-3 text-gray-600" />
                            </button>
                          </div>
                          <div className="w-6 h-6 bg-purple-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
                            {index + 1}
                          </div>
                          <span className="text-sm font-medium text-gray-700">
                            Panel {index + 1}
                          </span>
                          {panel.elements.length === 0 && (
                            <span className="text-xs text-red-500 bg-red-50 px-2 py-1 rounded-full">
                              Vacío
                            </span>
                          )}
                        </div>
                        
                        <div className="flex items-center space-x-1">
                          <button
                            onClick={() => duplicatePanel(index)}
                            className="p-1 hover:bg-blue-100 rounded text-blue-600 transition-colors"
                            title="Duplicar panel"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => togglePanelVisibility(index)}
                            className="p-1 hover:bg-gray-100 rounded text-gray-500 transition-colors"
                            title={hiddenPanels.has(index) ? 'Mostrar panel' : 'Ocultar panel'}
                          >
                            {hiddenPanels.has(index) ? 
                              <EyeOff className="w-4 h-4" /> : 
                              <Eye className="w-4 h-4" />
                            }
                          </button>
                          <button
                            onClick={() => onPanelEdit(panel, index)}
                            className="p-1 hover:bg-blue-100 rounded text-blue-600 transition-colors"
                            title="Editar panel"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => onPanelDelete(index)}
                            className="p-1 hover:bg-red-100 rounded text-red-600 transition-colors"
                            title="Eliminar panel"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Panel Preview */}
                      <div className="relative bg-white h-24 overflow-hidden">
                        {panel.elements.length === 0 ? (
                          <div className="flex items-center justify-center h-full text-gray-400">
                            <div className="text-center">
                              <Image className="w-6 h-6 mx-auto mb-1" />
                              <p className="text-xs">Panel vacío</p>
                            </div>
                          </div>
                        ) : (
                          <div className="relative w-full h-full">
                            {panel.elements.map(renderElement)}
                          </div>
                        )}
                      </div>

                      {/* Panel Info */}
                      <div className="p-2 bg-gray-50 text-xs text-gray-600">
                        <div className="flex justify-between items-center mb-2">
                          <div className="flex items-center space-x-2">
                            <span>{panel.elements.length} elemento{panel.elements.length !== 1 ? 's' : ''}</span>
                            {panel.elements.length > 0 && (
                              <div className="flex space-x-1">
                                {panel.elements.some(e => e.type === 'text') && (
                                  <div className="w-2 h-2 bg-blue-500 rounded-full" title="Contiene texto" />
                                )}
                                {panel.elements.some(e => e.type === 'image') && (
                                  <div className="w-2 h-2 bg-green-500 rounded-full" title="Contiene imagen" />
                                )}
                                {panel.elements.some(e => e.type === 'gif') && (
                                  <div className="w-2 h-2 bg-yellow-500 rounded-full" title="Contiene GIF" />
                                )}
                                {panel.elements.some(e => e.type === 'video') && (
                                  <div className="w-2 h-2 bg-red-500 rounded-full" title="Contiene video" />
                                )}
                                {panel.elements.some(e => e.type === 'brush') && (
                                  <div className="w-2 h-2 bg-purple-500 rounded-full" title="Contiene dibujo" />
                                )}
                              </div>
                            )}
                          </div>
                          <div className="flex space-x-1">
                            {panel.elements.slice(0, 4).map((element, elemIndex) => (
                              <div
                                key={elemIndex}
                                className={`w-4 h-4 rounded-full flex items-center justify-center text-xs ${
                                  element.type === 'text' ? 'bg-blue-100 text-blue-600' :
                                  element.type === 'image' ? 'bg-green-100 text-green-600' :
                                  element.type === 'gif' ? 'bg-yellow-100 text-yellow-600' :
                                  element.type === 'video' ? 'bg-red-100 text-red-600' :
                                  element.type === 'brush' ? 'bg-purple-100 text-purple-600' :
                                  'bg-gray-100 text-gray-600'
                                }`}
                              >
                                {getElementIcon(element.type)}
                              </div>
                            ))}
                            {panel.elements.length > 4 && (
                              <div className="w-4 h-4 bg-gray-100 rounded-full flex items-center justify-center text-xs text-gray-600 font-bold">
                                +{panel.elements.length - 4}
                              </div>
                            )}
                          </div>
                        </div>
                        
                        {/* Animation/Audio badges */}
                        {getAnimationBadges(panel).length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {getAnimationBadges(panel)}
                          </div>
                        )}
                      </div>
          </div>
        ))}
      </div>

      {panels.length > 0 && (
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-blue-800 text-sm">
            <strong>💡 Consejos:</strong> 
            • Usa las flechas ↑↓ para reordenar paneles
            • Usa el botón de copiar para duplicar paneles
            • Los puntos de colores indican tipos de contenido
            • Los badges muestran animaciones, transiciones y efectos aplicados
          </p>
        </div>
      )}
    </div>
  );
};

export default DraggablePanelPreview;