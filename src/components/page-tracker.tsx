"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

function getSessionId(): string {
  const key = "nipoai-sid";
  let sid = sessionStorage.getItem(key);
  if (!sid) {
    sid = crypto.randomUUID();
    sessionStorage.setItem(key, sid);
  }
  return sid;
}

export function PageTracker() {
  const pathname = usePathname();
  const lastPath = useRef<string | null>(null);

  useEffect(() => {
    // Skip duplicate fires for same path
    if (pathname === lastPath.current) return;
    lastPath.current = pathname;

    try {
      const sessionId = getSessionId();
      const referrer = document.referrer || undefined;

      // Fire-and-forget beacon
      const payload = JSON.stringify({ sessionId, path: pathname, referrer });

      if (navigator.sendBeacon) {
        navigator.sendBeacon(
          "/api/track",
          new Blob([payload], { type: "application/json" }),
        );
      } else {
        fetch("/api/track", {
          method: "POST",
          body: payload,
          headers: { "Content-Type": "application/json" },
          keepalive: true,
        });
      }
    } catch {
      // Tracking must never break the app
    }
  }, [pathname]);

  return null;
}
