"use strict";
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
    if (!judgeTopicByGemini_(cleaned)) {
        slackChatPost_(channel, "⚠️このチャンネルではその話題には反応できません。雑談向けの話題でお願いします😵", threadTs);
        return;
    }
    let reply = "いいですね！もう少し詳しく聞いてもいいですか？🙂";
    try {
        reply = generateReply_(cleaned);
    }
    catch {
        // keep fallback
    }
    slackChatPost_(channel, reply, threadTs);
}
function handleMessage_(event) {
    const channel = event.channel;
    if (!channel)
        return;
    const topicTs = getProp_(`TODAY_TOPIC_TS_${todayYmd_()}`);
    if (!topicTs)
        return;
    const threadTs = event.thread_ts;
    if (!threadTs)
        return;
    if (threadTs !== topicTs)
        return;
    const userText = (event.text || "").trim();
    if (!userText)
        return;
    if (!judgeTopicByGemini_(userText)) {
        slackChatPost_(channel, "⚠️このチャンネルではその話題には反応できません。雑談向けの話題でお願いします😵", threadTs);
        return;
    }
    let reply = "いいですね！もう少し詳しく聞いてもいいですか？🙂";
    try {
        reply = generateReply_(userText);
    }
    catch {
        // keep fallback
    }
    slackChatPost_(channel, reply, threadTs);
}
