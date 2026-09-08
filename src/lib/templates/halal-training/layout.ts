import type { CanvasSize } from "../types";

/**
 * Every coordinate of the certificate, in design pixels on a fixed canvas.
 *
 * The old markup positioned things with negative `top` offsets stacked on top
 * of flow layout, which meant a long name could shove the signature off the
 * page. Here each element is placed absolutely against the canvas, so the
 * output is stable no matter what the data looks like, and nudging an element
 * is a one-number edit.
 *
 * Two typefaces share the document: Nastaliq for the two headings, and a Naskh
 * for everything meant to be read. Their metrics are nothing alike — Nastaliq
 * needs roughly three times the leading — so the line heights below are set per
 * block rather than inherited.
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
} as const;

/** Printed under both side logos. */
export const ORGANISATION = "سازمان غذا و دارو";

/**
 * The three header blocks.
 *
 * The central emblem is a raster that already contains its own two lines of
 * text. Scanning that file's ink shows the graphic occupying design y 97-153
 * and the text 157-202, so the side logos are sized to end where the emblem
 * graphic does and the captions are set to land on the emblem's own two lines.
 * That is what makes the header read as one row rather than three unrelated
 * stacks.
 */
export const HEADER = {
  /** Horizontal centre of each of the three header blocks. */
  columns: { right: 908, centre: 575, left: 252 },
  logoTop: 96,
  fdaLogoWidth: 58,
  halalLogoWidth: 47,
  emblem: { top: 88, width: 200 },
  /** Second line under the left logo. The right one is per-certificate. */
  halalUnit: "مرکز تحقیقات حلال جمهوری اسلامی ایران",
  captionWidth: 330,
  captionTop: 158,
  captionLineHeight: 22,
  captionFontSize: 16,
} as const;

export const TITLE_BLOCK = {
  /** Centred on the canvas so it sits directly beneath the national emblem. */
  centreX: 575,
  top: 258,
  lineGap: 72,
  fontSize: 27,
  width: 380,
} as const;

/**
 * Serial and issue date sit in the left third, clear of the centred title block
 * above them (title spans x 385-765, this one x 80-390).
 */
export const META_BLOCK = {
  centreX: 235,
  /*
   * Nastaliq sits low in a very tall line box, so matching this Naskh block to
   * the title beside it is not a matter of sharing a `top`. These values put
   * the two rendered lines on the same optical baselines as «بسم تعالی» and
   * the heading under it.
   */
  top: 256,
  lineGap: 69,
  fontSize: 21,
  lineHeight: 34,
  width: 310,
} as const;

/**
 * The body is vertically centred inside a fixed box rather than anchored to a
 * baseline, so a long course title that wraps to a further line grows evenly in
 * both directions instead of colliding with the signature.
 */
export const BODY = {
  x: 118,
  top: 406,
  width: 914,
  height: 210,
  fontSize: 26,
  lineHeight: 52,
} as const;

export const SIGNATURE = {
  /** Horizontal centre when a single signature is printed. */
  soloCentreX: 575,
  /**
   * Centres of the two blocks when a second signatory is added. At 400 wide
   * they occupy x 620-1020 and 130-530, so the longest signatory title still
   * leaves a clear gap between them.
   */
  dualCentreX: { primary: 820, secondary: 330 },
  blockWidth: 400,
  nameTop: 664,
  nameFontSize: 22,
  nameLineHeight: 32,
  titleTop: 698,
  titleFontSize: 18,
  titleLineHeight: 28,
} as const;

/**
 * The signature mark.
 *
 * Signature scans are mostly transparent sheet, so sizing the `<img>` by its
 * own dimensions positions the file rather than the strokes — which is how the
 * signature ended up printed across the last line of the body text. Every
 * signature is therefore stored cropped to its ink (the bundled scan went from
 * 3464x3464 to 1389x2067, and uploads are cropped the same way), and the mark
 * is placed by its centre at a fixed height, letting the image's own aspect
 * ratio decide the width.
 */
export const SIGNATURE_INK = {
  /** Height of the ink, before rotation. */
  height: 138,
  rotation: 60,
  /** Centre of the mark; it deliberately overlaps the printed name. */
  centreY: 640,
} as const;
