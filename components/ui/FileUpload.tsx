'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, X } from 'lucide-react';
import IconButton from './IconButton';
import Alert from './Alert';

interface FileUploadProps {
  files: File[];
  onChange: (files: File[]) => void;
  maxFiles?: number;
  maxSizeMB?: number;
  accept?: string;
  label?: string;
  error?: string;
}

export default function FileUpload({
  files,
  onChange,
  maxFiles = 3,
  maxSizeMB = 5,
  accept = 'image/*',
  label,
  error,
}: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const previewUrls = useRef<Map<File, string>>(new Map());

  useEffect(() => {
    return () => {
      previewUrls.current.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  const getPreviewUrl = (file: File) => {
    if (!previewUrls.current.has(file)) {
      previewUrls.current.set(file, URL.createObjectURL(file));
    }
    return previewUrls.current.get(file)!;
  };

  const addFiles = useCallback(
    (newFiles: FileList | File[]) => {
      setValidationError(null);
      const incoming = Array.from(newFiles);

      const oversized = incoming.filter((f) => f.size > maxSizeMB * 1024 * 1024);
      if (oversized.length) {
        setValidationError(
          `${oversized.map((f) => f.name).join(', ')} exceed${oversized.length === 1 ? 's' : ''} ${maxSizeMB}MB limit`
        );
        return;
      }

      const total = files.length + incoming.length;
      if (total > maxFiles) {
        setValidationError(`Maximum ${maxFiles} files allowed`);
        return;
      }

      onChange([...files, ...incoming]);
    },
    [files, onChange, maxFiles, maxSizeMB]
  );

  const removeFile = useCallback(
    (index: number) => {
      const file = files[index];
      const url = previewUrls.current.get(file);
      if (url) {
        URL.revokeObjectURL(url);
        previewUrls.current.delete(file);
      }
      onChange(files.filter((_, i) => i !== index));
    },
    [files, onChange]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
    },
    [addFiles]
  );

  const atLimit = files.length >= maxFiles;
  const displayError = error || validationError;

  return (
    <div>
      {label && (
        <label className="block text-sm font-semibold text-foreground mb-2">
          {label}{' '}
          <span className="font-normal text-earth-brown-light">
            (optional, max {maxFiles})
          </span>
        </label>
      )}

      <div
        role="button"
        tabIndex={0}
        onClick={() => !atLimit && inputRef.current?.click()}
        onKeyDown={(e) => {
          if ((e.key === 'Enter' || e.key === ' ') && !atLimit) inputRef.current?.click();
        }}
        onDragOver={(e) => {
          e.preventDefault();
          if (!atLimit) setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={`
          border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors
          ${dragOver ? 'border-terracotta bg-terracotta/5' : 'border-earth-sand bg-white'}
          ${atLimit ? 'opacity-50 cursor-not-allowed' : 'hover:border-terracotta/50'}
        `}
      >
        <Camera className="w-7 h-7 text-earth-brown-light mx-auto mb-1" />
        <p className="text-sm font-medium text-foreground">
          {atLimit ? `${maxFiles} files uploaded` : 'Click to upload or drag photos here'}
        </p>
        <p className="text-xs text-earth-brown-light mt-1">
          JPG, PNG up to {maxSizeMB}MB each
        </p>
      </div>

      <input
        ref={inputRef}
        type="file"
        multiple
        accept={accept}
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.length) addFiles(e.target.files);
          e.target.value = '';
        }}
      />

      {files.length > 0 && (
        <div className="flex gap-2 mt-3 flex-wrap">
          {files.map((file, i) => (
            <div
              key={`${file.name}-${i}`}
              className="relative w-20 h-20 rounded-lg border border-earth-sand overflow-hidden"
            >
              <img
                src={getPreviewUrl(file)}
                alt={file.name}
                className="w-full h-full object-cover"
              />
              <div className="absolute top-0.5 right-0.5">
                <IconButton
                  icon={X}
                  iconSize={14}
                  label={`Remove ${file.name}`}
                  variant="danger"
                  onClick={() => removeFile(i)}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {displayError && (
        <div className="mt-2">
          <Alert variant="error">{displayError}</Alert>
        </div>
      )}
    </div>
  );
}
