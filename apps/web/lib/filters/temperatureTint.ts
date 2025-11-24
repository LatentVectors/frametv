import Konva from 'konva';

type TemperatureTintAttrs = {
  _temperatureAdjustment?: number;
  _tintAdjustment?: number;
};

const clampChannel = (value: number) => Math.max(0, Math.min(255, value));

const TemperatureTintFilter: typeof Konva.Filters[keyof typeof Konva.Filters] = function (this: Konva.Node & TemperatureTintAttrs, imageData: ImageData) {
  const data = imageData.data;
  const { _temperatureAdjustment = 0, _tintAdjustment = 0 } =
    this.attrs;

  if (_temperatureAdjustment === 0 && _tintAdjustment === 0) {
    return;
  }

  const tempFactor = _temperatureAdjustment / 100;
  const tintFactor = _tintAdjustment / 100;

  const warm = tempFactor > 0 ? tempFactor : 0;
  const cool = tempFactor < 0 ? -tempFactor : 0;
  const magenta = tintFactor > 0 ? tintFactor : 0;
  const green = tintFactor < 0 ? -tintFactor : 0;

  for (let i = 0; i < data.length; i += 4) {
    let r = data[i];
    let g = data[i + 1];
    let b = data[i + 2];

    if (warm) {
      r = clampChannel(r + warm * 45);
      b = clampChannel(b - warm * 30);
    }

    if (cool) {
      b = clampChannel(b + cool * 45);
      r = clampChannel(r - cool * 30);
    }

    if (magenta) {
      r = clampChannel(r + magenta * 30);
      b = clampChannel(b + magenta * 30);
      g = clampChannel(g - magenta * 40);
    }

    if (green) {
      g = clampChannel(g + green * 45);
      r = clampChannel(r - green * 25);
      b = clampChannel(b - green * 25);
    }

    data[i] = r;
    data[i + 1] = g;
    data[i + 2] = b;
  }
};

if (!(Konva.Filters as Record<string, typeof Konva.Filters[keyof typeof Konva.Filters]>).TemperatureTint) {
  (Konva.Filters as Record<string, typeof Konva.Filters[keyof typeof Konva.Filters]>).TemperatureTint = TemperatureTintFilter;
}

export function applyTemperatureTintAttributes(
  node: Konva.Image,
  temperature: number = 0,
  tint: number = 0
) {
  node.setAttr('_temperatureAdjustment', temperature);
  node.setAttr('_tintAdjustment', tint);
}
