"use strict";
const FALLBACK_REPLY = "いいですね！もう少し詳しく聞いてもいいですか？🙂";
const NG_REPLY = "⚠️このチャンネルではその話題には反応できません。雑談向けの話題でお願いします😵";
function handleMention_(event) {
    const channel = event.channel;
    const threadTs = event.thread_ts || event.ts;
    if (!channel || !threadTs)
        return;
    const cleaned = (event.text || "").replace(/<@[^>]+>\s*/g, "").trim();
    if (!cleaned) {
        slackChatPost_(channel, "今日はどんな話題にしますか？", threadTs);
        return;
    }
    let result = { allowed: true, reply: FALLBACK_REPLY };
    try {
        result = judgeAndReply_(cleaned);
    }
    catch {
        // Gemini 障害時はフォールバック返信で続行（無応答にしない）
    }
    slackChatPost_(channel, result.allowed ? result.reply : NG_REPLY, threadTs);
}
function handleMessage_(event) {
    const channel = event.channel;
    if (!channel)
        return;
    // 今日のお題スレッドのtsを取得する
    const topicTs = getProp_(topicTsKey_());
    if (!topicTs)
        return;
    // スレッドの親メッセージID（thread_ts）を取得
    const threadTs = event.thread_ts;
    if (!threadTs)
        return;
    // 今日のお題スレッドへの投稿かどうかを判定し、違うスレッドへの投稿なら無視する
    if (threadTs !== topicTs)
        return;
    const userText = (event.text || "").trim();
    if (!userText)
        return;
    let result = { allowed: true, reply: FALLBACK_REPLY };
    try {
        result = judgeAndReply_(userText);
    }
    catch {
        // Gemini 障害時はフォールバック返信で続行（無応答にしない）
    }
    slackChatPost_(channel, result.allowed ? result.reply : NG_REPLY, threadTs);
}
