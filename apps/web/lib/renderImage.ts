/**
 * Shared Image Rendering Utility
 *
 * This utility encapsulates the rotate-then-crop rendering pipeline.
 *
 * Rendering Pipeline:
 * 1. Load original image
 * 2. Rotate image by specified angle (rotation applied around image center)
 * 3. Apply crop to the rotated result
 *
 * Note: Mirror (horizontal flip) is NOT handled here. It is applied as a
 * display-time transform via scaleX=-1 in Konva components.
 *
 * Filters are applied separately via Konva after this utility renders
 * the geometric transforms.
 */

import { calculateBoundingBox } from './cropGeometry';

/**
 * Parameters for rendering an image with geometric transforms
 */
export interface RenderImageParams {
  /** The source image element */
  image: HTMLImageElement;
  /** Rotation angle in degrees (-180 to 180) */
  rotation: number;
  /** Crop X position as percentage (0-100) of rotated bounding box */
  cropX: number;
  /** Crop Y position as percentage (0-100) of rotated bounding box */
  cropY: number;
  /** Crop width as percentage (0-100) of rotated bounding box */
  cropWidth: number;
  /** Crop height as percentage (0-100) of rotated bounding box */
  cropHeight: number;
}

/**
 * Result of the render operation
 */
export interface RenderResult {
  /** Canvas containing the rotated and cropped image (no filters) */
  canvas: HTMLCanvasElement;
  /** Width of the output canvas */
  width: number;
  /** Height of the output canvas */
  height: number;
}

/**
 * Render an image with geometric transforms (mirror, rotate, crop).
 *
 * This function handles the complex coordinate math for the rotate-then-crop
 * pipeline in a single place, ensuring consistency across all views.
 *
 * @param params - Render parameters
 * @returns RenderResult with the transformed canvas
 */
export function renderImage(params: RenderImageParams): RenderResult {
  const { image, rotation, cropX, cropY, cropWidth, cropHeight } = params;

  const imageWidth = image.width;
  const imageHeight = image.height;

  // Step 1: Calculate bounding box for the rotated image
  const boundingBox = calculateBoundingBox(imageWidth, imageHeight, rotation);

  // Step 2: Create a canvas large enough to hold the rotated image
  const rotatedCanvas = document.createElement('canvas');
  rotatedCanvas.width = boundingBox.width;
  rotatedCanvas.height = boundingBox.height;
  const rotatedCtx = rotatedCanvas.getContext('2d')!;

  // Step 3: Draw the image with mirror and rotation
  // Move origin to center of bounding box
  rotatedCtx.translate(boundingBox.width / 2, boundingBox.height / 2);

  // Apply rotation
  const radians = (rotation * Math.PI) / 180;
  rotatedCtx.rotate(radians);

  // Draw image centered at origin (which is now center of bounding box)
  rotatedCtx.drawImage(image, -imageWidth / 2, -imageHeight / 2);

  // Step 4: Extract the crop region from the rotated canvas
  // Convert percentage crop values to pixel coordinates
  const cropPixelX = (cropX / 100) * boundingBox.width;
  const cropPixelY = (cropY / 100) * boundingBox.height;
  const cropPixelWidth = (cropWidth / 100) * boundingBox.width;
  const cropPixelHeight = (cropHeight / 100) * boundingBox.height;

  // Create output canvas with crop dimensions
  const outputCanvas = document.createElement('canvas');
  outputCanvas.width = Math.max(1, Math.round(cropPixelWidth));
  outputCanvas.height = Math.max(1, Math.round(cropPixelHeight));
  const outputCtx = outputCanvas.getContext('2d')!;

  // Draw the cropped region from the rotated canvas
  outputCtx.drawImage(
    rotatedCanvas,
    cropPixelX,
    cropPixelY,
    cropPixelWidth,
    cropPixelHeight,
    0,
    0,
    outputCanvas.width,
    outputCanvas.height
  );

  return {
    canvas: outputCanvas,
    width: outputCanvas.width,
    height: outputCanvas.height,
  };
}

/**
 * Render an image with geometric transforms to a specific output size.
 *
 * This is useful for export where you need to render to exact dimensions.
 *
 * @param params - Render parameters
 * @param outputWidth - Desired output width in pixels
 * @param outputHeight - Desired output height in pixels
 * @returns RenderResult with the transformed canvas at the specified size
 */
export function renderImageToSize(
  params: RenderImageParams,
  outputWidth: number,
  outputHeight: number
): RenderResult {
  // First render at native resolution
  const nativeResult = renderImage(params);

  // If the native result matches desired size, return it directly
  if (nativeResult.width === outputWidth && nativeResult.height === outputHeight) {
    return nativeResult;
  }

  // Scale to desired output size
  const scaledCanvas = document.createElement('canvas');
  scaledCanvas.width = outputWidth;
  scaledCanvas.height = outputHeight;
  const scaledCtx = scaledCanvas.getContext('2d')!;

  // Use high-quality image scaling
  scaledCtx.imageSmoothingEnabled = true;
  scaledCtx.imageSmoothingQuality = 'high';

  scaledCtx.drawImage(nativeResult.canvas, 0, 0, outputWidth, outputHeight);

  return {
    canvas: scaledCanvas,
    width: outputWidth,
    height: outputHeight,
  };
}

/**
 * Calculate the output dimensions for a cropped region of a rotated image.
 *
 * This is useful for determining layout dimensions before actually rendering.
 *
 * @param imageWidth - Original image width
 * @param imageHeight - Original image height
 * @param rotation - Rotation angle in degrees
 * @param cropWidth - Crop width as percentage (0-100)
 * @param cropHeight - Crop height as percentage (0-100)
 * @returns Dimensions of the output
 */
export function calculateOutputDimensions(
  imageWidth: number,
  imageHeight: number,
  rotation: number,
  cropWidth: number,
  cropHeight: number
): { width: number; height: number } {
  const boundingBox = calculateBoundingBox(imageWidth, imageHeight, rotation);

  return {
    width: (cropWidth / 100) * boundingBox.width,
    height: (cropHeight / 100) * boundingBox.height,
  };
}

