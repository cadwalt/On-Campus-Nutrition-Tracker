import React, { useState, useCallback, useRef } from 'react';
import Cropper from 'react-easy-crop';
import type { Area } from 'react-easy-crop';

interface ImageCropperProps {
  imageSrc: string; // source URL (object URL or data URL)
  aspect?: number; // aspect ratio, e.g. 1 for square
  onCancel: () => void;
  onComplete: (croppedBase64: string) => void;
}

const createImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.addEventListener('load', () => resolve(img));
    img.addEventListener('error', (err) => reject(err));
    img.setAttribute('crossOrigin', 'anonymous');
    img.src = url;
  });

async function getCroppedImg(imageSrc: string, pixelCrop: Area): Promise<string> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get canvas context');

  // set proper canvas size for the crop area
  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;

  // draw the image portion onto the canvas
  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  );

  return canvas.toDataURL('image/jpeg', 0.92);
}

const ImageCropper: React.FC<ImageCropperProps> = ({ imageSrc, aspect = 1, onCancel, onComplete }) => {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const inputRef = useRef<HTMLDivElement | null>(null);

  const onCropComplete = useCallback((_: Area, croppedAreaPixelsParam: Area) => {
    setCroppedAreaPixels(croppedAreaPixelsParam);
  }, []);

  const handleConfirm = useCallback(async () => {
    try {
      if (!croppedAreaPixels) return;
      const base64 = await getCroppedImg(imageSrc, croppedAreaPixels);
      onComplete(base64);
    } catch (err) {
      console.error('Crop failed', err);
      onCancel();
    }
  }, [croppedAreaPixels, imageSrc, onComplete, onCancel]);

  return (
    <div className="cropper-modal">
      <div className="cropper-content" ref={inputRef} style={{ width: '100%', maxWidth: 800, height: 480, position: 'relative', background: '#111' }}>
        <Cropper
          image={imageSrc}
          crop={crop}
          zoom={zoom}
          aspect={aspect}
          onCropChange={setCrop}
          onZoomChange={setZoom}
          onCropComplete={onCropComplete}
        />
      </div>

      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 12 }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          Zoom
          <input
            type="range"
            min={1}
            max={3}
            step={0.01}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
          />
        </label>

        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <button className="cancel-button" onClick={onCancel}>Cancel</button>
          <button className="save-button" onClick={handleConfirm}>Crop & Save</button>
        </div>
      </div>

      <style>{`
        .cropper-modal { position: fixed; left: 0; right: 0; top: 0; bottom: 0; display:flex; align-items:center; justify-content:center; background: rgba(0,0,0,0.6); padding: 24px; z-index: 2000; }
        .cropper-content { background: #111; border-radius: 8px; overflow: hidden; }
        .save-button { padding: 0.5rem 0.75rem; background: rgba(34,197,94,0.9); color: white; border-radius:6px; border: none; }
        .cancel-button { padding: 0.5rem 0.75rem; background: rgba(255,255,255,0.04); color: white; border-radius:6px; border: 1px solid rgba(255,255,255,0.06); }
      `}</style>
    </div>
  );
};

export default ImageCropper;
