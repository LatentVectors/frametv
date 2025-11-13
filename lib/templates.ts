import { Template, Slot } from "@/types";
import {
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  getMarginPercentX,
  getMarginPercentY,
  getGapPercentX,
  getGapPercentY,
} from "./config";

/**
 * Template 1: Single Image
 * 1 slot covering entire canvas minus margins
 */
const singleImageTemplate: Template = {
  id: "single-image",
  name: "Single Image",
  slots: [
    {
      id: "single-1",
      x: getMarginPercentX(),
      y: getMarginPercentY(),
      width: 100 - getMarginPercentX() * 2,
      height: 100 - getMarginPercentY() * 2,
    },
  ],
};

/**
 * Template 2: Two Images (Wide + Narrow)
 * 2 slots: left wide (2/3 of usable width), right narrow (1/3 of usable width)
 */
const twoImagesTemplate: Template = {
  id: "two-images",
  name: "Two Images",
  slots: [
    {
      id: "two-wide-1",
      x: getMarginPercentX(),
      y: getMarginPercentY(),
      width: ((100 - getMarginPercentX() * 2 - getGapPercentX()) * 2) / 3,
      height: 100 - getMarginPercentY() * 2,
    },
    {
      id: "two-narrow-2",
      x:
        getMarginPercentX() +
        ((100 - getMarginPercentX() * 2 - getGapPercentX()) * 2) / 3 +
        getGapPercentX(),
      y: getMarginPercentY(),
      width: (100 - getMarginPercentX() * 2 - getGapPercentX()) / 3,
      height: 100 - getMarginPercentY() * 2,
    },
  ],
};

/**
 * Template 3: Triptych
 * 3 equal vertical columns
 */
const triptychTemplate: Template = {
  id: "triptych",
  name: "Triptych",
  slots: [
    {
      id: "triptych-1",
      x: getMarginPercentX(),
      y: getMarginPercentY(),
      width: (100 - getMarginPercentX() * 2 - getGapPercentX() * 2) / 3,
      height: 100 - getMarginPercentY() * 2,
    },
    {
      id: "triptych-2",
      x:
        getMarginPercentX() +
        (100 - getMarginPercentX() * 2 - getGapPercentX() * 2) / 3 +
        getGapPercentX(),
      y: getMarginPercentY(),
      width: (100 - getMarginPercentX() * 2 - getGapPercentX() * 2) / 3,
      height: 100 - getMarginPercentY() * 2,
    },
    {
      id: "triptych-3",
      x:
        getMarginPercentX() +
        ((100 - getMarginPercentX() * 2 - getGapPercentX() * 2) / 3) * 2 +
        getGapPercentX() * 2,
      y: getMarginPercentY(),
      width: (100 - getMarginPercentX() * 2 - getGapPercentX() * 2) / 3,
      height: 100 - getMarginPercentY() * 2,
    },
  ],
};

/**
 * Template 4: Wide + Two Stacked Squares
 * Left wide slot, right column with two perfect stacked squares
 * Square size is calculated from vertical space (height - 2*margin - gap) / 2
 * Wide slot width fills remaining horizontal space (width - 2*margin - gap - squareSize)
 */
const wideStackTemplate: Template = {
  id: "wide-stack",
  name: "Wide + Two Stacked Squares",
  slots: (() => {
    const marginX = getMarginPercentX();
    const marginY = getMarginPercentY();
    const gapX = getGapPercentX();
    const gapY = getGapPercentY();

    // Calculate perfect square dimension from vertical space
    // Height minus 2x margin (top and bottom) minus gap (between squares), divided by 2
    const squareHeightPercent = (100 - marginY * 2 - gapY) / 2;
    const squareHeightPixels = (squareHeightPercent / 100) * CANVAS_HEIGHT;
    const squareWidthPercent = (squareHeightPixels / CANVAS_WIDTH) * 100;

    // Calculate wide slot width: width minus 2x margin minus gap minus square width
    const wideWidth = 100 - marginX * 2 - gapX - squareWidthPercent;

    // Total usable height for the wide slot
    const totalUsableHeight = 100 - marginY * 2;

    return [
      {
        id: "wide-stack-wide-1",
        x: marginX,
        y: marginY,
        width: wideWidth,
        height: totalUsableHeight,
      },
      {
        id: "wide-stack-square-2",
        x: marginX + wideWidth + gapX,
        y: marginY,
        width: squareWidthPercent,
        height: squareHeightPercent,
      },
      {
        id: "wide-stack-square-3",
        x: marginX + wideWidth + gapX,
        y: marginY + squareHeightPercent + gapY,
        width: squareWidthPercent,
        height: squareHeightPercent,
      },
    ];
  })(),
};

