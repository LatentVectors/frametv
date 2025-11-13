/**
 * Configuration constants for Frame TV Mat Editor
 */

/**
 * Margin percentage base value (default: 5%)
 * Actual margin uses max(5% width, 5% height) for consistent pixel spacing
 */
export const MARGIN_PERCENT = 5;

/**
 * Gap percentage base value (default: 5%)
 * Actual gap uses max(5% width, 5% height) for consistent pixel spacing
 */
export const GAP_PERCENT = 5;

/**
 * Canvas internal coordinate space dimensions (16:9 aspect ratio)
 */
export const CANVAS_WIDTH = 3840;
export const CANVAS_HEIGHT = 2160;

/**
 * Minimum preview resolution (16:9 aspect ratio)
 */
export const PREVIEW_MIN_WIDTH = 960;
export const PREVIEW_MIN_HEIGHT = 540;

/**
 * Canvas background color (pure white)
 */
export const CANVAS_BACKGROUND_COLOR = '#FFFFFF';

/**
 * Maximum preview canvas width as percentage of viewport (default: 90%)
 */
export const PREVIEW_MAX_WIDTH_PERCENT = 90;

/**
 * Maximum preview image resolution (for performance optimization)
 * Images larger than this will be downscaled for preview
 */
export const PREVIEW_MAX_IMAGE_WIDTH = 1920;
export const PREVIEW_MAX_IMAGE_HEIGHT = 1080;

/**
 * Calculate horizontal margin percentage based on max(percent width, percent height)
 * Returns the percentage value to use for x/width calculations
 */
export function getMarginPercentX(): number {
  const marginPixelsWidth = (MARGIN_PERCENT / 100) * CANVAS_WIDTH;
  const marginPixelsHeight = (MARGIN_PERCENT / 100) * CANVAS_HEIGHT;
  const maxMarginPixels = Math.max(marginPixelsWidth, marginPixelsHeight);
  return (maxMarginPixels / CANVAS_WIDTH) * 100;
}

/**
 * Calculate vertical margin percentage based on max(percent width, percent height)
 * Returns the percentage value to use for y/height calculations
 */
export function getMarginPercentY(): number {
  const marginPixelsWidth = (MARGIN_PERCENT / 100) * CANVAS_WIDTH;
  const marginPixelsHeight = (MARGIN_PERCENT / 100) * CANVAS_HEIGHT;
  const maxMarginPixels = Math.max(marginPixelsWidth, marginPixelsHeight);
  return (maxMarginPixels / CANVAS_HEIGHT) * 100;
}

/**
 * Calculate horizontal gap percentage based on max(percent width, percent height)
 * Returns the percentage value to use for horizontal gap calculations
 */
export function getGapPercentX(): number {
  const gapPixelsWidth = (GAP_PERCENT / 100) * CANVAS_WIDTH;
  const gapPixelsHeight = (GAP_PERCENT / 100) * CANVAS_HEIGHT;
  const maxGapPixels = Math.max(gapPixelsWidth, gapPixelsHeight);
  return (maxGapPixels / CANVAS_WIDTH) * 100;
}

/**
 * Calculate vertical gap percentage based on max(percent width, percent height)
 * Returns the percentage value to use for vertical gap calculations
 */
export function getGapPercentY(): number {
  const gapPixelsWidth = (GAP_PERCENT / 100) * CANVAS_WIDTH;
  const gapPixelsHeight = (GAP_PERCENT / 100) * CANVAS_HEIGHT;
  const maxGapPixels = Math.max(gapPixelsWidth, gapPixelsHeight);
  return (maxGapPixels / CANVAS_HEIGHT) * 100;
}

