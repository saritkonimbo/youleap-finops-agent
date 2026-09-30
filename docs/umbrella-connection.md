# Umbrella runtime connection

The Claude connector and this service have separate OAuth sessions. Never export
Claude cookies or tokens.

## First connection

Run on the machine that will hold the agent's credentials, using a browser on
that same machine:

1. Install Node 20+ and clone this repository.
2. Run `npm ci`.
3. Run `npm run umbrella:connect`.
4. Open the authorization URL printed by the command.
5. Sign in to Umbrella and approve access. The browser returns to
   `http://127.0.0.1:8787/callback`; leave the command running until it confirms success.
6. Run `npm run umbrella:tools` to read the actual server schemas.
7. Run `npm run umbrella:accounts` to verify account discovery.

Slack credentials are not needed for these commands. A remote/headless server
requires a localhost port tunnel to the browser's machine before step 3; do not
start this flow inside ChatGPT and expect a browser on another computer to reach
the callback.

The default token file is `.auth/umbrella.json` (ignored by Git). Its directory
is owner-only and the file is mode 0600. Use `UMBRELLA_AUTH_FILE` to point to a
private persistent volume on the runtime host. This file includes credentials:
never paste it into chat, commit it, or include it in diagnostics. The SDK
handles refresh after an authentication challenge. If reauthorization is
required, the noninteractive client fails and asks for a new connect run.

## Verified vs pending

- Public endpoint returned a Bearer challenge; OAuth metadata advertises
  dynamic registration, authorization code, refresh token, and S256 PKCE.
- Local type checking and read-tool/argument tests cover the new client.
- Account authorization and authenticated tools/list are pending user consent.
- The uploaded Claude inventory is a reference, not authoritative raw schema.
  Runtime tools/list provides the actual names and required properties.
- Cost results remain raw MCP content until a real response has been inspected.
  No guessed financial normalization has been added to the Slack adapter.
- The budgets tool is rejected if its live required properties are inconsistent.

## Read boundary

`src/umbrella/mcp.ts` permits an explicit subset of reading tools and encodes
arguments as strings, including JSON text for objects and arrays. Logout is
excluded. Cost queries request options before filtering/grouping. The caller
must inspect returned option values before selecting dimensions. Internal
accountKey and divisionId come from account discovery, not AWS account numbers.

References:
- https://docs.umbrellacost.io/docs/umbrella-cost-mcp
- https://mcp.umbrellacost.io/.well-known/oauth-authorization-server
