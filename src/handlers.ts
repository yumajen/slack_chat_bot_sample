function handleMention_(event: SlackEvent): void {
  const channel = event.channel;
  const threadTs = event.thread_ts || event.ts;

  if (!channel || !threadTs) return;

  const cleaned = (event.text || "").replace(/<@[^>]+>\s*/g, "").trim();
  if (!cleaned) {
    slackChatPost_(channel, "今日はどんな話題にしますか？", threadTs);
    return;
  }

  if (!judgeTopicByGemini_(cleaned)) {
    slackChatPost_(
      channel,
      "⚠️このチャンネルではその話題には反応できません。雑談向けの話題でお願いします😵",
      threadTs,
    );
    return;
  }

  let reply = "いいですね！もう少し詳しく聞いてもいいですか？🙂";
  try {
    reply = generateReply_(cleaned);
  } catch {
    // keep fallback
  }

  slackChatPost_(channel, reply, threadTs);
}

function handleMessage_(event: SlackEvent): void {
  const channel = event.channel;
  if (!channel) return;

  // 今日のお題スレッドのtsを取得する
  const topicTs = getProp_(topicTsKey_());
  if (!topicTs) return;

  // スレッドの親メッセージID（thread_ts）を取得
  const threadTs = event.thread_ts;
  if (!threadTs) return;
  // 今日のお題スレッドへの投稿かどうかを判定し、違うスレッドへの投稿なら無視する
  if (threadTs !== topicTs) return;

  const userText = (event.text || "").trim();
  if (!userText) return;

  if (!judgeTopicByGemini_(userText)) {
    slackChatPost_(
      channel,
      "⚠️このチャンネルではその話題には反応できません。雑談向けの話題でお願いします😵",
      threadTs,
    );
    return;
  }

  let reply = "いいですね！もう少し詳しく聞いてもいいですか？🙂";
  try {
    reply = generateReply_(userText);
  } catch {
    // keep fallback
  }

  slackChatPost_(channel, reply, threadTs);
}
