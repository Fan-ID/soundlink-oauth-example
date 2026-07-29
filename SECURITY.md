# Security Policy

This repository is a **reference / demo** application for Soundlink OAuth integration.
It is not production authentication infrastructure. Do not deploy it as-is to handle real
customer traffic without replacing the in-memory token store and hardening session secrets.

## Reporting a vulnerability

If you discover a security issue in this example or in Soundlink's OAuth/API surface, email
**[hello@getsoundlink.com](mailto:hello@getsoundlink.com)** (or contact your Soundlink partner
manager) with enough detail to reproduce the issue. Avoid posting secrets or exploit details
in public GitHub issues.

## Demo limitations (intentional)

- Access tokens are held in an **in-memory** server store and are lost on process restart.
- `SESSION_SECRET` falls back to a known development default if unset — never rely on that
  outside local development.
- There are no refresh tokens; see the README and partner OAuth guide for the intended
  Authorization Code + Client Credentials pattern.
