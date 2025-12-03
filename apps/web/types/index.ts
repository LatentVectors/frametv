/**
 * Slot definition with percentage-based coordinates (0-100)
 */
export interface Slot {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Image assignment with transform state relative to slot
 */
export interface ImageAssignment {
  slotId: string;
  imageUrl: string;
  sourceImageId?: number; // Database ID of the source image (if from sidebar)
  originalWidth?: number; // Original image width for preview scaling calculations
  originalHeight?: number; // Original image height for preview scaling calculations
  // Photo editing filters (non-destructive)
  mirrorX?: boolean; // Horizontal flip
  brightness?: number; // Range: -100 to 100 (default: 0)
  contrast?: number; // Range: -100 to 100 (default: 0)
  saturation?: number; // Range: -100 to 100 (default: 0)
  hue?: number; // Range: -180 to 180 (default: 0)
  temperature?: number; // Range: -100 to 100 (default: 0) - warm/cool
  tint?: number; // Range: -100 to 100 (default: 0) - green/magenta
  // Filter enable/disable flags
  filtersEnabled?: boolean; // Global master switch (default: true)
  brightnessEnabled?: boolean; // Individual toggle (default: true)
  contrastEnabled?: boolean; // Individual toggle (default: true)
  saturationEnabled?: boolean; // Individual toggle (default: true)
  hueEnabled?: boolean; // Individual toggle (default: true)
  temperatureEnabled?: boolean; // Individual toggle (default: true)
  tintEnabled?: boolean; // Individual toggle (default: true)
  // Crop fields - relative to rotated bounding box (percentage 0-100)
  cropX?: number;
  cropY?: number;
  cropWidth?: number;
  cropHeight?: number;
  // Rotation for crop tool (supports arbitrary angles with decimal precision)
  rotation?: number; // Rotation angle in degrees (-180 to 180)
  // Filter presets (mutually exclusive color effects)
  monochromeColor?: string; // Color for monochrome filter preset (default: #4A90D9)
  blackWhiteEnabled?: boolean; // Black & White preset (default: false)
  sepiaEnabled?: boolean; // Sepia preset (default: false)
  monochromeEnabled?: boolean; // Monochrome preset using monochromeColor (default: false)
}

/**
 * Template definition with slots
 */
export interface Template {
  id: string;
  name: string;
  slots: Slot[];
}

import { components } from "./database-api";

export type Tag = components["schemas"]["Tag"];
export type GalleryImage = components["schemas"]["GalleryImage"];
export type SourceImage = components["schemas"]["SourceImage"];

