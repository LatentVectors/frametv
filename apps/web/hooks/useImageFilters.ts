/**
 * useImageFilters Hook
 *
 * Manages Konva filter array generation and attribute application based on
 * an ImageAssignment's filter values and enabled states.
 *
 * This hook provides a memoized interface to the filter system, ensuring
 * efficient re-renders when filter values change.
 */

import { useMemo, useCallback } from 'react';
import Konva from 'konva';
import { ImageAssignment } from '@/types';
import { getFilterConfig } from '@/lib/filters/applyFilters';

/**
 * Result returned by the useImageFilters hook
 */
export interface UseImageFiltersResult {
  /** Array of Konva filter functions to apply, in correct order */
  filters: (typeof Konva.Filters[keyof typeof Konva.Filters])[];
  /** Function to apply filter attributes to a Konva.Image node */
  applyAttributes: (node: Konva.Image) => void;
}

/**
 * Hook for managing Konva filters based on an ImageAssignment.
 *
 * The hook memoizes the filter array and attribute application function
 * to prevent unnecessary re-renders and filter recomputations.
 *
 * Filter Chain Order (when enabled):
 * 1. Brightness
 * 2. Contrast
 * 3. Saturation / HSL (including Hue)
 * 4. Temperature / Tint
 * 5. Black & White OR Sepia OR Monochrome (mutually exclusive - applied last)
 *
 * @param assignment - The image assignment containing filter values and enabled states
 * @returns UseImageFiltersResult with memoized filters array and attribute application function
 *
 * @example
 * ```tsx
 * const { filters, applyAttributes } = useImageFilters(assignment);
 *
 * // Apply to Konva.Image node
 * imageRef.current.filters(filters);
 * applyAttributes(imageRef.current);
 * imageRef.current.cache();
 * ```
 */
export function useImageFilters(assignment: ImageAssignment): UseImageFiltersResult {
  // Memoize the filter configuration based on all relevant assignment values
  const filterConfig = useMemo(() => {
    return getFilterConfig(assignment);
  }, [
    // Master toggle
    assignment.filtersEnabled,
    // Filter values
    assignment.brightness,
    assignment.contrast,
    assignment.saturation,
    assignment.hue,
    assignment.temperature,
    assignment.tint,
    // Individual enabled flags
    assignment.brightnessEnabled,
    assignment.contrastEnabled,
    assignment.saturationEnabled,
    assignment.hueEnabled,
    assignment.temperatureEnabled,
    assignment.tintEnabled,
    // Preset flags
    assignment.blackWhiteEnabled,
    assignment.sepiaEnabled,
    assignment.monochromeEnabled,
    assignment.monochromeColor,
  ]);

  // Return memoized filters array
  const filters = useMemo(() => filterConfig.filters, [filterConfig]);

  // Return memoized attribute application function
  const applyAttributes = useCallback(
    (node: Konva.Image) => {
      filterConfig.applyAttributes(node);
    },
    [filterConfig]
  );

  return {
    filters,
    applyAttributes,
  };
}

/**
 * Check if any filters would be applied based on the assignment.
 *
 * Useful for determining whether to call cache() on a Konva.Image node.
 *
 * @param assignment - The image assignment
 * @returns True if any filters would be applied
 */
export function hasActiveFilters(assignment: ImageAssignment): boolean {
  // If master toggle is off, no filters
  if (!(assignment.filtersEnabled ?? true)) {
    return false;
  }

  // Check if any preset is active
  if (
    assignment.blackWhiteEnabled ||
    assignment.sepiaEnabled ||
    assignment.monochromeEnabled
  ) {
    return true;
  }

  // Check each filter individually
  const brightnessActive =
    (assignment.brightnessEnabled ?? true) &&
    assignment.brightness !== undefined &&
    assignment.brightness !== 0;

  const contrastActive =
    (assignment.contrastEnabled ?? true) &&
    assignment.contrast !== undefined &&
    assignment.contrast !== 0;

  const saturationActive =
    (assignment.saturationEnabled ?? true) &&
    assignment.saturation !== undefined &&
    assignment.saturation !== 0;

  const hueActive =
    (assignment.hueEnabled ?? true) &&
    assignment.hue !== undefined &&
    assignment.hue !== 0;

  const temperatureActive =
    (assignment.temperatureEnabled ?? true) &&
    assignment.temperature !== undefined &&
    assignment.temperature !== 0;

  const tintActive =
    (assignment.tintEnabled ?? true) &&
    assignment.tint !== undefined &&
    assignment.tint !== 0;

  return (
    brightnessActive ||
    contrastActive ||
    saturationActive ||
    hueActive ||
    temperatureActive ||
    tintActive
  );
}

