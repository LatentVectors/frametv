/**
 * Shared Filter Application Utility
 *
 * This utility provides centralized filter application logic for use in:
 * - ImageLayer.tsx (main editor preview)
 * - SlotEditorModal.tsx (modal preview)
 * - CanvasEditor.tsx (export)
 *
 * Filter Chain Order:
 * 1. Brightness
 * 2. Contrast
 * 3. Saturation / HSL (including Hue)
 * 4. Temperature / Tint
 * 5. Black & White OR Sepia OR Monochrome (mutually exclusive color effects - applied last)
 */

import Konva from 'konva';
import { ImageAssignment } from '@/types';
import { applyTemperatureTintAttributes } from './temperatureTint';
import { applyMonochromeAttributes } from './monochrome';
// Import filters to ensure they are registered
import './blackWhite';
import './sepia';

/**
 * Filter configuration result
 */
export interface FilterConfig {
  /** Array of Konva filter functions to apply */
  filters: (typeof Konva.Filters[keyof typeof Konva.Filters])[];
  /** Function to apply filter attributes to a Konva.Image node */
  applyAttributes: (node: Konva.Image) => void;
}

/**
 * Get the filter configuration for an image assignment.
 *
 * This function determines which filters should be applied based on the
 * assignment's filter values, enabled flags, and preset states.
 *
 * @param assignment - The image assignment containing filter values
 * @returns FilterConfig with filters array and attribute application function
 */
export function getFilterConfig(assignment: ImageAssignment): FilterConfig {
  const filters: (typeof Konva.Filters[keyof typeof Konva.Filters])[] = [];

  // Master toggle - skip all filters when disabled
  const filtersEnabled = assignment.filtersEnabled ?? true;

  if (!filtersEnabled) {
    return {
      filters: [],
      applyAttributes: () => {},
    };
  }

  // Individual enabled flags (default to true)
  const brightnessEnabled = assignment.brightnessEnabled ?? true;
  const contrastEnabled = assignment.contrastEnabled ?? true;
  const saturationEnabled = assignment.saturationEnabled ?? true;
  const hueEnabled = assignment.hueEnabled ?? true;
  const temperatureEnabled = assignment.temperatureEnabled ?? true;
  const tintEnabled = assignment.tintEnabled ?? true;

  // Preset flags (default to false)
  const blackWhiteEnabled = assignment.blackWhiteEnabled ?? false;
  const sepiaEnabled = assignment.sepiaEnabled ?? false;
  const monochromeEnabled = assignment.monochromeEnabled ?? false;

  // Track which standard filters should be applied
  const shouldApplyBrightness =
    brightnessEnabled && assignment.brightness !== undefined && assignment.brightness !== 0;
  const shouldApplyContrast =
    contrastEnabled && assignment.contrast !== undefined && assignment.contrast !== 0;
  const shouldApplySaturation =
    saturationEnabled && assignment.saturation !== undefined && assignment.saturation !== 0;
  const shouldApplyHue =
    hueEnabled && assignment.hue !== undefined && assignment.hue !== 0;
  const shouldApplyTemperature =
    temperatureEnabled && assignment.temperature !== undefined && assignment.temperature !== 0;
  const shouldApplyTint =
    tintEnabled && assignment.tint !== undefined && assignment.tint !== 0;

  // 1. Add Brightness filter
  if (shouldApplyBrightness) {
    filters.push(Konva.Filters.Brighten);
  }

  // 2. Add Contrast filter
  if (shouldApplyContrast) {
    filters.push(Konva.Filters.Contrast);
  }

  // 3. Add HSL filter (for saturation and hue)
  if (shouldApplySaturation || shouldApplyHue) {
    filters.push(Konva.Filters.HSL);
  }

  // 4. Add Temperature/Tint filter
  const temperatureTintFilter =
    (Konva.Filters as Record<string, typeof Konva.Filters[keyof typeof Konva.Filters]>)
      .TemperatureTint;
  if ((shouldApplyTemperature || shouldApplyTint) && temperatureTintFilter) {
    filters.push(temperatureTintFilter);
  }

  // 5. Add color preset filter (mutually exclusive - only one can be active)
  // Priority: Black & White > Sepia > Monochrome
  const blackWhiteFilter =
    (Konva.Filters as Record<string, typeof Konva.Filters[keyof typeof Konva.Filters]>).BlackWhite;
  const sepiaFilter =
    (Konva.Filters as Record<string, typeof Konva.Filters[keyof typeof Konva.Filters]>).Sepia;
  const monochromeFilter =
    (Konva.Filters as Record<string, typeof Konva.Filters[keyof typeof Konva.Filters]>).Monochrome;

  if (blackWhiteEnabled && blackWhiteFilter) {
    filters.push(blackWhiteFilter);
  } else if (sepiaEnabled && sepiaFilter) {
    filters.push(sepiaFilter);
  } else if (monochromeEnabled && monochromeFilter) {
    filters.push(monochromeFilter);
  }

  // Create attribute application function
  const applyAttributes = (node: Konva.Image) => {
    // Brightness: expects values from -1 to 1
    if (shouldApplyBrightness) {
      node.brightness(assignment.brightness! / 100);
    }

    // Contrast: expects values from -100 to 100
    if (shouldApplyContrast) {
      node.contrast(assignment.contrast!);
    }

    // Saturation: HSL expects values from -2 to 10 (map -100 to 100 to -2 to 2)
    if (shouldApplySaturation) {
      node.saturation(assignment.saturation! / 50);
    }

    // Hue: expects values from 0 to 359 (degrees)
    if (shouldApplyHue) {
      node.hue(assignment.hue!);
    }

    // Temperature and Tint
    const tempValue = shouldApplyTemperature ? (assignment.temperature ?? 0) : 0;
    const tintValue = shouldApplyTint ? (assignment.tint ?? 0) : 0;
    applyTemperatureTintAttributes(node, tempValue, tintValue);

    // Monochrome color (only effective when monochromeEnabled is true and others are false)
    const monochromeColor =
      monochromeEnabled && !blackWhiteEnabled && !sepiaEnabled
        ? (assignment.monochromeColor ?? '#4A90D9')
        : '';
    applyMonochromeAttributes(node, monochromeColor);
  };

  return {
    filters,
    applyAttributes,
  };
}