/**
 * Template 5: Four Squares Grid + Wide Rectangle
 * Two columns of perfect stacked squares on the left, single tall rectangle on the right
 */
const squareGridTemplate: Template = {
  id: "four-square-grid",
  name: "Four Squares + Rectangle",
  slots: (() => {
    const marginX = getMarginPercentX();
    const marginY = getMarginPercentY();
    const gapX = getGapPercentX();
    const gapY = getGapPercentY();

    const totalUsableHeight = 100 - marginY * 2;
    const totalUsableWidth = 100 - marginX * 2;

    const squareHeightPercent = (totalUsableHeight - gapY) / 2;
    const squareHeightPixels = (squareHeightPercent / 100) * CANVAS_HEIGHT;
    const squareWidthPercent = (squareHeightPixels / CANVAS_WIDTH) * 100;

    const squaresBlockWidth = squareWidthPercent * 2 + gapX;
    const rectangleWidth = totalUsableWidth - squaresBlockWidth - gapX;

    return [
      {
        id: "four-grid-square-1",
        x: marginX,
        y: marginY,
        width: squareWidthPercent,
        height: squareHeightPercent,
      },
      {
        id: "four-grid-square-2",
        x: marginX,
        y: marginY + squareHeightPercent + gapY,
        width: squareWidthPercent,
        height: squareHeightPercent,
      },
      {
        id: "four-grid-square-3",
        x: marginX + squareWidthPercent + gapX,
        y: marginY,
        width: squareWidthPercent,
        height: squareHeightPercent,
      },
      {
        id: "four-grid-square-4",
        x: marginX + squareWidthPercent + gapX,
        y: marginY + squareHeightPercent + gapY,
        width: squareWidthPercent,
        height: squareHeightPercent,
      },
      {
        id: "four-grid-rectangle",
        x: marginX + squaresBlockWidth + gapX,
        y: marginY,
        width: rectangleWidth,
        height: totalUsableHeight,
      },
    ];
  })(),
};

/**
 * Template 6: Wide Rectangle + Four Squares Grid
 * Single tall rectangle on the left, two columns of perfect stacked squares on the right
 */
const mirroredSquareGridTemplate: Template = {
  id: "rectangle-four-square-grid",
  name: "Rectangle + Four Squares",
  slots: (() => {
    const marginX = getMarginPercentX();
    const marginY = getMarginPercentY();
    const gapX = getGapPercentX();
    const gapY = getGapPercentY();

    const totalUsableHeight = 100 - marginY * 2;
    const totalUsableWidth = 100 - marginX * 2;

    const squareHeightPercent = (totalUsableHeight - gapY) / 2;
    const squareHeightPixels = (squareHeightPercent / 100) * CANVAS_HEIGHT;
    const squareWidthPercent = (squareHeightPixels / CANVAS_WIDTH) * 100;

    const squaresBlockWidth = squareWidthPercent * 2 + gapX;
    const rectangleWidth = totalUsableWidth - squaresBlockWidth - gapX;

    return [
      {
        id: "rect-four-grid-rectangle",
        x: marginX,
        y: marginY,
        width: rectangleWidth,
        height: totalUsableHeight,
      },
      {
        id: "rect-four-grid-square-1",
        x: marginX + rectangleWidth + gapX,
        y: marginY,
        width: squareWidthPercent,
        height: squareHeightPercent,
      },
      {
        id: "rect-four-grid-square-2",
        x: marginX + rectangleWidth + gapX,
        y: marginY + squareHeightPercent + gapY,
        width: squareWidthPercent,
        height: squareHeightPercent,
      },
      {
        id: "rect-four-grid-square-3",
        x: marginX + rectangleWidth + gapX + squareWidthPercent + gapX,
        y: marginY,
        width: squareWidthPercent,
        height: squareHeightPercent,
      },
      {
        id: "rect-four-grid-square-4",
        x: marginX + rectangleWidth + gapX + squareWidthPercent + gapX,
        y: marginY + squareHeightPercent + gapY,
        width: squareWidthPercent,
        height: squareHeightPercent,
      },
    ];
  })(),
};

/**
 * Array of all available templates
 */
export const templates: Template[] = [
  singleImageTemplate,
  twoImagesTemplate,
  triptychTemplate,
  wideStackTemplate,
  squareGridTemplate,
  mirroredSquareGridTemplate,
];

/**
 * Get a template by its ID
 * @param id - Template ID
 * @returns Template if found, undefined otherwise
 */
export function getTemplateById(id: string): Template | undefined {
  return templates.find((template) => template.id === id);
}

/**
 * Get the default template (Single Image)
 */
export function getDefaultTemplate(): Template {
  return singleImageTemplate;
}
