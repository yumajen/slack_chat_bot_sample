"use strict";
/**
 * chat.postMessageを呼び出してSlackにメッセージを投稿する
 * threadTs を指定するとスレッド返信になる
 * 返り値として ts を返す（親投稿時に保存するため）
 *
 * Slack APIのpostMessageの仕様については以下を参照
 * https://docs.slack.dev/reference/methods/chat.postMessage/
 */
function slackChatPost_(channel, text, threadTs) {
    const token = getProp_("SLACK_BOT_TOKEN");
    if (!token)
        throw new Error("SLACK_BOT_TOKEN is missing");
    const url = "https://slack.com/api/chat.postMessage";
    const req = {
        channel,
        text,
        mrkdwn: true,
    };
    // threadTsがあればスレッド返信のリクエストになるようにする
    if (threadTs)
        req.thread_ts = threadTs;
    const res = UrlFetchApp.fetch(url, {
        method: "post",
        contentType: "application/json; charset=utf-8",
        headers: { Authorization: `Bearer ${token}` },
        payload: JSON.stringify(req),
        muteHttpExceptions: true,
    });
    const body = res.getContentText();
    setProp_("DEBUG_LAST_SLACK", body);
    const data = JSON.parse(body || "{}");
    if (!data.ok)
        throw new Error(`Slack chat.postMessage failed: ${body}`);
    return data.ts || null;
}
