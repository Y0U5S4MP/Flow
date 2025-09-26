import React, { useState, useRef } from 'react';
import { Upload, Image, Film, FileText, X, Plus, Grid } from 'lucide-react';
import { Panel, ComicElement } from '../types/Comic';
import { v4 as uuidv4 } from 'uuid';

interface MultiPanelUploadProps {
  onPanelsUploaded: (panels: Panel[]) => void;
}

const MultiPanelUpload: React.FC<MultiPanelUploadProps> = ({ onPanelsUploaded }) => {
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleMultipleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setUploadedFiles(files);
  };

  const processFiles = async () => {
    if (uploadedFiles.length === 0) return;

    setIsProcessing(true);
    const panels: Panel[] = [];

    for (let i = 0; i < uploadedFiles.length; i++) {
      const file = uploadedFiles[i];
      const url = await fileToDataURL(file);
      
      const element: ComicElement = {
        id: uuidv4(),
        type: getFileType(file),
        x: 50,
        y: 50,
        width: 400,
        height: 300,
        imageUrl: getFileType(file) === 'image' ? url : undefined,
        gifUrl: getFileType(file) === 'gif' ? url : undefined,
        videoUrl: getFileType(file) === 'video' ? url : undefined,
        autoplay: getFileType(file) === 'video' ? true : undefined,
        loop: true,
        volume: getFileType(file) === 'video' ? 0.5 : undefined
      };

      const panel: Panel = {
        id: uuidv4(),
        elements: [element],
        animations: [],
        transitions: []
      };

      panels.push(panel);
    }

    onPanelsUploaded(panels);
    setUploadedFiles([]);
    setIsProcessing(false);
  };

  const fileToDataURL = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.readAsDataURL(file);
    });
  };

  const getFileType = (file: File): 'image' | 'gif' | 'video' => {
    if (file.type.startsWith('video/')) return 'video';
    if (file.name.toLowerCase().endsWith('.gif')) return 'gif';
    return 'image';
  };

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-purple-100">
      <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center space-x-2">
        <Grid className="w-5 h-5" />
        <span>Subida Múltiple de Paneles</span>
      </h3>

      <div className="space-y-4">
        <div
          className="border-2 border-dashed border-purple-300 rounded-lg p-8 text-center hover:border-purple-400 hover:bg-purple-50 transition-all cursor-pointer"
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="w-12 h-12 text-purple-600 mx-auto mb-4" />
          <p className="text-lg font-medium text-purple-600 mb-2">
            Selecciona múltiples archivos
          </p>
          <p className="text-sm text-gray-600">
            Imágenes, GIFs y videos MP4. Cada archivo será un panel separado.
          </p>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,.gif,video/mp4"
            onChange={handleMultipleFileUpload}
            className="hidden"
          />
        </div>

        {uploadedFiles.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-semibold text-gray-800">
              Archivos seleccionados ({uploadedFiles.length})
            </h4>
            <div className="grid grid-cols-2 gap-3 max-h-48 overflow-y-auto">
              {uploadedFiles.map((file, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      {getFileType(file) === 'image' && <Image className="w-4 h-4 text-blue-600" />}
                      {getFileType(file) === 'gif' && <Upload className="w-4 h-4 text-blue-600" />}
                      {getFileType(file) === 'video' && <Film className="w-4 h-4 text-blue-600" />}
                    </div>
                    <span className="text-sm text-gray-700 truncate max-w-32">
                      {file.name}
                    </span>
                  </div>
                  <button
                    onClick={() => removeFile(index)}
                    className="p-1 text-red-500 hover:bg-red-50 rounded"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            <button
              onClick={processFiles}
              disabled={isProcessing}
              className="w-full bg-gradient-to-r from-green-600 to-blue-600 text-white py-3 rounded-xl font-semibold hover:from-green-700 hover:to-blue-700 transition-all duration-200 disabled:opacity-50 flex items-center justify-center space-x-2"
            >
              {isProcessing ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Plus className="w-5 h-5" />
                  <span>Crear {uploadedFiles.length} Panel{uploadedFiles.length !== 1 ? 'es' : ''}</span>
                </>
              )}
            </button>
          </div>
        )}

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-blue-800 text-sm">
            <strong>💡 Consejo:</strong> Selecciona múltiples archivos para crear varios paneles de una vez. 
            Cada archivo se convertirá en un panel separado que podrás editar individualmente.
          </p>
        </div>
      </div>
    </div>
  );
};

export default MultiPanelUpload;