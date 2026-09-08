import localFont from "next/font/local";

/**
 * Fonts are self-hosted through `next/font/local`, which fingerprints them and
 * serves them from the app's own origin. That matters twice over: the UI never
 * depends on what is installed on the machine, and the certificate rasteriser
 * can inline the exact same files into every snapshot.
 */

/**
 * The interface face. Vazirmatn is a variable Persian sans built for screen
 * text — the certificate's calligraphic faces are beautiful on the document and
 * unreadable in a form label, so the two roles use different families.
 */
export const uiFont = localFont({
  src: [
    {
      path: "../fonts/Vazirmatn-arabic.woff2",
      weight: "100 900",
      style: "normal",
    },
    {
      path: "../fonts/Vazirmatn-latin.woff2",
      weight: "100 900",
      style: "normal",
    },
  ],
  variable: "--font-ui",
  display: "swap",
  adjustFontFallback: false,
  fallback: ["Tahoma", "Segoe UI", "sans-serif"],
});

/**
 * The certificate face. Only the regular weight is declared on purpose: the
 * family ships no bold cut, and letting the browser synthesise one is exactly
 * how the emphasised names on the original certificate were produced.
 */
export const nastaliqFont = localFont({
  src: [{ path: "../fonts/IranNastaliq.ttf", weight: "400", style: "normal" }],
  variable: "--font-nastaliq",
  display: "block",
  adjustFontFallback: false,
  fallback: ["serif"],
});

/**
 * The certificate body face. A classical Naskh reads as formal on a document
 * and, unlike Nastaliq, stays legible at the sizes a name and a national ID are
 * printed at — so the two share the certificate: Nastaliq for the headings,
 * this for everything that has to be read.
 */
export const naskhFont = localFont({
  src: [
    { path: "../fonts/Amiri-arabic-400.woff2", weight: "400", style: "normal" },
    { path: "../fonts/Amiri-arabic-700.woff2", weight: "700", style: "normal" },
    { path: "../fonts/Amiri-latin-400.woff2", weight: "400", style: "normal" },
  ],
  variable: "--font-naskh",
  display: "block",
  adjustFontFallback: false,
  fallback: ["serif"],
});
