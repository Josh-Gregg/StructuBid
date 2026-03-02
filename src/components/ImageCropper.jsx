import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

export default function ImageCropper({ open, onOpenChange, imageSrc, onCropComplete }) {
  const canvasRef = useRef(null);
  const imageRef = useRef(null);
  const [scale, setScale] = useState(1);
  const [minScale, setMinScale] = useState(0.1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (imageSrc && open) {
      const img = new Image();
      img.onload = () => {
        imageRef.current = img;
        const canvas = canvasRef.current;
        if (canvas) {
          // Calculate initial scale to cover the 16:9 area completely
          const scaleX = canvas.width / img.width;
          const scaleY = canvas.height / img.height;
          const initialScale = Math.max(scaleX, scaleY);
          setMinScale(initialScale * 0.5);
          setScale(initialScale);
          setOffset({ x: 0, y: 0 });
          draw();
        }
      };
      img.src = imageSrc;
    }
  }, [imageSrc, open]);

  const draw = () => {
    const canvas = canvasRef.current;
    const img = imageRef.current;
    if (!canvas || !img) return;

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw background
    ctx.fillStyle = '#f3f4f6';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    const w = img.width * scale;
    const h = img.height * scale;
    const x = (canvas.width - w) / 2 + offset.x;
    const y = (canvas.height - h) / 2 + offset.y;
    
    ctx.drawImage(img, x, y, w, h);
  };

  useEffect(() => {
    draw();
  }, [scale, offset]);

  const handlePointerDown = (e) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
    e.target.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e) => {
    if (!isDragging) return;
    setOffset({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handlePointerUp = (e) => {
    setIsDragging(false);
    e.target.releasePointerCapture(e.pointerId);
  };

  const handleComplete = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], 'cropped-cover.jpg', { type: 'image/jpeg' });
        onCropComplete(file);
        onOpenChange(false);
      }
    }, 'image/jpeg', 0.9);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl w-full">
        <DialogHeader>
          <DialogTitle>Adjust Cover Photo</DialogTitle>
        </DialogHeader>
        
        <div className="flex flex-col items-center gap-6 py-4">
          <p className="text-sm text-gray-500">Drag the image to position it. Use the slider below to zoom.</p>
          
          <div className="w-full overflow-hidden border border-gray-200 rounded-xl shadow-sm bg-gray-50 flex justify-center">
            <canvas 
              ref={canvasRef} 
              width={800} 
              height={450} 
              className="max-w-full h-auto cursor-move touch-none"
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              onPointerLeave={handlePointerUp}
            />
          </div>

          <div className="w-full max-w-md flex items-center gap-4 px-4">
            <span className="text-sm font-bold text-gray-600">Zoom</span>
            <input 
              type="range" 
              min={minScale} 
              max={minScale * 5} 
              step={(minScale * 5 - minScale) / 100} 
              value={scale} 
              onChange={(e) => setScale(parseFloat(e.target.value))}
              className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleComplete} className="bg-blue-600 hover:bg-blue-700 text-white">Save Crop</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}