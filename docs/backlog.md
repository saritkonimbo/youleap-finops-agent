# MVP Backlog

## P0 — Data connection
- [ ] Confirm Umbrella MCP authentication available to the YouLeap account
- [ ] If needed, create/read Umbrella API credentials with least privilege
- [ ] Execute a real read-only Cost & Usage query
- [ ] Normalize response into `CostResult`
- [ ] Validate currency/date/granularity semantics

## P0 — Slack
- [ ] Create Slack app
- [ ] Enable Socket Mode
- [ ] Add `app_mentions:read` and `chat:write`
- [ ] Subscribe to `app_mention`
- [ ] Invite app to private FinOps channel
- [ ] Set allowed channel ID

## P0 — Agent
- [ ] Hebrew + English intent routing
- [ ] Date phrase resolution: היום / השבוע / החודש / חודש שעבר
- [ ] Tool allowlist only
- [ ] Response provenance: period + currency + data source
- [ ] Graceful no-data/error response

## P1 — Analysis
- [ ] Top cost drivers
- [ ] Period-over-period changes
- [ ] Drill-down service → account → region/resource/tag
- [ ] Recommendations summary
- [ ] Budget status
- [ ] AI cost analysis

## P1 — Operations
- [ ] Tests
- [ ] Structured audit logs
- [ ] Health endpoint
- [ ] Deployment
- [ ] Secret manager
- [ ] Rate limiting

## P2 — Proactive FinOps
- [ ] Daily anomaly digest
- [ ] Weekly management summary
- [ ] Budget threshold alerts
- [ ] CSV/PDF report export
