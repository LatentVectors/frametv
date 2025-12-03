/**
 * Crop Geometry Utilities
 * 
 * This module provides functions for calculating valid crop areas within
 * rotated images. When an image is rotated, the axis-aligned bounding box
 * has "empty corners" where no image pixels exist. The crop rectangle must
 * stay within the actual image pixels, not just the bounding box.
 */

/**
 * A 2D point
 */
export interface Point {
  x: number;
  y: number;
}

/**
 * A polygon represented as an array of points (vertices in order)
 */
export type Polygon = Point[];

/**
 * A rectangle with position and dimensions
 */
export interface CropRect {
  x: number;      // Left edge position
  y: number;      // Top edge position
  width: number;  // Width
  height: number; // Height
}

/**
 * Bounding box dimensions
 */
export interface BoundingBox {
  width: number;
  height: number;
}

/**
 * Calculate the axis-aligned bounding box dimensions for a rotated image.
 * 
 * When an image with dimensions (W, H) is rotated by angle θ:
 * boundingBoxWidth = |W × cos(θ)| + |H × sin(θ)|
 * boundingBoxHeight = |W × sin(θ)| + |H × cos(θ)|
 * 
 * @param width - Original image width
 * @param height - Original image height
 * @param rotation - Rotation angle in degrees
 * @returns Bounding box dimensions
 */
export function calculateBoundingBox(
  width: number,
  height: number,
  rotation: number
): BoundingBox {
  const radians = (rotation * Math.PI) / 180;
  const cos = Math.abs(Math.cos(radians));
  const sin = Math.abs(Math.sin(radians));

  return {
    width: width * cos + height * sin,
    height: width * sin + height * cos,
  };
}

/**
 * Get the 4 corner coordinates of a rotated image in bounding box space.
 * 
 * The polygon represents the actual image area (rotated rectangle) within
 * the axis-aligned bounding box. Points are returned in clockwise order
 * starting from the top-left corner of the original image.
 * 
 * @param width - Original image width
 * @param height - Original image height
 * @param rotation - Rotation angle in degrees
 * @returns Array of 4 points representing the rotated image corners
 */
export function getRotatedImagePolygon(
  width: number,
  height: number,
  rotation: number
): Polygon {
  const radians = (rotation * Math.PI) / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);

  // Calculate bounding box dimensions to find center
  const bbox = calculateBoundingBox(width, height, rotation);
  const centerX = bbox.width / 2;
  const centerY = bbox.height / 2;

  // Original corners relative to image center (top-left, top-right, bottom-right, bottom-left)
  const corners: Point[] = [
    { x: -width / 2, y: -height / 2 },
    { x: width / 2, y: -height / 2 },
    { x: width / 2, y: height / 2 },
    { x: -width / 2, y: height / 2 },
  ];

  // Rotate each corner and translate to bounding box coordinates
  return corners.map(({ x, y }) => ({
    x: x * cos - y * sin + centerX,
    y: x * sin + y * cos + centerY,
  }));
}

/**
 * Check if a point is inside a polygon using the ray casting algorithm.
 * 
 * Cast a horizontal ray from the point and count intersections with
 * polygon edges. Odd count = inside, even count = outside.
 * 
 * @param point - The point to test
 * @param polygon - The polygon (array of vertices in order)
 * @returns True if the point is inside the polygon
 */
export function isPointInPolygon(point: Point, polygon: Polygon): boolean {
  const { x, y } = point;
  let inside = false;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x;
    const yi = polygon[i].y;
    const xj = polygon[j].x;
    const yj = polygon[j].y;

    // Check if ray intersects this edge
    const intersect =
      yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;

    if (intersect) {
      inside = !inside;
    }
  }

  return inside;
}

/**
 * Check if a crop rectangle is fully contained within the rotated image polygon.
 * All 4 corners of the crop rectangle must be inside the polygon.
 * 
 * @param cropRect - The crop rectangle to validate
 * @param polygon - The rotated image polygon
 * @returns True if all corners are inside the polygon
 */
export function isValidCropPosition(cropRect: CropRect, polygon: Polygon): boolean {
  const corners: Point[] = [
    { x: cropRect.x, y: cropRect.y },                                    // Top-left
    { x: cropRect.x + cropRect.width, y: cropRect.y },                   // Top-right
    { x: cropRect.x + cropRect.width, y: cropRect.y + cropRect.height }, // Bottom-right
    { x: cropRect.x, y: cropRect.y + cropRect.height },                  // Bottom-left
  ];

  return corners.every((corner) => isPointInPolygon(corner, polygon));
}

