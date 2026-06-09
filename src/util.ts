// GASのスクリプトプロパティのキー
const PROP = {
  // Vertex AI / Gemini
  GCP_PROJECT_ID: "GCP_PROJECT_ID",
  VERTEX_LOCATION: "VERTEX_LOCATION",
  GEMINI_MODEL: "GEMINI_MODEL",
  // Slack
  SLACK_BOT_TOKEN: "SLACK_BOT_TOKEN",
  TARGET_CHANNEL_ID: "TARGET_CHANNEL_ID",
  // Bot state
  SEEN_EVENT_IDS: "SEEN_EVENT_IDS",
  SEEN_EVENT_IDS_MAX: "SEEN_EVENT_IDS_MAX",
  TODAY_TOPIC_TS_PREFIX: "TODAY_TOPIC_TS_",
  // Debug snapshots
  DEBUG_LAST_BAD_JSON: "DEBUG_LAST_BAD_JSON",
  DEBUG_LAST_EVENT: "DEBUG_LAST_EVENT",
  DEBUG_LAST_GEMINI: "DEBUG_LAST_GEMINI",
  DEBUG_LAST_SLACK: "DEBUG_LAST_SLACK",
  DEBUG_LAST_NG_RESULT: "DEBUG_LAST_NG_RESULT",
} as const;

function setProp_(key: string, value: unknown): void {
  PropertiesService.getScriptProperties().setProperty(key, String(value));
}

function getProp_(key: string): string | null {
  return PropertiesService.getScriptProperties().getProperty(key);
}

function topicTsKey_(): string {
  return `${PROP.TODAY_TOPIC_TS_PREFIX}${todayYmd_()}`;
}

/**
 * 現在日時の年月日を取得し、yyyyMMdd形式で返す関数
 */
function todayYmd_(): string {
  return Utilities.formatDate(new Date(), "Asia/Tokyo", "yyyyMMdd");
}

/**
 * OKを返す関数
 */
function ok_(): GoogleAppsScript.Content.TextOutput {
  return ContentService.createTextOutput("ok").setMimeType(
    ContentService.MimeType.TEXT,
  );
}
