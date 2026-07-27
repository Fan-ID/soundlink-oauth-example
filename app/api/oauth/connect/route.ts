import { NextResponse } from "next/server";
import { buildAuthorizeUrl } from "@/lib/oauth/client";
import { getOAuthConfig } from "@/lib/oauth/config";
import {
  generateCodeChallenge,
  generateCodeVerifier,
  generateState,
} from "@/lib/oauth/pkce";
import { setPkceCookie } from "@/lib/store/pkce-cookie";

export async function GET() {
  try {
    const config = getOAuthConfig();
    const state = generateState();
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = generateCodeChallenge(codeVerifier);

    await setPkceCookie({ state, codeVerifier }, config.sessionSecret);

    return NextResponse.redirect(
      buildAuthorizeUrl(config, { state, codeChallenge }),
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "connect_failed";
    // Never log client secrets; config errors are safe to surface.
    console.error("[oauth/connect]", message);
    return NextResponse.redirect(
      new URL(
        `/?error=${encodeURIComponent("connect_failed")}`,
        process.env.APP_BASE_URL ?? "http://localhost:3005",
      ),
    );
  }
}
