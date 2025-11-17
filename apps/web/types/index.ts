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
  x: number;
  y: number;
  scaleX: number;
  scaleY: number;
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
}

/**
 * Template definition with slots
 */
export interface Template {
  id: string;
  name: string;
  slots: Slot[];
}

