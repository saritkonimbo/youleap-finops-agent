# Architecture Decisions

## ADR-001 — Read-only FinOps tool boundary

**Decision:** Slack/LLM code may not call Umbrella directly. It must use `FinOpsTools`.

**Why:** Cost data is financially sensitive. Explicit methods make permissions, validation, audit logs and tests predictable.

## ADR-002 — MCP first, API fallback

**Decision:** Prefer Umbrella MCP for agent-native access when available for the required operation. Keep a provider adapter so REST endpoints can cover advanced queries without changing Slack/agent code.

## ADR-003 — Private Slack surface

**Decision:** Start with a dedicated private channel and an allowlist of channel IDs. The bot answers in threads.

## ADR-004 — No financial hallucinations

**Decision:** The assistant must not estimate or invent account costs when provider data is unavailable. Failed/partial provider queries are surfaced as unavailable/incomplete.

## ADR-005 — Secrets outside Git

**Decision:** Slack/Umbrella credentials are runtime secrets only. `.env` is ignored; only placeholders are committed.
