// NGなトピックのキーワードリスト。これらを含む投稿は避ける。
const ng = [
  "政治",
  "選挙",
  "宗教",
  "差別",
  "医療",
  "薬",
  "法律",
  "訴訟",
  "投資",
  "事件",
];

function generateNgTopicString_(): string {
  return ng.map((w) => `「${w}」`).join(", ");
}

/**
 * Gemini APIを呼び出して每日のお題を生成する
 */
function generateDailyTopic_(): string {
  const systemText =
    "あなたは社内Slackの雑談促進bot。安全で答えやすいお題を作る。";
  const userText = [
    "今日の雑談お題を1つだけ作ってください。",
    "条件:",
    "- 正解・不正解がない",
    "- 個人の体験・好みで答えられる",
    `- ${generateNgTopicString_()}は避ける`,
    "- 15〜40文字（短すぎ禁止）",
    "- 日本語",
    "出力は「お題文のみ」（前置き・箇条書き禁止）",
  ].join("\n");

  let topic = geminiGenerateText_(systemText, userText, {
    temperature: 0.9,
    maxOutputTokens: 256,
    thinkingLevel: "minimal",
  })
    .replace(/[\r\n]+/g, " ")
    .trim();

  if (topic.length < 10) {
    const retryText =
      userText + "\n\n短すぎる出力は禁止です。必ず15文字以上で出してください。";
    topic = geminiGenerateText_(systemText, retryText, {
      temperature: 0.9,
      maxOutputTokens: 256,
      thinkingLevel: "minimal",
    })
      .replace(/[\r\n]+/g, " ")
      .trim();
  }

  if (topic.length < 10) topic = "最近ちょっと気分転換になったことは？";
  return topic;
}

/**
 * ユーザの投稿を判定し、OKであれば返答を生成する
 */
function judgeAndReply_(text: string): JudgeAndReplyResult {
  const systemText = [
    "あなたは社内Slackの雑談botです。",
    "入力された投稿を判定し、問題なければ雑談として返答してください。",
    "",
    "【NG判定基準】次の話題は返答しない:",
    `- ${generateNgTopicString_()}に関する話題`,
    "- 個人攻撃・誹謗中傷・強い対立を招く話題",
    "- 医療診断・法律相談・投資判断など専門的助言が必要な話題",
    "",
    "【OK判定基準】次の話題は返答する:",
    `- NG話題に関するものでないこと`,
    `- ただし、NG話題に関するワードを含む内容であっても、文脈から判断して問題ないと判断される場合はOKとする`,
    "",
    "OKにする例: 軽い感想、日常の雑談、趣味や食べ物の話、抽象的で深刻でない言及",
    "NGにする例: 政治的主張、宗教の勧誘、病気の相談、法律相談、株やFXの売買助言、事件の論評",
    "",
    "【返答ルール（OKの場合）】",
    "- 共感 or 乗っかる一言 + 質問は1つまで",
    "- 日本語 / 80〜180文字 / 前置き不要",
    "- 断定的事実・個人攻撃禁止",
    "",
    '出力は必ずJSONのみ。NGの場合: {"allowed":false}',
    'OKの場合: {"allowed":true,"reply":"返答文"}',
  ].join("\n");

  const userText = `次の投稿を判定・返答してください。\n\n投稿:\n${text}`;

  const raw = geminiGenerateText_(systemText, userText, {
    temperature: 0.7,
    maxOutputTokens: 512,
    thinkingLevel: "minimal",
  }).trim();

  const cleaned = raw.replace(/```json|```/g, "").trim();
  const result = JSON.parse(cleaned) as { allowed?: boolean; reply?: string };

  setProp_(
    PROP.DEBUG_LAST_NG_RESULT,
    JSON.stringify({ input: text, raw, allowed: result.allowed }),
  );

  if (result.allowed === false) return { allowed: false };
  const reply = (result.reply || "")
    .replace(/[\r\n]+/g, " ")
    .trim()
    .slice(0, 500);
  return {
    allowed: true,
    reply: reply || "いいですね！もう少し詳しく聞いてもいいですか？🙂",
  };
}

/**
 * 毎日のお題を投稿する
 */
function postDailyTopic(): void {
  // 土日は投稿しない
  const day = new Date().getDay();
  if (day === 0 || day === 6) return;

  const channel = getProp_(PROP.TARGET_CHANNEL_ID);
  if (!channel) throw new Error("TARGET_CHANNEL_ID is missing");

  let topic = "最近ちょっと気分転換になったことは？";
  try {
    topic = generateDailyTopic_();
  } catch {
    // keep fallback
  }

  const text = `【今日のお題】${topic}\n短文OK／読むだけOK。返信はこのスレッドへどうぞ。`;
  const ts = slackChatPost_(channel, text);

  // 空文字列を書くと当日の返信が全て無視されるため、tsが取得できた場合のみ保存する
  if (ts) {
    setProp_(topicTsKey_(), ts);
    purgeOldTopicTs_();
  }
}

/**
 * 古いお題のtsを削除する
 */
function purgeOldTopicTs_(): void {
  const todayKey = topicTsKey_();
  const all = PropertiesService.getScriptProperties().getProperties();
  Object.keys(all)
    .filter((k) => k.startsWith(PROP.TODAY_TOPIC_TS_PREFIX) && k !== todayKey)
    .forEach((k) => deleteProp_(k));
}
