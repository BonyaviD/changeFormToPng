/** Browser download helpers. */

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  try {
    triggerDownload(url, filename);
  } finally {
    // Revoking immediately can cancel the download in some browsers; one tick
    // is enough for the anchor click to have been processed.
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}

export function downloadDataUrl(dataUrl: string, filename: string) {
  triggerDownload(dataUrl, filename);
}

function triggerDownload(href: string, filename: string) {
  const anchor = document.createElement("a");
  anchor.href = href;
  anchor.download = filename;
  anchor.rel = "noopener";
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
}

/** Characters Windows and macOS reject in filenames. */
const ILLEGAL_FILENAME_CHARS = new Set([
  "\\",
  "/",
  ":",
  "*",
  "?",
  '"',
  "<",
  ">",
  "|",
]);

export function safeFilename(stem: string, extension: string): string {
  const cleaned = Array.from(stem)
    .map((character) => (ILLEGAL_FILENAME_CHARS.has(character) ? "-" : character))
    .join("")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
  return `${cleaned || "certificate"}.${extension}`;
}
