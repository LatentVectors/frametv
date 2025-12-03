import Konva from 'konva';

/**
 * Sepia filter using the standard sepia matrix transformation.
 * Creates an authentic sepia tone effect that mimics aged photographs.
 * 
 * Standard sepia matrix:
 * R' = min(255, R * 0.393 + G * 0.769 + B * 0.189)
 * G' = min(255, R * 0.349 + G * 0.686 + B * 0.168)
 * B' = min(255, R * 0.272 + G * 0.534 + B * 0.131)
 */
export const SepiaFilter: typeof Konva.Filters[keyof typeof Konva.Filters] = function (
  this: Konva.Node,
  imageData: ImageData
) {
  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    // Apply sepia matrix transformation
    const outputR = Math.min(255, r * 0.393 + g * 0.769 + b * 0.189);
    const outputG = Math.min(255, r * 0.349 + g * 0.686 + b * 0.168);
    const outputB = Math.min(255, r * 0.272 + g * 0.534 + b * 0.131);

    data[i] = outputR;
    data[i + 1] = outputG;
    data[i + 2] = outputB;
    // Alpha channel (data[i + 3]) remains unchanged
  }
};

// Register the filter with Konva
if (!(Konva.Filters as Record<string, typeof Konva.Filters[keyof typeof Konva.Filters]>).Sepia) {
  (Konva.Filters as Record<string, typeof Konva.Filters[keyof typeof Konva.Filters]>).Sepia = SepiaFilter;
}

