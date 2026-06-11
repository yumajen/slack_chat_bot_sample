/**
 * chat.postMessageを呼び出してSlackにメッセージを投稿する
 * threadTs を指定するとスレッド返信になる
 * 返り値として ts を返す（親投稿時に保存するため）
 *
 * Slack APIのpostMessageの仕様については以下を参照
 * https://docs.slack.dev/reference/methods/chat.postMessage/
 */
function slackChatPost_(
  channel: string,
  text: string,
  threadTs?: string,
): string | null {
  const token = getProp_(PROP.SLACK_BOT_TOKEN);
  if (!token) throw new Error("SLACK_BOT_TOKEN is missing");

  const url = "https://slack.com/api/chat.postMessage";

  const req: {
    channel: string;
    text: string;
    mrkdwn: boolean;
    thread_ts?: string;
  } = {
    channel,
    text,
    mrkdwn: true,
  };
  // threadTsがあればスレッド返信のリクエストになるようにする
  if (threadTs) req.thread_ts = threadTs;

  const res = UrlFetchApp.fetch(url, {
    method: "post",
    contentType: "application/json; charset=utf-8",
    headers: { Authorization: `Bearer ${token}` },
    payload: JSON.stringify(req),
    muteHttpExceptions: true,
  });

  const body = res.getContentText();
  setProp_(PROP.DEBUG_LAST_SLACK, body);

  const data = JSON.parse(body || "{}") as {
    ok?: boolean;
    ts?: string;
    error?: string;
  };
  if (!data.ok) throw new Error(`Slack chat.postMessage failed: ${body}`);

  return data.ts || null;
}
