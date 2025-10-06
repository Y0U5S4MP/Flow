import React, { useState, useRef } from 'react';
import { Upload, Grid2x2 as Grid } from 'lucide-react';
import { Panel, ComicElement } from '../types/Comic';
import { v4 as uuidv4 } from 'uuid';

interface MultiPanelUploadProps {
  onPanelsUploaded: (panels: Panel[]) => void;
}

const MultiPanelUpload: React.FC<MultiPanelUploadProps> = ({ onPanelsUploaded }) => {
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleMultipleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setIsProcessing(true);
    const panels: Panel[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const url = await fileToDataURL(file);

      const element: ComicElement = {
        id: uuidv4(),
        type: getFileType(file),
        x: 0,
        y: 0,
        width: 1600,
        height: 900,
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
    setIsProcessing(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
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


  return (
    <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-purple-100">
      <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center space-x-2">
        <Grid className="w-5 h-5" />
        <span>Subir Paneles</span>
      </h3>

      <div className="space-y-4">
        <div
          className="border-2 border-dashed border-purple-300 rounded-lg p-8 text-center hover:border-purple-400 hover:bg-purple-50 transition-all cursor-pointer relative"
          onClick={() => fileInputRef.current?.click()}
        >
          {isProcessing ? (
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mb-4" />
              <p className="text-lg font-medium text-purple-600">Subiendo paneles...</p>
            </div>
          ) : (
            <>
              <Upload className="w-12 h-12 text-purple-600 mx-auto mb-4" />
              <p className="text-lg font-medium text-purple-600 mb-2">
                Selecciona múltiples archivos
              </p>
              <p className="text-sm text-gray-600">
                Imágenes, GIFs y videos MP4. Los paneles se crearán automáticamente.
              </p>
            </>
          )}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,.gif,video/mp4"
            onChange={handleMultipleFileUpload}
            className="hidden"
            disabled={isProcessing}
          />
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-blue-800 text-sm">
            <strong>💡 Consejo:</strong> Selecciona múltiples archivos para crear paneles automáticamente.
            Las imágenes ocuparán toda la página y podrás editarlas después.
          </p>
        </div>
      </div>
    </div>
  );
};

export default MultiPanelUpload;