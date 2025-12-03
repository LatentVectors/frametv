/**
 * useAdjustmentState Hook
 *
 * Manages adjustment values with enable/disable flags for the SlotEditorModal.
 * Provides functions for updating values, toggling states, and resetting fields.
 */

import { useState, useCallback, useMemo } from "react";
import { ImageAssignment } from "@/types";
import {
  calculateBoundingBox,
  getRotatedImagePolygon,
  getMaxCropAtAspectRatio,
  cropToPercentage,
  percentageToCrop,
  isValidCropPosition,
  constrainCropToValidArea,
  fitCropToAspectRatio,
} from "@/lib/cropGeometry";
import { getFilterConfig } from "@/lib/filters/applyFilters";
import Konva from "konva";

/**
 * Filter value fields that can be adjusted
 */
export type FilterField =
  | "brightness"
  | "contrast"
  | "saturation"
  | "hue"
  | "temperature"
  | "tint";

/**
 * Filter enabled toggle fields
 */
export type FilterEnabledField =
  | "brightnessEnabled"
  | "contrastEnabled"
  | "saturationEnabled"
  | "hueEnabled"
  | "temperatureEnabled"
  | "tintEnabled";

/**
 * Color preset types
 */
export type PresetType = "blackWhite" | "sepia" | "monochrome";

/**
 * All adjustable fields including transforms
 */
export type AdjustableField =
  | FilterField
  | "rotation"
  | "cropX"
  | "cropY"
  | "cropWidth"
  | "cropHeight"
  | "monochromeColor";

/**
 * Internal state structure for adjustments
 */
interface AdjustmentState {
  // Filter values
  brightness: number;
  contrast: number;
  saturation: number;
  hue: number;
  temperature: number;
  tint: number;

  // Filter enabled flags
  brightnessEnabled: boolean;
  contrastEnabled: boolean;
  saturationEnabled: boolean;
  hueEnabled: boolean;
  temperatureEnabled: boolean;
  tintEnabled: boolean;

  // Preset flags
  blackWhiteEnabled: boolean;
  sepiaEnabled: boolean;
  monochromeEnabled: boolean;
  monochromeColor: string;

  // Transforms
  rotation: number;
  mirrorX: boolean;

  // Crop
  cropX: number;
  cropY: number;
  cropWidth: number;
  cropHeight: number;

  // Master toggle
  filtersEnabled: boolean;
}

/**
 * Result returned by the useAdjustmentState hook
 */
export interface AdjustmentStateResult {
  /** Current state values */
  state: AdjustmentState;

  /** Update a single field value */
  updateValue: (field: AdjustableField, value: number | string) => void;

  /** Toggle a filter's enabled flag */
  toggleEnabled: (field: FilterEnabledField) => void;

  /** Toggle a preset with mutual exclusivity */
  togglePreset: (preset: PresetType) => void;

  /** Toggle the master filters enabled switch */
  toggleFiltersEnabled: () => void;

  /** Toggle the mirrorX transform */
  toggleMirror: () => void;

  /** Reset a single field to default */
  resetField: (field: FilterField) => void;

  /** Reset all values to defaults */
  resetAll: () => void;

  /** Get array of Konva filters based on current state */
  getKonvaFilters: () => (typeof Konva.Filters)[keyof typeof Konva.Filters][];

  /** Apply filter attributes to a Konva.Image node */
  applyFilterAttributes: (node: Konva.Image) => void;

  /** Get complete ImageAssignment for saving */
  getAssignment: () => ImageAssignment;

  /** Check if any changes have been made from the initial state */
  hasChanges: boolean;
}

/**
 * Default values for filter adjustments
 */
const DEFAULT_FILTER_VALUES: Record<FilterField, number> = {
  brightness: 0,
  contrast: 0,
  saturation: 0,
  hue: 0,
  temperature: 0,
  tint: 0,
};

/**
 * Default monochrome color
 */
const DEFAULT_MONOCHROME_COLOR = "#4A90D9";

/**
 * Calculate default crop values for an image at the given aspect ratio
 */
