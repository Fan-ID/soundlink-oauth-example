import { buttonClass } from "@/components/ui";

/**
 * Starts the OAuth flow.
 *
 * A plain <a>, not a fetch: /api/oauth/connect responds with a 302 to Soundlink's consent
 * screen, and the browser has to follow that itself. An XHR could not hand the user over.
 */
export function ConnectButton({
  label = "Sign in with Soundlink",
  size = "md",
}: {
  label?: string;
  size?: "sm" | "md";
}) {
  return (
    <a href="/api/oauth/connect" className={buttonClass("primary", size)}>
      {label}
    </a>
  );
}
