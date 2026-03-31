/**
 * GASプロパティに指定のキーで値を保存する
 */
function setProp_(key: string, value: unknown): void {
  PropertiesService.getScriptProperties().setProperty(key, String(value));
}

/**
 * GASプロパティから指定のキーの値を取得する
 */
function getProp_(key: string): string | null {
  return PropertiesService.getScriptProperties().getProperty(key);
}

/**
 * Slack Events APIのリクエストを処理するエントリポイント
 */
function doPost(
  e: GoogleAppsScript.Events.DoPost,
): GoogleAppsScript.Content.TextOutput {
  const raw = e?.postData?.contents ?? "";
  let payload: SlackEventCallbackPayload;

  try {
    payload = JSON.parse(raw) as SlackEventCallbackPayload;
  } catch {
    setProp_("DEBUG_LAST_BAD_JSON", raw);
    return ok_();
  }

  // Slack URL verification
  if (payload.type === "url_verification") {
    // challenge は url_verification のときに来る（型はゆるく扱う）
    const challenge =
      (payload as unknown as { challenge?: string }).challenge ?? "";
    return ContentService.createTextOutput(challenge);
  }

  // We only handle Events API callbacks
  if (payload.type !== "event_callback") {
    return ok_();
  }

  const event = payload.event;
  // eventがない場合は何もしない
  if (!event) return ok_();
  const slackEvent = event;
  const targetChannelId = getProp_("TARGET_CHANNEL_ID");

  // Debug snapshot (proof it arrived)
  setProp_(
    "DEBUG_LAST_EVENT",
    JSON.stringify({
      envelope_type: payload.type,
      event_id: payload.event_id,
      event_type: slackEvent.type,
      channel: slackEvent.channel,
      text: slackEvent.text,
      ts: slackEvent.ts,
      thread_ts: slackEvent.thread_ts,
      subtype: slackEvent.subtype,
      bot_id: slackEvent.bot_id,
    }),
  );

  // Channel guard
  if (!targetChannelId || event.channel !== targetChannelId) return ok_();

  // Prevent loops: ignore bot messages / bot events
  if (event.bot_id) return ok_();
  // ignore many message subtypes safely（必要なら増やす）
  if (event.subtype && event.subtype !== "thread_broadcast") return ok_();

  // Deduplicate Slack retries (same event_id can be delivered multiple times)
  if (payload.event_id && isDuplicateEvent_(payload.event_id)) return ok_();
  if (payload.event_id) rememberEvent_(payload.event_id);

  // Dispatch
  if (event.type === "app_mention") {
    handleMention_(event);
    return ok_();
  }

  if (event.type === "message") {
    handleMessage_(event);
    return ok_();
  }

  return ok_();
}

/**
 * イベントの重複を検出して記憶するためのヘルパー
 */
function isDuplicateEvent_(eventId: string): boolean {
  const s = getProp_("SEEN_EVENT_IDS") || "";
  if (!s) return false;
  const arr = s.split(",").filter(Boolean);
  return arr.includes(eventId);
}

function rememberEvent_(eventId: string): void {
  const max = Number(getProp_("SEEN_EVENT_IDS_MAX") || "50");
  const s = getProp_("SEEN_EVENT_IDS") || "";
  const arr = s ? s.split(",").filter(Boolean) : [];
  arr.push(eventId);

  // keep last max
  const trimmed = arr.slice(Math.max(0, arr.length - max));
  setProp_("SEEN_EVENT_IDS", trimmed.join(","));
}