function calculateDefaultCrop(
  imageWidth: number,
  imageHeight: number,
  slotAspectRatio: number,
  rotation: number = 0
): { cropX: number; cropY: number; cropWidth: number; cropHeight: number } {
  const bbox = calculateBoundingBox(imageWidth, imageHeight, rotation);
  const polygon = getRotatedImagePolygon(imageWidth, imageHeight, rotation);
  const maxCrop = getMaxCropAtAspectRatio(polygon, slotAspectRatio);
  const percentageCrop = cropToPercentage(maxCrop, bbox);

  return {
    cropX: percentageCrop.x,
    cropY: percentageCrop.y,
    cropWidth: percentageCrop.width,
    cropHeight: percentageCrop.height,
  };
}

/**
 * Hook for managing adjustment state in the SlotEditorModal.
 *
 * @param initialAssignment - The initial image assignment to edit
 * @param imageDimensions - Original image dimensions
 * @param slotAspectRatio - The slot's aspect ratio (width/height)
 * @returns AdjustmentStateResult with state and manipulation functions
 */
export function useAdjustmentState(
  initialAssignment: ImageAssignment,
  imageDimensions: { width: number; height: number },
  slotAspectRatio: number
): AdjustmentStateResult {
  // Initialize state from assignment
  const [state, setState] = useState<AdjustmentState>(() => {
    // Calculate default crop if not provided
    const defaultCrop = calculateDefaultCrop(
      imageDimensions.width,
      imageDimensions.height,
      slotAspectRatio,
      initialAssignment.rotation ?? 0
    );

    return {
      // Filter values
      brightness: initialAssignment.brightness ?? 0,
      contrast: initialAssignment.contrast ?? 0,
      saturation: initialAssignment.saturation ?? 0,
      hue: initialAssignment.hue ?? 0,
      temperature: initialAssignment.temperature ?? 0,
      tint: initialAssignment.tint ?? 0,

      // Filter enabled flags
      brightnessEnabled: initialAssignment.brightnessEnabled ?? true,
      contrastEnabled: initialAssignment.contrastEnabled ?? true,
      saturationEnabled: initialAssignment.saturationEnabled ?? true,
      hueEnabled: initialAssignment.hueEnabled ?? true,
      temperatureEnabled: initialAssignment.temperatureEnabled ?? true,
      tintEnabled: initialAssignment.tintEnabled ?? true,

      // Preset flags
      blackWhiteEnabled: initialAssignment.blackWhiteEnabled ?? false,
      sepiaEnabled: initialAssignment.sepiaEnabled ?? false,
      monochromeEnabled: initialAssignment.monochromeEnabled ?? false,
      monochromeColor:
        initialAssignment.monochromeColor ?? DEFAULT_MONOCHROME_COLOR,

      // Transforms
      rotation: initialAssignment.rotation ?? 0,
      mirrorX: initialAssignment.mirrorX ?? false,

      // Crop - use provided values or calculate defaults
      cropX: initialAssignment.cropX ?? defaultCrop.cropX,
      cropY: initialAssignment.cropY ?? defaultCrop.cropY,
      cropWidth: initialAssignment.cropWidth ?? defaultCrop.cropWidth,
      cropHeight: initialAssignment.cropHeight ?? defaultCrop.cropHeight,

      // Master toggle
      filtersEnabled: initialAssignment.filtersEnabled ?? true,
    };
  });

  /**
   * Update a single field value
   */
  const updateValue = useCallback(
    (field: AdjustableField, value: number | string) => {
      setState((prev) => {
        const newState = { ...prev, [field]: value };

        // If rotation changed, we may need to constrain the crop
        if (field === "rotation" && typeof value === "number") {
          const bbox = calculateBoundingBox(
            imageDimensions.width,
            imageDimensions.height,
            value
          );
          const polygon = getRotatedImagePolygon(
            imageDimensions.width,
            imageDimensions.height,
            value
          );

          // Rebuild the crop around its previous center so the slot aspect ratio stays fixed
          const cropPixels = percentageToCrop(
            {
              x: prev.cropX,
              y: prev.cropY,
              width: prev.cropWidth,
              height: prev.cropHeight,
            },
            bbox
          );

          const centeredCrop = fitCropToAspectRatio(
            cropPixels,
            slotAspectRatio,
            "center"
          );

          const constrained = isValidCropPosition(centeredCrop, polygon)
            ? centeredCrop
            : constrainCropToValidArea(centeredCrop, polygon, slotAspectRatio);
          const percentageCrop = cropToPercentage(constrained, bbox);

          newState.cropX = percentageCrop.x;
          newState.cropY = percentageCrop.y;
          newState.cropWidth = percentageCrop.width;
          newState.cropHeight = percentageCrop.height;
        }

        return newState;
      });
    },
    [imageDimensions.width, imageDimensions.height, slotAspectRatio]
  );

  /**
   * Toggle a filter's enabled flag
   */
  const toggleEnabled = useCallback((field: FilterEnabledField) => {
    setState((prev) => ({
      ...prev,
      [field]: !prev[field],
    }));
  }, []);

  /**
   * Toggle a preset with mutual exclusivity
   */
  const togglePreset = useCallback((preset: PresetType) => {
    setState((prev) => {
      const newState = { ...prev };

      switch (preset) {
        case "blackWhite":
          newState.blackWhiteEnabled = !prev.blackWhiteEnabled;
          if (newState.blackWhiteEnabled) {
            newState.sepiaEnabled = false;
            newState.monochromeEnabled = false;
          }
          break;
        case "sepia":
          newState.sepiaEnabled = !prev.sepiaEnabled;
          if (newState.sepiaEnabled) {
            newState.blackWhiteEnabled = false;
            newState.monochromeEnabled = false;
          }
          break;
        case "monochrome":
          newState.monochromeEnabled = !prev.monochromeEnabled;
          if (newState.monochromeEnabled) {
            newState.blackWhiteEnabled = false;
            newState.sepiaEnabled = false;
          }
          break;
      }

      return newState;
    });
  }, []);

  /**
   * Toggle the master filters enabled switch
   */
  const toggleFiltersEnabled = useCallback(() => {
    setState((prev) => ({
      ...prev,
      filtersEnabled: !prev.filtersEnabled,
    }));
  }, []);

  /**
   * Toggle the mirrorX transform
   */
  const toggleMirror = useCallback(() => {
    setState((prev) => ({
      ...prev,
      mirrorX: !prev.mirrorX,
    }));
  }, []);

  /**
   * Reset a single filter field to default
   */
  const resetField = useCallback((field: FilterField) => {
    setState((prev) => ({
      ...prev,
      [field]: DEFAULT_FILTER_VALUES[field],
    }));
  }, []);

  /**
   * Reset all values to defaults
   */
  const resetAll = useCallback(() => {
    const defaultCrop = calculateDefaultCrop(
      imageDimensions.width,
      imageDimensions.height,
      slotAspectRatio,
      0 // Reset rotation to 0
    );

    setState({
      // Filter values reset to 0
      brightness: 0,
      contrast: 0,
      saturation: 0,
      hue: 0,
      temperature: 0,
      tint: 0,

      // All *Enabled flags reset to true
      brightnessEnabled: true,
      contrastEnabled: true,
      saturationEnabled: true,
      hueEnabled: true,
      temperatureEnabled: true,
      tintEnabled: true,

      // Preset flags reset to false
      blackWhiteEnabled: false,
      sepiaEnabled: false,
      monochromeEnabled: false,
      monochromeColor: DEFAULT_MONOCHROME_COLOR,

      // Transforms reset to identity
      rotation: 0,
      mirrorX: false,

      // Crop reset to maximum valid area
      cropX: defaultCrop.cropX,
      cropY: defaultCrop.cropY,
      cropWidth: defaultCrop.cropWidth,
      cropHeight: defaultCrop.cropHeight,

      // Master toggle on
      filtersEnabled: true,
    });
  }, [imageDimensions.width, imageDimensions.height, slotAspectRatio]);

  /**
   * Convert current state to ImageAssignment format for filter utilities
   */
  const stateAsAssignment = useMemo(
    (): ImageAssignment => ({
      slotId: initialAssignment.slotId,
      imageUrl: initialAssignment.imageUrl,
      originalWidth: imageDimensions.width,
      originalHeight: imageDimensions.height,
      ...state,
    }),
    [
      state,
      initialAssignment.slotId,
      initialAssignment.imageUrl,
      imageDimensions,
    ]
  );

  /**
   * Get array of Konva filters based on current state
   */
  const getKonvaFilters = useCallback(() => {
    const config = getFilterConfig(stateAsAssignment);
    return config.filters;
  }, [stateAsAssignment]);

  /**
   * Apply filter attributes to a Konva.Image node
   */
  const applyFilterAttributes = useCallback(
    (node: Konva.Image) => {
      const config = getFilterConfig(stateAsAssignment);
      config.applyAttributes(node);
    },
    [stateAsAssignment]
  );

  /**
   * Get complete ImageAssignment for saving
   */
  const getAssignment = useCallback((): ImageAssignment => {
    return {
      slotId: initialAssignment.slotId,
      imageUrl: initialAssignment.imageUrl,
      sourceImageId: initialAssignment.sourceImageId,
      originalWidth: imageDimensions.width,
      originalHeight: imageDimensions.height,

      // Filter values
      brightness: state.brightness,
      contrast: state.contrast,
      saturation: state.saturation,
      hue: state.hue,
      temperature: state.temperature,
      tint: state.tint,

      // Filter enabled flags
      brightnessEnabled: state.brightnessEnabled,
      contrastEnabled: state.contrastEnabled,
      saturationEnabled: state.saturationEnabled,
      hueEnabled: state.hueEnabled,
      temperatureEnabled: state.temperatureEnabled,
      tintEnabled: state.tintEnabled,

      // Preset flags
      blackWhiteEnabled: state.blackWhiteEnabled,
      sepiaEnabled: state.sepiaEnabled,
      monochromeEnabled: state.monochromeEnabled,
      monochromeColor: state.monochromeColor,

      // Transforms
      rotation: state.rotation,
      mirrorX: state.mirrorX,

      // Crop
      cropX: state.cropX,
      cropY: state.cropY,
      cropWidth: state.cropWidth,
      cropHeight: state.cropHeight,

      // Master toggle
      filtersEnabled: state.filtersEnabled,
    };
  }, [
    state,
    initialAssignment.slotId,
    initialAssignment.imageUrl,
    initialAssignment.sourceImageId,
    imageDimensions,
  ]);

  /**
   * Check if any changes have been made from the initial state
   */
  const hasChanges = useMemo(() => {
    const initial = initialAssignment;
    return (
      state.brightness !== (initial.brightness ?? 0) ||
      state.contrast !== (initial.contrast ?? 0) ||
      state.saturation !== (initial.saturation ?? 0) ||
      state.hue !== (initial.hue ?? 0) ||
      state.temperature !== (initial.temperature ?? 0) ||
      state.tint !== (initial.tint ?? 0) ||
      state.brightnessEnabled !== (initial.brightnessEnabled ?? true) ||
      state.contrastEnabled !== (initial.contrastEnabled ?? true) ||
      state.saturationEnabled !== (initial.saturationEnabled ?? true) ||
      state.hueEnabled !== (initial.hueEnabled ?? true) ||
      state.temperatureEnabled !== (initial.temperatureEnabled ?? true) ||
      state.tintEnabled !== (initial.tintEnabled ?? true) ||
      state.blackWhiteEnabled !== (initial.blackWhiteEnabled ?? false) ||
      state.sepiaEnabled !== (initial.sepiaEnabled ?? false) ||
      state.monochromeEnabled !== (initial.monochromeEnabled ?? false) ||
      state.monochromeColor !==
        (initial.monochromeColor ?? DEFAULT_MONOCHROME_COLOR) ||
      state.rotation !== (initial.rotation ?? 0) ||
      state.mirrorX !== (initial.mirrorX ?? false) ||
      state.filtersEnabled !== (initial.filtersEnabled ?? true)
      // Note: crop changes are always considered "changes" if different from initial
      // but we don't track initial crop as it may have been auto-calculated
    );
  }, [state, initialAssignment]);

  return {
    state,
    updateValue,
    toggleEnabled,
    togglePreset,
    toggleFiltersEnabled,
    toggleMirror,
    resetField,
    resetAll,
    getKonvaFilters,
    applyFilterAttributes,
    getAssignment,
    hasChanges,
  };
}
