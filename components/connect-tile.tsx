/**
 * Starts the OAuth flow.
 *
 * A plain <a>, not a fetch: /api/oauth/connect responds with a 302 to Soundlink's consent
 * screen, and the browser has to follow that itself. An XHR could not hand the user over.
 *
 * Shaped like an org tile so it sits in the same grid as the organizations it adds — the
 * dashed border is what marks it as the empty slot rather than a connection.
 */
export function ConnectTile() {
  return (
    <a
      href="/api/oauth/connect"
      className="flex w-60 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-neutral-300 p-4 text-neutral-500 transition-colors hover:border-neutral-400 hover:bg-neutral-50 hover:text-neutral-900"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        aria-hidden="true"
        className="size-6"
      >
        <path d="M12 5v14M5 12h14" />
      </svg>
      <span className="text-sm font-medium">Connect organization</span>
    </a>
  );
}
