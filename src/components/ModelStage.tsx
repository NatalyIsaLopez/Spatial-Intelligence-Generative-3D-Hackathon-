"use client";

import { useEffect, useState } from "react";
import type React from "react";

// <model-viewer> is a custom element. React 19 moved the JSX namespace under
// the "react" module, so the augmentation goes there rather than on global JSX.
type ModelViewerProps = React.DetailedHTMLProps<
  React.HTMLAttributes<HTMLElement>,
  HTMLElement
> & {
  src?: string;
  alt?: string;
  poster?: string;
  "camera-controls"?: boolean | "";
  "auto-rotate"?: boolean | "";
  "shadow-intensity"?: string;
  "environment-image"?: string;
  exposure?: string;
};

declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      "model-viewer": ModelViewerProps;
    }
  }
}

const VIEWER_SRC =
  "https://cdn.jsdelivr.net/npm/@google/model-viewer@4.0.0/dist/model-viewer.min.js";

/** Loads the model-viewer module once per page, then renders the GLB. */
export default function ModelStage({
  glbUrl,
  posterUrl,
}: {
  glbUrl: string;
  posterUrl?: string | null;
}) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (customElements.get("model-viewer")) {
      setReady(true);
      return;
    }

    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${VIEWER_SRC}"]`,
    );
    if (existing) {
      existing.addEventListener("load", () => setReady(true), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.type = "module";
    script.src = VIEWER_SRC;
    script.addEventListener("load", () => setReady(true), { once: true });
    document.head.appendChild(script);
  }, []);

  if (!ready) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-neutral-500">
        Loading viewer…
      </div>
    );
  }

  return (
    <model-viewer
      src={glbUrl}
      poster={posterUrl ?? undefined}
      alt="Generated 3D model"
      camera-controls=""
      auto-rotate=""
      shadow-intensity="1"
      exposure="1.1"
      style={{ width: "100%", height: "100%", backgroundColor: "transparent" }}
    />
  );
}
