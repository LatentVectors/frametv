import Konva from 'konva';

/**
 * Black & White filter that converts image to grayscale using the luminance formula.
 * Uses standard luminance weights: 0.299*R + 0.587*G + 0.114*B
 * This produces true grayscale that matches human perception of brightness.
 */
export const BlackWhiteFilter: typeof Konva.Filters[keyof typeof Konva.Filters] = function (
  this: Konva.Node,
  imageData: ImageData
) {
  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    // Calculate luminance using standard formula
    const luminance = 0.299 * r + 0.587 * g + 0.114 * b;

    // Set R, G, B to the same luminance value for grayscale
    data[i] = luminance;
    data[i + 1] = luminance;
    data[i + 2] = luminance;
    // Alpha channel (data[i + 3]) remains unchanged
  }
};

// Register the filter with Konva
if (!(Konva.Filters as Record<string, typeof Konva.Filters[keyof typeof Konva.Filters]>).BlackWhite) {
  (Konva.Filters as Record<string, typeof Konva.Filters[keyof typeof Konva.Filters]>).BlackWhite = BlackWhiteFilter;
}

