"use strict";
/**
 * Slack Events APIのリクエストを処理するエントリポイント
 */
function doPost(e) {
    var _a, _b, _c;
    const raw = (_b = (_a = e === null || e === void 0 ? void 0 : e.postData) === null || _a === void 0 ? void 0 : _a.contents) !== null && _b !== void 0 ? _b : "";
    let payload;
    try {
        payload = JSON.parse(raw);
    }
    catch {
        setProp_("DEBUG_LAST_BAD_JSON", raw);
        return ok_();
    }
    // Slack URL verification
    if (payload.type === "url_verification") {
        // challenge は url_verification のときに来る（型はゆるく扱う）
        const challenge = (_c = payload.challenge) !== null && _c !== void 0 ? _c : "";
        return ContentService.createTextOutput(challenge);
    }
    // We only handle Events API callbacks
    if (payload.type !== "event_callback") {
        return ok_();
    }
    const event = payload.event;
    // eventがない場合は何もしない
    if (!event)
        return ok_();
    const slackEvent = event;
    // 投稿対象となるチャンネルIDを環境変数から取得
    const targetChannelId = getProp_("TARGET_CHANNEL_ID");
    // デバッグ用として、受け取ったイベントの内容をスクリプトプロパティに保存する
    setProp_("DEBUG_LAST_EVENT", JSON.stringify({
        envelope_type: payload.type,
        event_id: payload.event_id,
        event_type: slackEvent.type,
        channel: slackEvent.channel,
        text: slackEvent.text,
        ts: slackEvent.ts,
        thread_ts: slackEvent.thread_ts,
        subtype: slackEvent.subtype,
        bot_id: slackEvent.bot_id,
    }));
    // AI雑談チャンネル以外のイベントは無視する
    if (!targetChannelId || event.channel !== targetChannelId)
        return ok_();
    // bot_idがあるイベントはBot自身が発したものなので無視する
    if (event.bot_id)
        return ok_();
    // Slackのmessageイベントにはsubtypeというフィールドがあり、通常のメッセージはsubtypeがなく、それ以外の特殊メッセージはsubtypeが存在する。
    // 特殊メッセージはsubtype=thread_broadcast以外は全て無視する。
    // thread_broadcastは「チャンネルにも表示」をチェックして投稿したメッセージであり、通常のmessageイベントと同様にbotの応答対象とする。
    if (event.subtype && event.subtype !== "thread_broadcast")
        return ok_();
    // Slackはイベントの受信確認が取れない場合などに同じイベントを複数回送ることがあるため、event_idを記憶して重複を検出する。
    if (payload.event_id && isDuplicateEvent_(payload.event_id))
        return ok_();
    if (payload.event_id)
        rememberEvent_(payload.event_id);
    // botに対してメンション投稿があった場合の処理
    if (event.type === "app_mention") {
        handleMention_(event);
        return ok_();
    }
    // お題スレッドへの返信があった場合の処理
    if (event.type === "message") {
        // お題スレッド内でのメンション投稿（<@...>の形式）に対して処理を行わないことでbotの二重投稿を防止する
        if (/<@[^>]+>/.test(event.text || ""))
            return ok_();
        handleMessage_(event);
        return ok_();
    }
    return ok_();
}
/**
 * イベントの重複を検出して記憶するためのヘルパー
 */
function isDuplicateEvent_(eventId) {
    const s = getProp_("SEEN_EVENT_IDS") || "";
    if (!s)
        return false;
    const arr = s.split(",").filter(Boolean);
    return arr.includes(eventId);
}
/**
 * 最近受け取ったイベントIDを記憶しておく。重複イベントの検出に使用する。
 * 最新のものから順にカンマ区切りで保存し、古いものは削除する。
 */
function rememberEvent_(eventId) {
    const max = Number(getProp_("SEEN_EVENT_IDS_MAX") || "50");
    const s = getProp_("SEEN_EVENT_IDS") || "";
    const arr = s ? s.split(",").filter(Boolean) : [];
    arr.push(eventId);
    // keep last max
    const trimmed = arr.slice(Math.max(0, arr.length - max));
    setProp_("SEEN_EVENT_IDS", trimmed.join(","));
}
