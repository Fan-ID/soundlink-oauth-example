function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

export function getOAuthConfig() {
  return {
    /** Frontend origin — browser authorize BFF (`/api/oauth/authorize`). */
    baseUrl: (
      process.env.SOUNDLINK_BASE_URL ?? "https://getsoundlink.com"
    ).replace(/\/$/, ""),
    /** API origin — token + userinfo (`/api/v1/oauth/...`). */
    apiBaseUrl: (
      process.env.SOUNDLINK_API_BASE_URL ?? "https://api.getsoundlink.com"
    ).replace(/\/$/, ""),
    clientId: required("SOUNDLINK_CLIENT_ID"),
    clientSecret: required("SOUNDLINK_CLIENT_SECRET"),
    redirectUri: required("SOUNDLINK_REDIRECT_URI"),
    scopes: (
      process.env.SOUNDLINK_SCOPES ?? "openid email campaigns:read metrics:read"
    ).trim(),
    appBaseUrl: (
      process.env.APP_BASE_URL ?? "http://localhost:3005"
    ).replace(/\/$/, ""),
    sessionSecret:
      process.env.SESSION_SECRET?.trim() ||
      "dev-only-change-me-session-secret",
  };
}

export type OAuthConfig = ReturnType<typeof getOAuthConfig>;
