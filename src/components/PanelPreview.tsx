import React from 'react';
import { Panel, ComicElement } from '../types/Comic';
import { FileText, Image, Film, Upload as UploadIcon } from 'lucide-react';

interface PanelPreviewProps {
  panels: Panel[];
  currentPanelIndex?: number;
  onPanelClick?: (index: number) => void;
}

const PanelPreview: React.FC<PanelPreviewProps> = ({ 
  panels, 
  currentPanelIndex = -1, 
  onPanelClick 
}) => {
  const renderElement = (element: ComicElement) => {
    const style: React.CSSProperties = {
      position: 'absolute',
      left: `${(element.x / 800) * 100}%`,
      top: `${(element.y / 600) * 100}%`,
      fontSize: element.fontSize ? `${element.fontSize * 0.3}px` : '8px',
      color: element.color || '#000000',
      maxWidth: element.width ? `${(element.width / 800) * 100}%` : 'auto',
      maxHeight: element.height ? `${(element.height / 600) * 100}%` : 'auto',
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

  if (panels.length === 0) {
    return (
      <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-purple-100">
        <h3 className="text-xl font-bold text-gray-800 mb-4">Previsualización</h3>
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Image className="w-8 h-8 text-gray-400" />
          </div>
          <p className="text-gray-500">No hay paneles para mostrar</p>
          <p className="text-sm text-gray-400 mt-2">Agrega elementos al panel actual y luego añádelo a la historieta</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-purple-100">
      <h3 className="text-xl font-bold text-gray-800 mb-4">
        Previsualización ({panels.length} panel{panels.length !== 1 ? 'es' : ''})
      </h3>
      
      <div className="space-y-4 max-h-96 overflow-y-auto">
        {panels.map((panel, index) => (
          <div
            key={panel.id}
            className={`relative border-2 rounded-lg transition-all duration-200 cursor-pointer ${
              index === currentPanelIndex
                ? 'border-purple-500 bg-purple-50'
                : 'border-gray-200 hover:border-purple-300 bg-white'
            }`}
            onClick={() => onPanelClick?.(index)}
          >
            {/* Panel Header */}
            <div className="flex items-center justify-between p-3 border-b border-gray-100">
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 bg-purple-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
                  {index + 1}
                </div>
                <span className="text-sm font-medium text-gray-700">
                  Panel {index + 1}
                </span>
              </div>
              <div className="flex items-center space-x-1">
                {panel.elements.slice(0, 3).map((element, elemIndex) => (
                  <div
                    key={elemIndex}
                    className="w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center text-blue-600"
                  >
                    {getElementIcon(element.type)}
                  </div>
                ))}
                {panel.elements.length > 3 && (
                  <div className="w-5 h-5 bg-gray-100 rounded-full flex items-center justify-center text-xs text-gray-600">
                    +{panel.elements.length - 3}
                  </div>
                )}
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
              <div className="flex justify-between items-center">
                <span>{panel.elements.length} elemento{panel.elements.length !== 1 ? 's' : ''}</span>
                <div className="flex space-x-2">
                  {panel.elements.some(e => e.type === 'text') && (
                    <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full">Texto</span>
                  )}
                  {panel.elements.some(e => e.type === 'image') && (
                    <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full">Imagen</span>
                  )}
                  {panel.elements.some(e => e.type === 'gif') && (
                    <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">GIF</span>
                  )}
                  {panel.elements.some(e => e.type === 'video') && (
                    <span className="bg-red-100 text-red-800 px-2 py-1 rounded-full">Video</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {panels.length > 0 && (
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-blue-800 text-sm">
            <strong>💡 Consejo:</strong> Haz clic en cualquier panel para editarlo o reorganizar el orden de tu historieta.
          </p>
        </div>
      )}
    </div>
  );
};

export default PanelPreview;