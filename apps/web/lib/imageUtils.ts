/**
 * Image utility functions for loading and validating images
 */

/**
 * Valid image MIME types supported by HTML5 Image API
 */
const VALID_IMAGE_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/bmp",
  "image/svg+xml",
];

/**
 * Valid image file extensions (case-insensitive)
 */
const VALID_IMAGE_EXTENSIONS = [
  ".jpg",
  ".jpeg",
  ".png",
  ".gif",
  ".webp",
  ".bmp",
  ".svg",
];

/**
 * Check if a file is a valid image type
 * @param file - File object to validate
 * @returns true if file is a valid image type, false otherwise
 */
export function isValidImageFile(file: File): boolean {
  // Check MIME type first (primary validation)
  if (VALID_IMAGE_TYPES.includes(file.type.toLowerCase())) {
    return true;
  }

  // Fallback: check file extension if MIME type is not available or not recognized
  const fileName = file.name.toLowerCase();
  return VALID_IMAGE_EXTENSIONS.some((ext) => fileName.endsWith(ext));
}

/**
 * Create an object URL from a File object for efficient image loading
 * @param file - File object to create URL from
 * @returns Object URL string
 */
export function createImageUrl(file: File): string {
  return URL.createObjectURL(file);
}

/**
 * Revoke an object URL to free up memory
 * @param url - Object URL to revoke
 */
export function revokeImageUrl(url: string): void {
  URL.revokeObjectURL(url);
}

/**
 * Load an image from a URL string and return a Promise that resolves with the loaded Image
 * @param imageUrl - URL string to load image from
 * @returns Promise that resolves with HTMLImageElement
 */
export function loadImageFromUrl(imageUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";

    img.onload = () => {
      resolve(img);
    };

    img.onerror = () => {
      reject(new Error("Failed to load image"));
    };

    img.src = imageUrl;
  });
}

/**
 * Load an image from a File object and return a Promise that resolves with the loaded Image
 * @param file - File object to load
 * @returns Promise that resolves with HTMLImageElement
 */
export function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    if (!isValidImageFile(file)) {
      reject(new Error("Invalid file type"));
      return;
    }

    const imageUrl = createImageUrl(file);
    const img = new Image();

    img.onload = () => {
      resolve(img);
    };

    img.onerror = () => {
      revokeImageUrl(imageUrl);
      reject(new Error("Failed to load image"));
    };

    img.src = imageUrl;
  });
}

/**
 * Generate a timestamp-based filename for exported images
 * Format: frametv-mat-{timestamp}.jpg
 * @returns Filename string
 */
export function generateExportFilename(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  const seconds = String(now.getSeconds()).padStart(2, "0");
  const timestamp = `${year}${month}${day}-${hours}${minutes}${seconds}`;
  return `frametv-mat-${timestamp}.jpg`;
}

/**
 * Download a data URL as a file
 * @param dataUrl - Data URL string (e.g., from canvas.toDataURL())
 * @param filename - Filename for the downloaded file
 */
export function downloadDataUrl(dataUrl: string, filename: string): void {
  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Create a lower resolution version of an image for preview performance
 * @param imageUrl - Original image URL (object URL or data URL)
 * @param maxWidth - Maximum width for preview (default: 1920)
 * @param maxHeight - Maximum height for preview (default: 1080)
 * @returns Promise that resolves with a new HTMLImageElement at preview resolution
 */
export function createPreviewImage(
  imageUrl: string,
  maxWidth: number = 1920,
  maxHeight: number = 1080
): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";

    img.onload = () => {
      // If image is already smaller than max dimensions, return as-is
      if (img.width <= maxWidth && img.height <= maxHeight) {
        resolve(img);
        return;
      }

      // Calculate scaling factor to fit within max dimensions while maintaining aspect ratio
      const scaleX = maxWidth / img.width;
      const scaleY = maxHeight / img.height;
      const scale = Math.min(scaleX, scaleY);

      const previewWidth = Math.floor(img.width * scale);
      const previewHeight = Math.floor(img.height * scale);

      // Create canvas to downscale image
      const canvas = document.createElement("canvas");
      canvas.width = previewWidth;
      canvas.height = previewHeight;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Failed to get canvas context"));
        return;
      }

      // Draw image at preview resolution
      ctx.drawImage(img, 0, 0, previewWidth, previewHeight);

      // Create new image from canvas
      const previewImg = new Image();
      previewImg.onload = () => {
        resolve(previewImg);
      };
      previewImg.onerror = () => {
        reject(new Error("Failed to create preview image"));
      };
      previewImg.src = canvas.toDataURL("image/jpeg", 0.9);
    };

    img.onerror = () => {
      reject(new Error("Failed to load image for preview"));
    };

    img.src = imageUrl;
  });
}
