/**
 * Client-side image compression and validation utilities.
 */

const MAX_SIZE_BYTES = 4 * 1024 * 1024; // 4MB
const MAX_DIMENSION = 1568; // Claude's recommended max
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

export interface ProcessedImage {
  base64: string;
  mediaType: 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif';
  width: number;
  height: number;
  sizeBytes: number;
}

export function isValidImageType(file: File): boolean {
  return ACCEPTED_TYPES.includes(file.type);
}

/**
 * Process an image file: validate, resize, compress, and return base64.
 */
export async function processImage(file: File): Promise<ProcessedImage> {
  if (!isValidImageType(file)) {
    throw new Error('Unsupported image type. Please use JPEG, PNG, WebP, or GIF.');
  }

  // Load image
  const bitmap = await createImageBitmap(file);
  let { width, height } = bitmap;

  // Calculate resize dimensions if needed
  if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
    const scale = MAX_DIMENSION / Math.max(width, height);
    width = Math.round(width * scale);
    height = Math.round(height * scale);
  }

  // Draw to canvas for resize/compression
  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not create canvas context');
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  // Convert to blob (JPEG for compression, or keep original type for PNG/WebP)
  const outputType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
  const quality = outputType === 'image/jpeg' ? 0.85 : undefined;
  const blob = await canvas.convertToBlob({ type: outputType, quality });

  if (blob.size > MAX_SIZE_BYTES) {
    // Try more aggressive compression
    const smallerBlob = await canvas.convertToBlob({ type: 'image/jpeg', quality: 0.6 });
    if (smallerBlob.size > MAX_SIZE_BYTES) {
      throw new Error('Image is too large even after compression. Please use a smaller image.');
    }
    return await blobToProcessedImage(smallerBlob, width, height, 'image/jpeg');
  }

  return await blobToProcessedImage(blob, width, height, outputType as ProcessedImage['mediaType']);
}

async function blobToProcessedImage(
  blob: Blob,
  width: number,
  height: number,
  mediaType: ProcessedImage['mediaType']
): Promise<ProcessedImage> {
  const buffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64 = btoa(binary);

  return {
    base64,
    mediaType,
    width,
    height,
    sizeBytes: blob.size,
  };
}

/**
 * Create an object URL for preview from a File.
 */
export function createPreviewUrl(file: File): string {
  return URL.createObjectURL(file);
}
