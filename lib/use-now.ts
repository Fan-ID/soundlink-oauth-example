"use client";

import { useSyncExternalStore } from "react";

/**
 * A once-per-second clock shared by every subscriber.
 *
 * Exposed through `useSyncExternalStore` rather than `useState` + `useEffect` so that
 * the server snapshot is explicit: it returns 0, meaning "no clock yet", which keeps
 * server and first client render identical and avoids a hydration mismatch on
 * time-dependent text.
 */
const listeners = new Set<() => void>();
let intervalId: ReturnType<typeof setInterval> | null = null;
let nowMs = 0;

function subscribe(onChange: () => void): () => void {
  listeners.add(onChange);
  if (intervalId === null) {
    nowMs = Date.now();
    intervalId = setInterval(() => {
      nowMs = Date.now();
      for (const listener of listeners) listener();
    }, 1000);
  }
  return () => {
    listeners.delete(onChange);
    if (listeners.size === 0 && intervalId !== null) {
      clearInterval(intervalId);
      intervalId = null;
    }
  };
}

const getSnapshot = () => nowMs;
const getServerSnapshot = () => 0;

/** Current epoch ms, updated every second. `0` before the clock starts. */
export function useNow(): number {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