/**
 * Apply filters to a Konva.Image node based on the assignment.
 *
 * This is a convenience function that both sets the filter array and
 * applies all necessary attributes in one call.
 *
 * @param node - The Konva.Image node to apply filters to
 * @param assignment - The image assignment containing filter values
 */
export function applyFilters(node: Konva.Image, assignment: ImageAssignment): void {
  const config = getFilterConfig(assignment);
  node.filters(config.filters);
  config.applyAttributes(node);
}

/**
 * Check if any color preset is active.
 *
 * Useful for determining if color adjustment sliders should be disabled.
 *
 * @param assignment - The image assignment
 * @returns True if any color preset (B&W, Sepia, Monochrome) is active
 */
export function isColorPresetActive(assignment: ImageAssignment): boolean {
  return (
    (assignment.blackWhiteEnabled ?? false) ||
    (assignment.sepiaEnabled ?? false) ||
    (assignment.monochromeEnabled ?? false)
  );
}

/**
 * Get the name of the active color preset.
 *
 * @param assignment - The image assignment
 * @returns Name of the active preset or null if none active
 */
export function getActivePresetName(
  assignment: ImageAssignment
): 'Black & White' | 'Sepia' | 'Monochrome' | null {
  if (assignment.blackWhiteEnabled) return 'Black & White';
  if (assignment.sepiaEnabled) return 'Sepia';
  if (assignment.monochromeEnabled) return 'Monochrome';
  return null;
}

/**
 * Check if a specific slider should be disabled due to an active color preset.
 *
 * Brightness and Contrast remain active with any preset.
 * Saturation, Hue, Temperature, and Tint are disabled when a color preset is active.
 *
 * @param field - The filter field name
 * @param assignment - The image assignment
 * @returns True if the slider should be disabled
 */
export function isSliderDisabledByPreset(
  field: 'brightness' | 'contrast' | 'saturation' | 'hue' | 'temperature' | 'tint',
  assignment: ImageAssignment
): boolean {
  // Brightness and Contrast always remain active
  if (field === 'brightness' || field === 'contrast') {
    return false;
  }

  // Other color-affecting filters are disabled when a color preset is active
  return isColorPresetActive(assignment);
}

/**
 * Get the tooltip text for a disabled slider.
 *
 * @param assignment - The image assignment
 * @returns Tooltip text explaining why the slider is disabled
 */
export function getDisabledSliderTooltip(assignment: ImageAssignment): string {
  const presetName = getActivePresetName(assignment);
  if (presetName) {
    return `No effect while ${presetName} is active`;
  }
  return '';
}

