/**
 * Utility for compressing and converting images to WebP format
 */

/**
 * Compresses an image using canvas
 */
export const compressImage = (img: Blob, quality: number): Promise<Blob> =>
  new Promise<Blob>((resolve, reject) => {
    if (!img) return reject(new Error("No image provided"));

    const imgEl = document.createElement('img');
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    const blobURL = URL.createObjectURL(img);
    imgEl.src = blobURL;

    imgEl.onload = () => {
      // Release the object URL
      URL.revokeObjectURL(blobURL);
      
      // Resize to 128x128 for avatars (increased from 64x64)
      canvas.width = 128;
      canvas.height = 128;
      
      if (ctx) {
        // Draw the image with proper scaling
        ctx.drawImage(imgEl, 0, 0, imgEl.width, imgEl.height, 0, 0, 128, 128);
        
        // Convert to WebP if supported
        if (canvas.toBlob) {
          canvas.toBlob(
            blob => (blob ? resolve(blob) : reject(new Error("Failed to create blob"))), 
            'image/webp', 
            quality
          );
        } else {
          // Fallback to PNG if WebP not supported
          canvas.toBlob(
            blob => (blob ? resolve(blob) : reject(new Error("Failed to create blob"))), 
            'image/png', 
            quality
          );
        }
      } else {
        reject(new Error("Could not get canvas context"));
      }
    };

    imgEl.onerror = error => reject(error);
  });

export interface CompressionLoopArgs {
  img: Blob;
  maxSize: number;
  quality?: number;
  descentIndex?: number;
  onProgress?: (args: { progress: number; quality: number; img: Blob }) => boolean | undefined;
  maxIterations?: number;
  timeout?: number; // In seconds
}

export type CompressionLoopResult = {
  status:
    | 'success'
    | 'already-compressed'
    | 'max-compression-reached'
    | 'compression-error'
    | 'stopped'
    | 'time-out'
    | 'max-iterations-exceeded';
  compressedImg?: Blob;
}

/**
 * Compresses an image iteratively until it reaches the target size or quality threshold
 */
export const compressImageToSize = (args: CompressionLoopArgs): Promise<CompressionLoopResult> => {
  const { 
    img, 
    maxSize, 
    quality = 1, 
    descentIndex = 0.1, 
    onProgress = () => undefined,
    maxIterations = Number.MAX_SAFE_INTEGER,
    timeout = Number.MAX_SAFE_INTEGER / 1000
  } = args;
  
  return new Promise<CompressionLoopResult>(resolve => {
    let iterations = 0;
    let lastSize = 0;
    let currentQuality = quality;
    const timeoutMs = timeout * 1000;
    const startTime = Date.now();

    const runCompression = async () => {
      try {
        let result: Blob;
        
        do {
          // Decrement quality
          currentQuality = currentQuality - descentIndex * currentQuality;

          try {
            result = await compressImage(img, currentQuality);
          } catch (error) {
            resolve({ status: 'compression-error' });
            return;
          }

          if (onProgress) {
            const progress = Number.parseFloat(
              Math.min(100 - (Math.abs(maxSize - result.size) / Math.abs(maxSize - img.size)) * 100, 100).toFixed(2)
            );

            const stopped = onProgress({ 
              progress, 
              quality: Number.parseFloat(currentQuality.toFixed(10)), 
              img: result 
            });

            // If stopped
            if (stopped) {
              resolve({ status: 'stopped' });
              return;
            }
          }

          // Already compressed
          if (result.size >= img.size) {
            resolve({
              status: result.size > maxSize ? 'already-compressed' : 'success',
              compressedImg: img // As source image is smaller than the result image
            });
            return;
          }

          if (result.size > maxSize) {
            // If no improvement
            if (result.size === lastSize) {
              resolve({ status: 'max-compression-reached' });
              return;
            }
            lastSize = result.size;

            // Check max iteration
            if (maxIterations <= ++iterations) {
              resolve({ status: 'max-iterations-exceeded' });
              return;
            }

            // Check timeout
            if (Date.now() - startTime > timeoutMs) {
              resolve({ status: 'time-out' });
              return;
            }
          } else {
            resolve({ status: 'success', compressedImg: result });
            return;
          }
        } while (img.size > result.size);
      } catch (error) {
        resolve({ status: 'compression-error' });
      }
    };

    runCompression();
  });
};

/**
 * Converts an image to a WebP data URL with compression
 */
export const imageToWebpDataUrl = async (file: File | Blob): Promise<string> => {
  try {
    // Target size: 10KB (10 * 1024 bytes)
    const result = await compressImageToSize({
      img: file,
      maxSize: 10 * 1024,
      quality: 0.9,
      maxIterations: 10
    });
    
    if (result.status === 'success' && result.compressedImg) {
      return blobToDataUrl(result.compressedImg);
    }
    
    // If compression failed, just convert the original file to data URL
    return blobToDataUrl(file);
  } catch (error) {
    console.error("Error converting image to WebP:", error);
    throw error;
  }
};

/**
 * Converts a Blob to a data URL
 */
export const blobToDataUrl = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};
