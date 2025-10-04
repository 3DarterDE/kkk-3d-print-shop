"use client";

import { useEffect } from "react";

export default function PopupComplete() {
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      // Poll /api/auth/me?login=1 to ensure the session is visible to the main window
      try {
        for (let i = 0; i < 10 && !cancelled; i++) {
          const res = await fetch('/api/auth/me?login=1', { cache: 'no-store' });
          const data = await res.json().catch(() => null);
          if (data && data.authenticated) break;
          await new Promise(r => setTimeout(r, 250));
        }
      } catch {}
      // Notify opener and close
      try {
        const params = new URLSearchParams(window.location.search);
        const next = params.get('next') || undefined;
        if (window.opener) {
          window.opener.postMessage({ type: 'auth:popup-complete', next }, window.location.origin);
        }
      } catch {}
      setTimeout(() => { try { window.close(); } catch {} }, 50);
    };
    run();
    return () => { cancelled = true; };
  }, []);

  return null;
}


