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

const MAX_TICKS = 120;
/**
 * Browsers stop firing `requestAnimationFrame` in a backgrounded tab, so an
 * export started just before the user switches away would never progress. Every
 * wait races the frame callback against a timer, which keeps ticking.
 */
const TICK_FALLBACK_MS = 32;

async function waitForFirstChild(host: HTMLElement): Promise<HTMLElement> {
  for (let tick = 0; tick < MAX_TICKS; tick += 1) {
    const child = host.firstElementChild;
    if (child instanceof HTMLElement) {
      // One more tick so layout and style resolution have settled.
      await nextTick();
      return child;
    }
    await nextTick();
  }
  throw new Error("رندر گواهی در زمان مجاز کامل نشد.");
}

function nextTick(): Promise<void> {
  return new Promise((resolve) => {
    let settled = false;
    const done = () => {
      if (settled) return;
      settled = true;
      resolve();
    };
    requestAnimationFrame(done);
    setTimeout(done, TICK_FALLBACK_MS);
  });
}
