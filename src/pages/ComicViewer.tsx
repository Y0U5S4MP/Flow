import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Play, Pause, SkipBack, SkipForward } from 'lucide-react';
import { Comic } from '../types/Comic';
import { getComic } from '../utils/storage';
import ViewerCanvas from '../components/ViewerCanvas';

const ComicViewer: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [comic, setComic] = useState<Comic | null>(null);
  const [currentPanelIndex, setCurrentPanelIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    if (id) {
      const loadedComic = getComic(id);
      if (loadedComic) {
        setComic(loadedComic);
      } else {
        navigate('/gallery');
      }
    }
  }, [id, navigate]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isPlaying && comic) {
      interval = setInterval(() => {
        setCurrentPanelIndex(prev => {
          if (prev >= comic.panels.length - 1) {
            setIsPlaying(false);
            return 0;
          }
          return prev + 1;
        });
      }, 3000); // 3 seconds per panel
    }

    return () => clearInterval(interval);
  }, [isPlaying, comic]);

  if (!comic) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Historieta no encontrada</h2>
          <button
            onClick={() => navigate('/gallery')}
            className="text-purple-600 hover:text-purple-700 font-medium"
          >
            Volver a la galería
          </button>
        </div>
      </div>
    );
  }

  const nextPanel = () => {
    setCurrentPanelIndex(prev => 
      prev < comic.panels.length - 1 ? prev + 1 : prev
    );
  };

  const prevPanel = () => {
    setCurrentPanelIndex(prev => prev > 0 ? prev - 1 : prev);
  };

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <div className="bg-white/10 backdrop-blur-md border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <button
            onClick={() => navigate('/gallery')}
            className="flex items-center space-x-2 text-white hover:text-purple-300 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Volver</span>
          </button>
          
          <h1 className="text-xl font-bold text-white">{comic.title}</h1>
          
          <div className="text-white text-sm">
            Panel {currentPanelIndex + 1} de {comic.panels.length}
          </div>
        </div>
      </div>

      {/* Main Viewer */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="relative">
          <ViewerCanvas
            panel={comic.panels[currentPanelIndex]}
            isPlaying={isPlaying}
          />
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white/10 backdrop-blur-md border-t border-white/20">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center justify-center space-x-6">
            <button
              onClick={prevPanel}
              disabled={currentPanelIndex === 0}
              className="p-3 bg-white/20 hover:bg-white/30 disabled:opacity-50 disabled:cursor-not-allowed rounded-full text-white transition-all duration-200"
            >
              <SkipBack className="w-6 h-6" />
            </button>
            
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="p-4 bg-purple-600 hover:bg-purple-700 rounded-full text-white transition-all duration-200 transform hover:scale-105"
            >
              {isPlaying ? <Pause className="w-8 h-8" /> : <Play className="w-8 h-8" />}
            </button>
            
            <button
              onClick={nextPanel}
              disabled={currentPanelIndex === comic.panels.length - 1}
              className="p-3 bg-white/20 hover:bg-white/30 disabled:opacity-50 disabled:cursor-not-allowed rounded-full text-white transition-all duration-200"
            >
              <SkipForward className="w-6 h-6" />
            </button>
          </div>
          
          <div className="mt-6">
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
      </div>
    </div>
  );
};

export default ComicViewer;