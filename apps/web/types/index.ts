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
}

/**
 * Template definition with slots
 */
export interface Template {
  id: string;
  name: string;
  slots: Slot[];
}

