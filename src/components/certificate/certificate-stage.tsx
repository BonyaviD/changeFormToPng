"use client";

import { useLayoutEffect, useRef, useState } from "react";

import type { ArtworkContext, CertificateTemplate } from "@/lib/templates/types";
import { cn } from "@/lib/utils";

/**
 * The on-screen preview.
 *
 * The artwork is always laid out at its true design size and then scaled with a
 * single CSS transform, so what you see is the same geometry that gets
 * rasterised — never a reflowed, responsive approximation of it.
 */
export function CertificateStage<TValues>({
  template,
  values,
  context = {},
  className,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  template: CertificateTemplate<any>;
  values: TValues;
  context?: ArtworkContext;
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0);

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const update = (width: number) => setScale(width / template.size.width);
    update(container.clientWidth);

    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width;
      if (width) update(width);
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, [template.size.width]);

  const Artwork = template.Artwork;

  return (
    <div
      ref={containerRef}
      // The artwork owns its own direction; pinning the stage to LTR keeps the
      // transform origin predictable whatever the surrounding page does.
      dir="ltr"
      className={cn("w-full overflow-hidden", className)}
      style={{ height: scale ? template.size.height * scale : undefined }}
    >
      {scale > 0 ? (
        <div
          style={{
            width: template.size.width,
            height: template.size.height,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
          }}
        >
          <Artwork values={values} context={context} />
        </div>
      ) : null}
    </div>
  );
}
