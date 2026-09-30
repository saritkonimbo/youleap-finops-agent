const original = $('Claim message').first().json;
return $input.all().map((item, index) => {
  const result = item.json;
  const code = Number(result.statusCode || 0);
  let body = result.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { body = {}; }
  }
  const accepted = code >= 200 && code < 300 && body?.type === 'routine_fire' &&
    typeof body.claude_code_session_id === 'string' && body.claude_code_session_id.startsWith('session_');
  // A timeout or server error may occur AFTER the routine started.
  // Do not repeat an ambiguous POST automatically.
  const status = accepted ? 'accepted' : code >= 400 && code < 500 ? 'rejected' : 'uncertain';
  return {
    json: {
      event_key: original.event_key,
      status,
      http_status: code || null,
      session_id: accepted ? body.claude_code_session_id : null,
      session_url: accepted ? body.claude_code_session_url || null : null,
      error_summary: accepted ? null : 'Routine fire ' + status + '; HTTP ' + (code || 'network error'),
    },
    pairedItem: { item: index },
  };
});
