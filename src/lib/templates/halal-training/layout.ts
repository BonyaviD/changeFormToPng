import type { CanvasSize } from "../types";

/**
 * Every coordinate of the certificate, in design pixels on a fixed canvas.
 *
 * The old markup positioned things with negative `top` offsets stacked on top
 * of flow layout, which meant a long name could shove the signature off the
 * page. Here each element is placed absolutely against the canvas, so the
 * output is stable no matter what the data looks like, and nudging an element
 * is a one-number edit.
 */

export const CANVAS: CanvasSize = { width: 1150, height: 820 };

/**
 * The white area inside the ornamental frame.
 *
 * Measured from the alpha channel of `frame.png`: its transparent interior maps
 * to x 66.6-1083.4, y 65.9-757.6 on this canvas. The paper is inset a couple of
 * pixels inside that so the innermost gold rule of the border stays visible.
 */
export const PAPER = { x: 68, y: 67, width: 1014, height: 689 } as const;

export const ASSETS = {
  frame: "/templates/halal-training/frame.png",
  logoFda: "/templates/halal-training/logo-fda.png",
  logoHalal: "/templates/halal-training/logo-halal.png",
  emblem: "/templates/halal-training/emblem-iran.jpg",
  signature: "/templates/halal-training/signature-rastegar.png",
} as const;

/** The signature that is printed on every certificate of this template. */
export const PRIMARY_SIGNATORY = {
  name: "دکتر حسین رستگار",
  title: "رئیس مرکز تحقیقات حلال جمهوری اسلامی ایران",
} as const;

export const HEADER = {
  /** Horizontal centre of each of the three header blocks. */
  columns: { right: 908, centre: 575, left: 252 },
  logoTop: 92,
  fdaLogoWidth: 78,
  halalLogoWidth: 62,
  emblem: { top: 84, width: 208 },
  captionWidth: 340,
  captionTop: 180,
  captionLineHeight: 34,
  captionFontSize: 25,
} as const;

export const TITLE_BLOCK = {
  /** Centred on the canvas so it sits directly beneath the national emblem. */
  centreX: 575,
  top: 286,
  lineGap: 88,
  fontSize: 26,
  width: 380,
} as const;

/**
 * Serial and issue date sit in the left third, clear of the centred title block
 * above them (title spans x 385-765, this one x 80-390).
 */
export const META_BLOCK = {
  centreX: 235,
  top: 286,
  lineGap: 88,
  fontSize: 25,
  width: 310,
} as const;

/**
 * The body is vertically centred inside a fixed box rather than anchored to a
 * baseline, so a long course title that wraps to a third line grows evenly in
 * both directions instead of colliding with the signature.
 */
export const BODY = {
  x: 105,
  top: 408,
  width: 940,
  height: 244,
  fontSize: 30,
  /**
   * Nastaliq needs a tall line box, but the original's ~86px left no room for a
   * third line before the signature. 78px still clears the descenders and lets
   * a long course title wrap three times without a collision.
   */
  lineHeight: 78,
} as const;

export const SIGNATURE = {
  /** Horizontal centre when a single signature is printed. */
  soloCentreX: 575,
  /** Centres of the two blocks when a second signatory is added. */
  dualCentreX: { primary: 812, secondary: 338 },
  blockWidth: 430,
  nameTop: 676,
  titleTop: 712,
  nameFontSize: 27,
  titleFontSize: 22,
  /** The scanned signature sits behind the name, slightly to its left. */
  image: { width: 300, offsetX: -30, offsetY: -132, rotation: 60 },
} as const;

export const QR = {
  x: 104,
  y: 632,
  size: 92,
  captionTop: 728,
  captionFontSize: 15,
} as const;
