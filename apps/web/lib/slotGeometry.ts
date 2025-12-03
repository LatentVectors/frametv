import { Slot } from "@/types";
import { CANVAS_WIDTH, CANVAS_HEIGHT } from "./config";

/**
 * Convert slot percentage dimensions into canvas pixel dimensions.
 */
export function getSlotPixelDimensions(slot: Slot): { width: number; height: number } {
  return {
    width: (slot.width / 100) * CANVAS_WIDTH,
    height: (slot.height / 100) * CANVAS_HEIGHT,
  };
}

/**
 * Calculate the slot's aspect ratio using true canvas pixels.
 */
export function getSlotAspectRatio(slot: Slot): number {
  const { width, height } = getSlotPixelDimensions(slot);
  if (height === 0) {
    return 0;
  }
  return width / height;
}

