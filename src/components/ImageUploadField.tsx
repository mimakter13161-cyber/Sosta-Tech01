import React, { useState } from 'react';
import { ProductImage } from '../types';

interface ImageUploadFieldProps {
  label: string;
  images: ProductImage[];
  onChange: (images: ProductImage[]) => void;
  multiple?: boolean;
  showPrimary?: boolean;
  primaryIndex?: number;
  onPrimaryChange?: (index: number) => void;
  onProcessingChange?: (isProcessing: boolean) => void;
  helperText?: string;
}

const ACCEPTED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']);
const ACCEPTED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.svg'];

const readFileAsDataUrl = (file: File) => new Promise<string>((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(String(reader.result));
  reader.onerror = () => reject(new Error(`Could not read ${file.name}.`));
  reader.readAsDataURL(file);
});

const optimizeImage = async (file: File): Promise<ProductImage> => {
  const source = await readFileAsDataUrl(file);
  let src = source;

  if (file.type !== 'image/svg+xml') {
    const image = new Image();
    image.src = source;
    await image.decode();
    const scale = Math.min(1, 1600 / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext('2d');
    if (context) {
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      const optimized = canvas.toDataURL('image/webp', 0.84);
      if (optimized.startsWith('data:image/webp')) src = optimized;
    }
  }

  return { src, label: file.name, alt: file.name };
};

const isSupportedImage = (file: File) => {
  const extension = `.${file.name.split('.').pop()?.toLowerCase() || ''}`;
  return ACCEPTED_TYPES.has(file.type) || ACCEPTED_EXTENSIONS.includes(extension);
};

export const ImageUploadField: React.FC<ImageUploadFieldProps> = ({
  label,
  images,
  onChange,
  multiple = false,
  showPrimary = false,
  primaryIndex = 0,
  onPrimaryChange,
  onProcessingChange,
  helperText,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isReading, setIsReading] = useState(false);
  const [error, setError] = useState('');

  const addFiles = async (fileList: FileList | File[]) => {
    const files = Array.from(fileList);
    const supportedFiles = files.filter(isSupportedImage);
    if (supportedFiles.length !== files.length) {
      setError('Choose JPG, PNG, WEBP, or SVG files.');
    } else {
      setError('');
    }
    if (supportedFiles.length === 0) return;

    setIsReading(true);
    onProcessingChange?.(true);
    try {
      const converted = await Promise.all(supportedFiles.map(optimizeImage));
      onChange(multiple ? [...images, ...converted] : converted.slice(0, 1));
    } catch {
      setError('One or more images could not be read. Try another file.');
    } finally {
      setIsReading(false);
      onProcessingChange?.(false);
    }
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    void addFiles(event.dataTransfer.files);
  };

  const removeImage = (index: number) => {
    onChange(images.filter((_, imageIndex) => imageIndex !== index));
    if (showPrimary && primaryIndex >= index) {
      onPrimaryChange?.(primaryIndex === index ? Math.max(0, index - 1) : primaryIndex - 1);
    }
  };

  return (
    <div className="space-y-2">
      <div>
        <p className="text-[13px] font-semibold text-[#0b1c30]">{label}</p>
        {helperText && <p className="text-[11px] text-[#434655] mt-0.5">{helperText}</p>}
      </div>
      <div
        onDragOver={(event) => { event.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`rounded-lg border-2 border-dashed p-4 transition-colors ${isDragging ? 'border-[#004ac6] bg-[#e5eeff]' : 'border-[#c3c6d7] bg-[#f8f9ff]'}`}
      >
        <label className="flex cursor-pointer flex-col items-center gap-1 text-center">
          <span className="material-symbols-outlined text-[22px] text-[#004ac6]">upload_file</span>
          <span className="text-[12px] font-semibold text-[#0b1c30]">Choose {multiple ? 'images' : 'an image'} or drop {multiple ? 'them' : 'it'} here</span>
          <span className="text-[11px] text-[#434655]">JPG, PNG, WEBP, SVG</span>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/svg+xml,.jpg,.jpeg,.png,.webp,.svg"
            multiple={multiple}
            onChange={(event) => {
              if (event.currentTarget.files) void addFiles(event.currentTarget.files);
              event.currentTarget.value = '';
            }}
            className="sr-only"
          />
        </label>
        {isReading && <p className="mt-2 text-center text-[11px] text-[#004ac6]">Preparing image previews...</p>}
      </div>
      {error && <p role="alert" className="text-[11px] text-[#ba1a1a]">{error}</p>}
      {images.length > 0 && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {images.map((image, index) => (
            <div key={`${image.src.slice(0, 48)}-${index}`} className={`relative min-w-0 rounded-lg border p-2 ${showPrimary && primaryIndex === index ? 'border-[#004ac6] bg-[#e5eeff]' : 'border-[#e2e8f0] bg-white'}`}>
              {showPrimary && primaryIndex === index && (
                <span className="absolute left-3 top-3 z-10 rounded bg-[#004ac6] px-2 py-1 text-[10px] font-bold text-white shadow-sm">Cover / Main Profile Photo</span>
              )}
              <img src={image.src} alt={image.alt} className="h-20 w-full rounded bg-[#f8f9ff] object-contain" />
              <div className="mt-1 flex items-center gap-1">
                {showPrimary && (
                  <button type="button" aria-pressed={primaryIndex === index} onClick={() => onPrimaryChange?.(index)} className={`min-w-0 flex-1 truncate rounded px-2 py-1 text-[10px] font-semibold ${primaryIndex === index ? 'bg-[#004ac6] text-white' : 'bg-[#eff4ff] text-[#0b1c30] hover:bg-[#e5eeff]'}`}>
                    {primaryIndex === index ? 'Cover Selected' : 'Set as Cover'}
                  </button>
                )}
                {!showPrimary && <span className="min-w-0 flex-1 truncate text-[10px] text-[#0b1c30]">{image.label}</span>}
                <button type="button" aria-label={`Remove ${image.label}`} onClick={() => removeImage(index)} className="shrink-0 px-1 text-[16px] leading-none text-[#ba1a1a]">×</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
