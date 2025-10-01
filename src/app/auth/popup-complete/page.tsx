"use client";

import { useEffect } from "react";

export default function PopupComplete() {
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const next = params.get('next') || undefined;
      // Inform opener that auth flow finished successfully
      if (window.opener) {
        window.opener.postMessage({ type: "auth:popup-complete", next }, window.location.origin);
      }
    } catch {}
    // Close the popup shortly after
    const t = setTimeout(() => {
      try { window.close(); } catch {}
    }, 100);
    return () => clearTimeout(t);
  }, []);

  return null;
}


