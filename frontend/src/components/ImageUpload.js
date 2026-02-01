import { useState, useRef } from 'react';
import { uploadAPI } from '../lib/api';
import { Button } from './ui/button';
import { X, Upload, Image, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export const ImageUpload = ({ images, onChange, maxImages = 5 }) => {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // Check max images
    const remainingSlots = maxImages - images.length;
    if (remainingSlots <= 0) {
      toast.error(`Maximum ${maxImages} images allowed`);
      return;
    }

    const filesToUpload = files.slice(0, remainingSlots);
    setUploading(true);

    try {
      const uploadPromises = filesToUpload.map(async (file) => {
        // Validate file type
        if (!file.type.startsWith('image/')) {
          throw new Error(`${file.name} is not an image`);
        }

        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
          throw new Error(`${file.name} is too large (max 5MB)`);
        }

        const response = await uploadAPI.uploadFile(file);
        return `${API_URL}${response.data.url}`;
      });

      const uploadedUrls = await Promise.all(uploadPromises);
      onChange([...images, ...uploadedUrls]);
      toast.success(`${uploadedUrls.length} image(s) uploaded`);
    } catch (error) {
      const message = error.response?.data?.detail || error.message || 'Upload failed';
      toast.error(message);
    } finally {
      setUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const removeImage = (index) => {
    const newImages = images.filter((_, i) => i !== index);
    onChange(newImages);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      // Create a fake event to reuse handleFileSelect
      const fakeEvent = { target: { files } };
      await handleFileSelect(fakeEvent);
    }
  };

  return (
    <div className="space-y-3">
      {/* Image Preview Grid */}
      <div className="flex flex-wrap gap-3">
        {images.map((url, index) => (
          <div
            key={index}
            className="relative w-24 h-24 rounded-xl overflow-hidden border border-slate-200 group"
          >
            <img
              src={url}
              alt={`Upload ${index + 1}`}
              className="w-full h-full object-cover"
            />
            <button
              type="button"
              onClick={() => removeImage(index)}
              className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              data-testid={`remove-image-${index}`}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}

        {/* Upload Button */}
        {images.length < maxImages && (
          <div
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            className="w-24 h-24 rounded-xl border-2 border-dashed border-slate-300 flex flex-col items-center justify-center cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-colors"
            onClick={() => fileInputRef.current?.click()}
            data-testid="upload-image-btn"
          >
            {uploading ? (
              <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
            ) : (
              <>
                <Image className="w-6 h-6 text-slate-400" />
                <span className="text-xs text-slate-400 mt-1">Add</span>
              </>
            )}
          </div>
        )}
      </div>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileSelect}
        className="hidden"
        data-testid="file-input"
      />

      {/* Help Text */}
      <p className="text-xs text-slate-500">
        {images.length}/{maxImages} images • Max 5MB each • Drag & drop or click to upload
      </p>
    </div>
  );
};

export default ImageUpload;
