import json
from pathlib import Path

root = Path(__file__).parent
def node(name, kind, version, x, params, **extra):
    return dict(id=name.lower().replace(' ', '-'), name=name,
                type='n8n-nodes-base.' + kind, typeVersion=version,
                position=[x, 300], parameters=params, **extra)

claim = """INSERT INTO youleap_finops.slack_dispatch
  (event_key, channel_id, message_ts, thread_ts, user_id)
VALUES ($1, $2, $3, $4, $5)
ON CONFLICT (event_key) DO NOTHING
RETURNING event_key, $6::jsonb AS payload;"""
record = """UPDATE youleap_finops.slack_dispatch
SET status = $2, session_id = $3, session_url = $4,
    http_status = $5::integer, error_summary = $6, updated_at = now()
WHERE event_key = $1 AND status = 'pending'
RETURNING event_key, status, session_url;"""
nodes = [
    node('Slack message', 'slackTrigger', 1, 0, {
        'trigger': ['message'], 'watchWorkspace': False,
        'channelId': {'__rl': True, 'mode': 'id', 'value': 'C0C5HBL3USJ'},
        'options': {'resolveIds': False}}, webhookId='6f966fd6-117b-4398-a382-7a29c3e1b7c9'),
    node('Filter human messages', 'code', 2, 240, {
        'mode': 'runOnceForAllItems', 'jsCode': (root / 'filter-message.js').read_text()}),
    node('Claim message', 'postgres', 2.6, 480, {
        'operation': 'executeQuery', 'query': claim,
        'options': {'queryReplacement': '={{ [$json.event_key, $json.channel_id, $json.message_ts, $json.thread_ts, $json.user_id, JSON.stringify($json.payload)] }}'}},
        alwaysOutputData=False),
    node('Fire Claude routine', 'httpRequest', 4.2, 720, {
        'method': 'POST',
        'url': 'https://api.anthropic.com/v1/claude_code/routines/trig_01AzDhXfxgA6VciGcWeLWSoc/fire',
        'authentication': 'genericCredentialType',
        'genericAuthType': 'httpHeaderAuth',
        'sendHeaders': True,
        'headerParameters': {'parameters': [
            {'name': 'anthropic-beta', 'value': 'experimental-cc-routine-2026-04-01'},
            {'name': 'anthropic-version', 'value': '2023-06-01'},
            {'name': 'Content-Type', 'value': 'application/json'}]},
        'sendBody': True, 'specifyBody': 'json',
        'jsonBody': '={{ JSON.stringify($json.payload) }}',
        'options': {
            'timeout': 30000,
            'redirect': {'redirect': {'followRedirects': False}},
            'response': {'response': {
                'fullResponse': True, 'neverError': True,
                'responseFormat': 'text', 'outputPropertyName': 'body'}}}},
        retryOnFail=False, onError='continueRegularOutput'),
    node('Classify API response', 'code', 2, 960, {
        'mode': 'runOnceForAllItems', 'jsCode': (root / 'classify-response.js').read_text()}),
    node('Record dispatch result', 'postgres', 2.6, 1200, {
        'operation': 'executeQuery', 'query': record,
        'options': {'queryReplacement': '={{ [$json.event_key, $json.status, $json.session_id, $json.session_url, $json.http_status, $json.error_summary] }}'}}),
    node('Check accepted', 'code', 2, 1440, {
        'mode': 'runOnceForAllItems',
        'jsCode': """const rows = $input.all();
if (!rows.length || rows.some(item => item.json.status !== 'accepted')) {
  throw new Error('Routine was not confirmed started. Review youleap_finops.slack_dispatch and Claude Runs before replaying.');
}
return rows;"""}),
    dict(id='setup-notes', name='Setup notes', type='n8n-nodes-base.stickyNote',
         typeVersion=1, position=[0, -30], parameters={
             'content': '## YouLeap FinOps → Claude Routine\n1. Read README-he.md and apply setup.sql.\n2. Select Slack API (token + signing secret), Postgres and HTTP Header Auth credentials.\n3. Enable API trigger in Claude; replace routine prompt with routine-prompt-he.md.\n4. Verify in a live test before removing the hourly schedule.\nThis workflow dispatches messages; Claude posts the answer via its Slack MCP.\nNo tokens are included in this export.',
             'height': 250, 'width': 720}),
]
pipeline = nodes[:-1]
connections = {
    a['name']: {'main': [[{'node': b['name'], 'type': 'main', 'index': 0}]]}
    for a, b in zip(pipeline, pipeline[1:])
}
workflow = {
    'name': 'YouLeap FinOps — Slack to Claude Routine',
    'nodes': nodes, 'connections': connections, 'active': False,
    'settings': {'executionOrder': 'v1', 'timezone': 'Asia/Jerusalem',
                 'saveDataSuccessExecution': 'none',
                 'saveDataErrorExecution': 'all', 'executionTimeout': 120},
    'pinData': {},
    'meta': {'templateCredsSetupCompleted': False}
}
(root / 'youleap-finops-slack-to-claude.json').write_text(
    json.dumps(workflow, ensure_ascii=False, indent=2) + '\n')
