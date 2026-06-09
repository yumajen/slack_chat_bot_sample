function setProp_(key: string, value: unknown): void {
  PropertiesService.getScriptProperties().setProperty(key, String(value));
}

function getProp_(key: string): string | null {
  return PropertiesService.getScriptProperties().getProperty(key);
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
