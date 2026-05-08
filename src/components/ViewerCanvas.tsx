import React, { useRef, useEffect } from 'react';
import { Panel, ComicElement } from '../types/Comic';

interface ViewerCanvasProps {
  panel: Panel;
  isPlaying: boolean;
}

const ViewerCanvas: React.FC<ViewerCanvasProps> = ({ panel, isPlaying }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Set canvas background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw elements with animations if playing
    panel.elements.forEach((element, index) => {
      if (isPlaying && panel.animations && panel.animations[index]) {
        drawAnimatedElement(ctx, element, panel.animations[index]);
      } else {
        drawElement(ctx, element);
      }
    });
  }, [panel, isPlaying]);

  const drawElement = (ctx: CanvasRenderingContext2D, element: ComicElement) => {
    ctx.save();
    
    switch (element.type) {
      case 'text':
        ctx.font = `${element.fontSize || 16}px Arial`;
        ctx.fillStyle = element.color || '#000000';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText(element.content || '', element.x, element.y);
        break;
        
      case 'brush':
        if (element.path && element.path.length > 0) {
          ctx.strokeStyle = element.color || '#000000';
          ctx.lineWidth = element.strokeWidth || 2;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          
          ctx.beginPath();
          ctx.moveTo(element.path[0].x, element.path[0].y);
          element.path.forEach(point => {
            ctx.lineTo(point.x, point.y);
          });
          ctx.stroke();
        }
        break;
        
      case 'shape':
        ctx.fillStyle = element.color || '#000000';
        if (element.shape === 'rectangle') {
          ctx.fillRect(element.x, element.y, element.width || 50, element.height || 50);
        } else if (element.shape === 'circle') {
          ctx.beginPath();
          ctx.arc(element.x + (element.width || 50) / 2, element.y + (element.height || 50) / 2, (element.width || 50) / 2, 0, 2 * Math.PI);
          ctx.fill();
        }
        break;

      case 'gif':
        if (element.gifUrl) {
          const img = new Image();
          img.onload = () => {
            ctx.drawImage(img, element.x, element.y, element.width || 200, element.height || 150);
          };
          img.src = element.gifUrl;
        }
        break;

      case 'video':
        if (element.videoUrl) {
          // For viewer, we'll show a placeholder or first frame
          const video = document.createElement('video');
          video.src = element.videoUrl;
          video.currentTime = 0;
          video.onloadeddata = () => {
            ctx.drawImage(video, element.x, element.y, element.width || 300, element.height || 200);
          };
        }
        break;
    }
    
    ctx.restore();
  };

  const drawAnimatedElement = (ctx: CanvasRenderingContext2D, element: ComicElement, animation: any) => {
    // Apply animation transformations
    ctx.save();
    
    if (animation.type === 'fadeIn') {
      ctx.globalAlpha = 0.7; // Simplified animation
    } else if (animation.type === 'slideIn') {
      ctx.translate(10, 0); // Simplified slide effect
    }
    
    drawElement(ctx, element);
    ctx.restore();
  };

  return (
    <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
      <canvas
        ref={canvasRef}
        width={800}
        height={600}
        className="block"
      />
    </div>
  );
};

export default ViewerCanvas;