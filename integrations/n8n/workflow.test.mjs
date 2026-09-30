import { readFileSync } from 'node:fs';
import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { PGlite } from '@electric-sql/pglite';

const root = new URL('./', import.meta.url);
const read = name => readFileSync(new URL(name, root), 'utf8');
const workflow = JSON.parse(read('youleap-finops-slack-to-claude.json'));
const getNode = name => workflow.nodes.find(node => node.name === name);
const filter = new Function('$input', getNode('Filter human messages').parameters.jsCode);
const classify = new Function('$input', '$', getNode('Classify API response').parameters.jsCode);
const message = {
  type: 'message', channel: 'C0C5HBL3USJ', user: 'U9MGNGP4G',
  ts: '1790753400.000123', text: 'מה עלות AWS החודש?',
};
const runFilter = event => filter({ all: () => [{ json: event }] });

test('channel and author boundaries, bot/system/automatic reply suppression', () => {
  for (const event of [
    { ...message, channel: 'OTHER' },
    { ...message, user: 'OTHER' },
    { ...message, bot_id: 'BOT' },
    { ...message, app_id: 'APP' },
    { ...message, subtype: 'channel_join' },
    { ...message, subtype: 'message_changed' },
    { ...message, text: '— 🤖 YouLeap FinOps (אוטומטי)' },
    { ...message, text: '  ' },
    { ...message, ts: 'invalid' },
    { ...message, thread_ts: 'invalid' },
    { ...message, type: 'reaction_added' },
  ]) assert.equal(runFilter(event).length, 0);
  for (const user of ['U9MGNGP4G', 'U0AT5PLUS5R', 'U0KABL7ML']) {
    assert.equal(runFilter({ ...message, user }).length, 1);
  }
});

test('thread replies preserve root and unique event; message text is not forwarded', () => {
  const output = runFilter({ ...message, thread_ts: '1790753300.000100' })[0].json;
  const context = JSON.parse(output.payload.text);
  assert.equal(context.thread_ts, '1790753300.000100');
  assert.equal(context.message_ts, message.ts);
  assert.equal(context.event_key, 'C0C5HBL3USJ:' + message.ts);
  assert.equal(context.message_url, 'https://konimbok.slack.com/archives/C0C5HBL3USJ/p1790753400000123');
  assert.equal(output.payload.text.includes(message.text), false);
  assert.equal(runFilter({ event: message }).length, 1);
});

test('HTTP payload, credential boundary, and disabled POST retries', () => {
  const node = getNode('Fire Claude routine');
  assert.equal(node.retryOnFail, false);
  assert.equal(node.parameters.authentication, 'genericCredentialType');
  assert.equal(node.parameters.genericAuthType, 'httpHeaderAuth');
  assert.equal(node.parameters.options.redirect.redirect.followRedirects, false);
  const expression = node.parameters.jsonBody.slice(3, -2).trim();
  const json = runFilter(message)[0].json;
  const body = new Function('$json', 'return ' + expression)({ payload: json.payload });
  assert.deepEqual(JSON.parse(body), json.payload);
  assert.equal(node.parameters.headerParameters.parameters.some(h => h.name === 'Authorization'), false);
  assert.equal(workflow.active, false);
  for (const connection of Object.values(workflow.connections)) {
    for (const path of connection.main) for (const edge of path) assert.ok(getNode(edge.node));
  }
});

test('API acceptance validates session response, and uncertainty never becomes success', () => {
  const run = response => classify({ all: () => [{ json: response }] },
    () => ({ first: () => ({ json: { event_key: 'event' } }) }))[0].json;
  assert.equal(run({ statusCode: 200, body: JSON.stringify({
    type: 'routine_fire', claude_code_session_id: 'session_123',
    claude_code_session_url: 'https://claude.ai/code/session_123',
  }) }).status, 'accepted');
  assert.equal(run({ statusCode: 200, body: '{}' }).status, 'uncertain');
  assert.equal(run({ statusCode: 503, body: 'unavailable' }).status, 'uncertain');
  assert.equal(run({ error: 'timeout' }).status, 'uncertain');
  assert.equal(run({ statusCode: 401, body: '{}' }).status, 'rejected');
  assert.equal(run({ statusCode: 429, body: '{}' }).status, 'rejected');
});

test('PostgreSQL unique claim and durable outcomes survive duplicate events', async () => {
  const db = new PGlite();
  try {
    await db.exec(read('setup.sql'));
    const claimNode = getNode('Claim message');
    const row = runFilter(message)[0].json;
    const params = [row.event_key, row.channel_id, row.message_ts, row.thread_ts,
      row.user_id, JSON.stringify(row.payload)];
    const first = await db.query(claimNode.parameters.query, params);
    assert.equal(first.rows.length, 1);
    assert.deepEqual(first.rows[0].payload, row.payload);
    const duplicate = await db.query(claimNode.parameters.query, params);
    assert.equal(duplicate.rows.length, 0);
    const updated = await db.query(getNode('Record dispatch result').parameters.query,
      [row.event_key, 'accepted', 'session_123', 'https://claude.ai/code/session_123', 200, null]);
    assert.equal(updated.rows[0].status, 'accepted');
    assert.equal((await db.query(claimNode.parameters.query, params)).rows.length, 0);
    assert.equal((await db.query(getNode('Record dispatch result').parameters.query,
      [row.event_key, 'uncertain', null, null, null, 'timeout'])).rows.length, 0);
    const bad = [...params]; bad[0] = 'OTHER:1'; bad[1] = 'OTHER';
    await assert.rejects(db.query(claimNode.parameters.query, bad));
    const followup = [...params]; followup[0] = 'C0C5HBL3USJ:1790753500.000001';
    followup[2] = '1790753500.000001';
    assert.equal((await db.query(claimNode.parameters.query, followup)).rows.length, 1);
  } finally { await db.close(); }
});
