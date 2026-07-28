"use client";

import type { Failure } from "@/components/request-failed";

/** What one of this app's `/api/*` proxy routes returned. Exactly one field is set. */
export type ProxyResult<T> =
  | { data: T; failure?: undefined }
  | { failure: Failure; data?: undefined };

/**
 * Call a proxy route and unwrap it.
 *
 * Those routes answer in one of three ways, and this collapses them to two: their own error
 * code (`error`), an upstream rejection passed through as data (`ok: false` plus the status
 * Soundlink returned), or the payload — which every campaign resource nests under `data`.
 */
export async function proxyGet<T>(path: string): Promise<ProxyResult<T>> {
  try {
    const res = await fetch(path);
    const json = await res.json();

    if (json?.error) {
      return { failure: { error: json.error, detail: json.detail } };
    }
    if (!json?.ok) {
      return { failure: { upstreamStatus: json?.status } };
    }
    return { data: json.body?.data as T };
  } catch {
    // Network-level failure: the route never answered.
    return { failure: { error: "request_failed" } };
  }
}
