# YouLeap FinOps Agent

Internal FinOps copilot that lets authorized users ask cloud-cost questions from Slack and receive answers backed by Umbrella Cost.

## Current cloud route: n8n → Claude Routine

For the user's cloud-only setup, the importable workflow in
[integrations/n8n](integrations/n8n/README-he.md) forwards a new private Slack
message to the existing Claude Routine's API trigger. Claude uses its connected
Umbrella and Slack MCPs and answers in the source thread. The standalone Node
bot below is an alternative scaffold, not the runtime used by this route.

The workflow includes durable PostgreSQL dispatch deduplication, an updated
routine prompt, a Slack app manifest, setup instructions, and tested filters.
It has not been installed or verified end-to-end on the user's n8n instance.

## Goal

Slack question → controlled FinOps tool → Umbrella Cost → analysis → Slack thread response.

The design is intentionally read-only first. The model never receives Umbrella credentials and never constructs unrestricted provider requests.

## MVP capabilities

- Current spend for a date range
- Compare two periods and calculate delta / delta %
- Cost by service
- Cost by linked account
- Budgets
- Recommendations
- Private/allowlisted Slack channels
- Threaded responses
- Audit-friendly provider boundary

## Architecture

```text
Slack private channel / DM
          |
          v
   Slack Bolt app
          |
          v
 Intent + FinOps tools
 (allowlisted methods)
          |
          v
 UmbrellaProvider adapter
      /          \
     v            v
Umbrella MCP   Umbrella REST API
     |
     v
Cost & Usage / Budgets / Recommendations
```

## Security principles

1. Read-only MVP.
2. Secrets only through environment/runtime secret storage; never Git.
3. Slack access restricted with `FINOPS_ALLOWED_CHANNEL_IDS`.
4. LLM/agent calls only explicit methods in `FinOpsTools`; no arbitrary Umbrella URL, SQL, or request generation.
5. Financial answers must include date range, currency and source.
6. Later: log request metadata and tool calls without storing secrets.

## Local setup

1. Install Node.js 20+.
2. Copy `.env.example` to `.env`.
3. Create a Slack app and configure Socket Mode.
4. Add bot/app credentials to `.env`.
5. Add the allowed private Slack channel ID(s).
6. Configure the Umbrella connection after confirming the account's supported authentication path.
7. Run:

```bash
npm install
npm run dev
```

## Slack app requirements

Recommended MVP scopes/events:

- Bot scope: `app_mentions:read`
- Bot scope: `chat:write`
- Event subscription: `app_mention`
- Socket Mode enabled
- App-level token with `connections:write`

Invite the bot only to the private FinOps channel(s) that should be able to query cost data.

## Umbrella connection

The adapter lives in `src/finops/umbrella.ts`.

Preferred order:

1. Umbrella MCP when the organization's account/authentication supports the required read-only cost tools.
2. Umbrella REST API as fallback for detailed/advanced cost queries.

Do not hardcode tokens. Configure credentials in runtime secrets/environment variables.

## Tool contract

The first allowlisted operations are:

- `getCost()`
- `comparePeriods()`
- `getCostByService()`
- `getCostByAccount()`
- `getRecommendations()`
- `getBudgets()`

Next planned operations:

- cost by region
- cost by resource/tag
- anomaly drill-down
- AI cost/provider/model analysis
- management report export

## Example Slack questions

- כמה עלה לנו AWS החודש לעומת החודש שעבר?
- איזה service קפץ הכי הרבה השבוע?
- תפרק לי את העלות לפי account.
- איפה יש recommendations לחיסכון?
- האם אנחנו חורגים מה-budget?
- תוציא סיכום הנהלה של החודש.

## Current status

Repository scaffold: ready.

Slack transport: scaffolded.

Umbrella MCP transport and standalone OAuth connection command: implemented.
User authorization, authenticated schema discovery and financial response mapping: pending.

See [Umbrella connection instructions](docs/umbrella-connection.md).
Run `npm run umbrella:connect` on the runtime host; Slack credentials are not required.

Natural-language intent/LLM layer: intentionally pending until the data connection is verified, so the agent cannot fabricate financial results.

## Next steps

1. Confirm/connect Umbrella MCP or REST API authentication.
2. Validate one real read-only cost query against the account.
3. Map returned fields into `CostResult`.
4. Add intent routing from Hebrew/English Slack questions to allowlisted tools.
5. Format answers with totals, period comparison and top drivers.
6. Add tests and deployment.
7. Add proactive anomaly/report workflows after interactive querying is stable.
