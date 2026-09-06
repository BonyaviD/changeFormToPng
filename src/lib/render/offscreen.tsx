"use client";

import type { ReactElement } from "react";
import { createRoot } from "react-dom/client";

/**
 * Mounts a React tree off-screen at its natural size, hands the resulting DOM
 * node to a callback, then tears it down.
 *
 * Capturing the visible preview directly would bake its CSS scale into the
 * output, so the snapshot always comes from a throwaway, untransformed copy.
 * The node lives in the real document, so it inherits the app's fonts and CSS
 * variables — which is what makes the capture match what the user sees.
 */
export async function withOffscreenRender<T>(
  element: ReactElement,
  run: (node: HTMLElement) => Promise<T>,
): Promise<T> {
  const host = document.createElement("div");
  host.setAttribute("aria-hidden", "true");
  Object.assign(host.style, {
    position: "fixed",
    top: "0px",
    left: "-200vw",
    zIndex: "-1",
    pointerEvents: "none",
  });
  document.body.appendChild(host);

  const root = createRoot(host);
  try {
    root.render(element);
    const node = await waitForFirstChild(host);
    return await run(node);
  } finally {
    // Unmounting synchronously from inside a React lifecycle is illegal, and
    // this helper is always called from an event handler, so a macrotask hop
    // keeps it safe in every caller.
    setTimeout(() => {
      root.unmount();
      host.remove();
    }, 0);
  }
}

const MAX_FRAMES = 120;

async function waitForFirstChild(host: HTMLElement): Promise<HTMLElement> {
  for (let frame = 0; frame < MAX_FRAMES; frame += 1) {
    const child = host.firstElementChild;
    if (child instanceof HTMLElement) {
      // One more frame so layout and style resolution have settled.
      await nextFrame();
      return child;
    }
    await nextFrame();
  }
  throw new Error("رندر گواهی در زمان مجاز کامل نشد.");
}

function nextFrame(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}
