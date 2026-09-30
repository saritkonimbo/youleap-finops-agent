// Embedded into the workflow Code node by build-workflow.py.
// Slack Trigger emits the event itself, without the Events API envelope.
const allowedChannel = 'C0C5HBL3USJ';
const allowedUsers = new Set(['U9MGNGP4G', 'U0AT5PLUS5R', 'U0KABL7ML']);
const items = [];
for (const [index, item] of $input.all().entries()) {
  const event = item.json.event || item.json;
  if (event.type !== 'message' || event.channel !== allowedChannel) continue;
  if (event.bot_id || event.app_id || event.hidden) continue;
  if (event.subtype && event.subtype !== 'file_share') continue;
  if (!allowedUsers.has(event.user)) continue;
  const text = typeof event.text === 'string' ? event.text.trim() : '';
  if (!text || text.includes('YouLeap FinOps (אוטומטי)')) continue;
  if (!/^\d+\.\d+$/.test(event.ts || '')) continue;
  const threadTs = event.thread_ts || event.ts;
  if (!/^\d+\.\d+$/.test(threadTs)) continue;
  const context = {
    source: 'youleap-finops-slack',
    channel_id: allowedChannel,
    message_ts: event.ts,
    thread_ts: threadTs,
    user_id: event.user,
    event_key: allowedChannel + ':' + event.ts,
    // The routine reads the authoritative message via Slack; no text is
    // trusted as system instructions or needed in the trigger body.
    message_url: 'https://konimbok.slack.com/archives/' + allowedChannel +
      '/p' + event.ts.replace('.', ''),
  };
  items.push({
    json: { ...context, payload: { text: JSON.stringify(context) } },
    pairedItem: { item: index },
  });
}
return items;