/**
 * Calculate the centroid of a polygon.
 * 
 * @param polygon - The polygon
 * @returns The centroid point
 */
function polygonCentroid(polygon: Polygon): Point {
  let sumX = 0;
  let sumY = 0;

  for (const point of polygon) {
    sumX += point.x;
    sumY += point.y;
  }

  return {
    x: sumX / polygon.length,
    y: sumY / polygon.length,
  };
}

/**
 * Scale a crop rectangle from its center by a given factor.
 * 
 * @param cropRect - The crop rectangle to scale
 * @param scale - Scale factor (1.0 = no change, 0.5 = half size)
 * @returns Scaled crop rectangle centered at the same point
 */
export type CropAnchor = 'center' | 'nw' | 'ne' | 'sw' | 'se';

export function scaleCropFromCenter(cropRect: CropRect, scale: number): CropRect {
  const centerX = cropRect.x + cropRect.width / 2;
  const centerY = cropRect.y + cropRect.height / 2;
  const newWidth = cropRect.width * scale;
  const newHeight = cropRect.height * scale;

  return {
    x: centerX - newWidth / 2,
    y: centerY - newHeight / 2,
    width: newWidth,
    height: newHeight,
  };
}

export function fitCropToAspectRatio(
  cropRect: CropRect,
  aspectRatio: number,
  anchor: CropAnchor = 'center'
): CropRect {
  if (aspectRatio <= 0 || cropRect.width <= 0 || cropRect.height <= 0) {
    return cropRect;
  }

  let width = cropRect.width;
  let height = cropRect.height;

  const widthBasedHeight = width / aspectRatio;
  const heightBasedWidth = height * aspectRatio;

  if (widthBasedHeight > height) {
    height = widthBasedHeight;
  } else {
    width = heightBasedWidth;
  }

  switch (anchor) {
    case 'nw':
      return { x: cropRect.x, y: cropRect.y, width, height };
    case 'ne':
      return { x: cropRect.x + cropRect.width - width, y: cropRect.y, width, height };
    case 'sw':
      return { x: cropRect.x, y: cropRect.y + cropRect.height - height, width, height };
    case 'se':
      return {
        x: cropRect.x + cropRect.width - width,
        y: cropRect.y + cropRect.height - height,
        width,
        height,
      };
    case 'center':
    default: {
      const deltaX = (cropRect.width - width) / 2;
      const deltaY = (cropRect.height - height) / 2;
      return {
        x: cropRect.x + deltaX,
        y: cropRect.y + deltaY,
        width,
        height,
      };
    }
  }
}

/**
 * Get the bounding box dimensions from a polygon (for reference).
 * 
 * @param polygon - The polygon
 * @returns Object with width and height of the bounding box
 */
