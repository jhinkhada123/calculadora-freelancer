# Security Notes

## Scope

This project is a static front-end app. There is no backend persistence in this repository.

## Current controls

- Terms acceptance and audit trail are stored in `localStorage` via `compliance.js`.
- Data in `localStorage` is for traceability only and is not legal proof.
- Security headers are configured in `vercel.json` for all routes.
- CSP is enforced by HTTP headers on deploy and has a meta fallback in `index.html`.

## Headers applied on deploy

- `Content-Security-Policy`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `X-Frame-Options: DENY`
- `Permissions-Policy` (camera, microphone, geolocation, payment disabled)
- `Strict-Transport-Security`

## Third-party resources

- Google Fonts (`fonts.googleapis.com`, `fonts.gstatic.com`)
- External network calls are restricted by CSP and app-side validation to HTTPS (localhost HTTP allowed for local testing).

## Sharing and PII

- Link sharing is intended for internal use.
- Including personal names in URLs is opt-in (`Incluir nomes no link`).
- A UI warning is shown before copying links with names.

## Operational guidance

- If compliance data is corrupted in storage, the app safely falls back to default values.
- Prefer serving this project via HTTPS in production.
- If deployed outside Vercel, replicate the same security headers at the edge/server.
