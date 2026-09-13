"use client";

import { useEffect } from "react";

// Clear an already-open UI after logout in another tab or session expiry.
// This is UX cleanup only; the server independently authorizes every request.
export function SessionGuard() {
  useEffect(() => {
    const channel = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel("sara-auth") : null;
    const leave = () => window.location.replace("/login");
    if (channel) channel.onmessage = leave;
    let pending = false;
    let lastActivity = 0;
    async function check() {
      if (pending || document.visibilityState === "hidden") return;
      pending = true;
      try {
        const response = await fetch("/api/auth/session", { cache: "no-store" });
        if (response.status === 401) leave();
      } catch { /* A network interruption is not a logout. */ }
      finally { pending = false; }
    }
    async function touch() {
      if (document.visibilityState === "hidden" || Date.now() - lastActivity < 60_000) return;
      lastActivity = Date.now();
      try {
        const response = await fetch("/api/auth/session", { method: "POST", cache: "no-store" });
        if (response.status === 401) leave();
      } catch { /* Keep the last server-confirmed expiry during offline use. */ }
    }
    function onActivity(event: Event) { if (event.isTrusted) void touch(); }
    function onVisible() { void check(); if (document.visibilityState === "visible") void touch(); }
    function onSubmit(event: Event) {
      if (event.target instanceof HTMLFormElement && new URL(event.target.action).pathname === "/api/auth/logout") {
        channel?.postMessage("logout");
      }
    }
    const timer = setInterval(() => void check(), 60_000);
    window.addEventListener("pageshow", check);
    document.addEventListener("visibilitychange", onVisible);
    document.addEventListener("pointerdown", onActivity);
    document.addEventListener("keydown", onActivity);
    document.addEventListener("submit", onSubmit);
    return () => {
      clearInterval(timer); channel?.close();
      window.removeEventListener("pageshow", check);
      document.removeEventListener("visibilitychange", onVisible);
      document.removeEventListener("pointerdown", onActivity);
      document.removeEventListener("keydown", onActivity);
      document.removeEventListener("submit", onSubmit);
    };
  }, []);
  return null;
}