function getPolygonBounds(polygon: Polygon): { width: number; height: number; minX: number; minY: number } {
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  for (const point of polygon) {
    minX = Math.min(minX, point.x);
    maxX = Math.max(maxX, point.x);
    minY = Math.min(minY, point.y);
    maxY = Math.max(maxY, point.y);
  }

  return {
    minX,
    minY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

/**
 * Create a minimum-sized crop rectangle centered in the polygon.
 * This is a fallback when no valid crop exists at the requested size.
 * 
 * Returns a small crop (5% of bounding box) at the polygon centroid.
 * 
 * @param polygon - The rotated image polygon
 * @param aspectRatio - Required aspect ratio (width/height)
 * @returns A small valid crop rectangle
 */
export function minimumCropAtCenter(polygon: Polygon, aspectRatio: number): CropRect {
  const centroid = polygonCentroid(polygon);
  const bounds = getPolygonBounds(polygon);
  const minSize = Math.min(bounds.width, bounds.height) * 0.05;

  let cropWidth: number;
  let cropHeight: number;

  if (aspectRatio >= 1) {
    cropWidth = minSize;
    cropHeight = minSize / aspectRatio;
  } else {
    cropHeight = minSize;
    cropWidth = minSize * aspectRatio;
  }

  return {
    x: centroid.x - cropWidth / 2,
    y: centroid.y - cropHeight / 2,
    width: cropWidth,
    height: cropHeight,
  };
}

/**
 * Constrain a crop rectangle to a valid area within the rotated image polygon.
 * 
 * Uses binary search to find the maximum valid scale factor that keeps
 * all corners inside the polygon. Falls back to minimumCropAtCenter if
 * no valid position can be found.
 * 
 * @param cropRect - The crop rectangle to constrain
 * @param polygon - The rotated image polygon
 * @param aspectRatio - Required aspect ratio (width/height)
 * @returns Adjusted crop rectangle that fits within the polygon
 */
export function constrainCropToValidArea(
  cropRect: CropRect,
  polygon: Polygon,
  aspectRatio: number
): CropRect {
  // If already valid, return as-is
  if (isValidCropPosition(cropRect, polygon)) {
    return cropRect;
  }

  // Binary search for maximum valid scale
  let low = 0.01; // Minimum 1% of original size
  let high = 1.0;
  const precision = 0.001; // Precision to 0.1%

  while (high - low > precision) {
    const mid = (low + high) / 2;
    const scaled = scaleCropFromCenter(cropRect, mid);

    if (isValidCropPosition(scaled, polygon)) {
      low = mid; // Can go larger
    } else {
      high = mid; // Must go smaller
    }
  }

  const scaled = scaleCropFromCenter(cropRect, low);

  if (isValidCropPosition(scaled, polygon)) {
    return scaled;
  }

  // Fallback: minimum crop centered in polygon
  return minimumCropAtCenter(polygon, aspectRatio);
}

/**
 * Find the maximum valid crop rectangle at a given aspect ratio.
 * 
 * This function finds the largest axis-aligned rectangle with the specified
 * aspect ratio that fits entirely within the rotated image polygon.
 * The result is centered within the valid area.
 * 
 * Algorithm:
 * 1. Start with the full bounding box as the maximum possible size
 * 2. Binary search: reduce size until all 4 corners are inside the polygon
 * 3. Center the result within the valid area
 * 
 * @param polygon - The rotated image polygon
 * @param aspectRatio - Required aspect ratio (width/height)
 * @returns Maximum valid crop rectangle with dimensions and position
 */
export function getMaxCropAtAspectRatio(
  polygon: Polygon,
  aspectRatio: number
): CropRect {
  const bounds = getPolygonBounds(polygon);
  const centroid = polygonCentroid(polygon);

  // Calculate the maximum dimensions that would fit the aspect ratio
  // within the bounding box
  let maxWidth: number;
  let maxHeight: number;

  if (aspectRatio >= bounds.width / bounds.height) {
    // Constrained by width
    maxWidth = bounds.width;
    maxHeight = maxWidth / aspectRatio;
  } else {
    // Constrained by height
    maxHeight = bounds.height;
    maxWidth = maxHeight * aspectRatio;
  }

  // Start with maximum possible crop centered at centroid
  const initialCrop: CropRect = {
    x: centroid.x - maxWidth / 2,
    y: centroid.y - maxHeight / 2,
    width: maxWidth,
    height: maxHeight,
  };

  // Binary search for the maximum valid scale
  let low = 0.01;
  let high = 1.0;
  const precision = 0.001;

  while (high - low > precision) {
    const mid = (low + high) / 2;
    const scaled = scaleCropFromCenter(initialCrop, mid);

    if (isValidCropPosition(scaled, polygon)) {
      low = mid; // Can go larger
    } else {
      high = mid; // Must go smaller
    }
  }

  const result = scaleCropFromCenter(initialCrop, low);

  // Verify the result is valid
  if (isValidCropPosition(result, polygon)) {
    return result;
  }

  // Fallback to minimum crop at center
  return minimumCropAtCenter(polygon, aspectRatio);
}

/**
 * Convert a crop rectangle from pixel coordinates to percentage coordinates.
 * 
 * @param cropRect - Crop rectangle in pixel coordinates
 * @param boundingBox - Bounding box dimensions
 * @returns Crop rectangle with values as percentages (0-100)
 */
export function cropToPercentage(cropRect: CropRect, boundingBox: BoundingBox): CropRect {
  return {
    x: (cropRect.x / boundingBox.width) * 100,
    y: (cropRect.y / boundingBox.height) * 100,
    width: (cropRect.width / boundingBox.width) * 100,
    height: (cropRect.height / boundingBox.height) * 100,
  };
}

/**
 * Convert a crop rectangle from percentage coordinates to pixel coordinates.
 * 
 * @param cropRect - Crop rectangle with percentage values (0-100)
 * @param boundingBox - Bounding box dimensions
 * @returns Crop rectangle in pixel coordinates
 */
export function percentageToCrop(cropRect: CropRect, boundingBox: BoundingBox): CropRect {
  return {
    x: (cropRect.x / 100) * boundingBox.width,
    y: (cropRect.y / 100) * boundingBox.height,
    width: (cropRect.width / 100) * boundingBox.width,
    height: (cropRect.height / 100) * boundingBox.height,
  };
}

