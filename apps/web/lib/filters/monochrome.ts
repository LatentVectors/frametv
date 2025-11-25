import Konva from 'konva';

type MonochromeAttrs = {
  _monochromeColor?: string;
};

/**
 * Parse hex color to RGB values
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  // Remove # if present
  hex = hex.replace(/^#/, '');
  
  // Parse hex
  if (hex.length === 3) {
    hex = hex.split('').map(c => c + c).join('');
  }
  
  if (hex.length !== 6) {
    return null;
  }
  
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  
  if (isNaN(r) || isNaN(g) || isNaN(b)) {
    return null;
  }
  
  return { r, g, b };
}

/**
 * Convert RGB to HSL
 */
function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  r /= 255;
  g /= 255;
  b /= 255;
  
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }
  
  return { h, s, l };
}

/**
 * Convert HSL to RGB
 */
function hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
  let r: number, g: number, b: number;
  
  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };
    
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }
  
  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255),
  };
}

/**
 * Monochrome filter that preserves luminance while shifting hue to a selected color.
 * This creates a tint effect that maintains the image's value structure.
 */
export const MonochromeFilter: typeof Konva.Filters[keyof typeof Konva.Filters] = function (
  this: Konva.Node & MonochromeAttrs,
  imageData: ImageData
) {
  const data = imageData.data;
  const { _monochromeColor = '' } = this.attrs;
  
  if (!_monochromeColor) {
    return;
  }
  
  const targetRgb = hexToRgb(_monochromeColor);
  if (!targetRgb) {
    return;
  }
  
  // Get target hue and saturation from the selected color
  const targetHsl = rgbToHsl(targetRgb.r, targetRgb.g, targetRgb.b);
  
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    
    // Get the luminance of the original pixel
    const hsl = rgbToHsl(r, g, b);
    
    // Apply target hue and saturation, keep original luminance
    const newRgb = hslToRgb(targetHsl.h, targetHsl.s * 0.8, hsl.l);
    
    data[i] = newRgb.r;
    data[i + 1] = newRgb.g;
    data[i + 2] = newRgb.b;
  }
};

// Register the filter with Konva
if (!(Konva.Filters as Record<string, typeof Konva.Filters[keyof typeof Konva.Filters]>).Monochrome) {
  (Konva.Filters as Record<string, typeof Konva.Filters[keyof typeof Konva.Filters]>).Monochrome = MonochromeFilter;
}

/**
 * Apply monochrome color attribute to a Konva node
 */
export function applyMonochromeAttributes(
  node: Konva.Image,
  color: string = ''
) {
  node.setAttr('_monochromeColor', color);
}

