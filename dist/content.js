"use strict";
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
function generateNgTopicString_() {
    return ng.map((w) => `「${w}」`).join(", ");
}
/**
 * Gemini APIを呼び出して每日のお題を生成する
 */
function generateDailyTopic_() {
    const systemText = "あなたは社内Slackの雑談促進bot。安全で答えやすいお題を作る。";
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
        const retryText = userText + "\n\n短すぎる出力は禁止です。必ず15文字以上で出してください。";
        topic = geminiGenerateText_(systemText, retryText, {
            temperature: 0.9,
            maxOutputTokens: 256,
            thinkingLevel: "minimal",
        })
            .replace(/[\r\n]+/g, " ")
            .trim();
    }
    if (topic.length < 10)
        topic = "最近ちょっと気分転換になったことは？";
    return topic;
}
/**
 *  ユーザの投稿に対してGeminiに返答を生成させる
 */
function generateReply_(userText) {
    const systemText = [
        "あなたは社内Slackの雑談bot。",
        "安全で軽い返答だけをする。",
        "禁止条件に関わると判断される投稿には反応しない。",
        "やること: 共感 or 乗っかる一言 + 質問は1つまで。",
        `禁止: ${generateNgTopicString_()}に関する話題、断定的事実、個人攻撃。`,
        "制約: 1〜2文、80〜180文字（短すぎ禁止）。",
    ].join("\n");
    const prompt = [
        "次の投稿に雑談として返事を作ってください。",
        "条件: 共感＋質問1つまで / 日本語 / 80〜180文字 / 前置き不要",
        "",
        "投稿:",
        userText,
    ].join("\n");
    let reply = geminiGenerateText_(systemText, prompt, {
        temperature: 0.7,
        maxOutputTokens: 1024,
        thinkingLevel: "minimal",
    })
        .replace(/[\r\n]+/g, " ")
        .trim();
    if (reply.length < 20) {
        const retryPrompt = prompt + "\n\n短すぎる出力は禁止です。必ず80文字以上で返答してください。";
        reply = geminiGenerateText_(systemText, retryPrompt, {
            temperature: 0.7,
            maxOutputTokens: 1024,
            thinkingLevel: "minimal",
        })
            .replace(/[\r\n]+/g, " ")
            .trim();
    }
    if (reply.length < 20)
        reply = "いいですね！もう少し詳しく聞いてもいいですか？🙂";
    return reply.slice(0, 500);
}
/**
 * 毎日のお題を投稿する
 */
function postDailyTopic() {
    // 土日は投稿しない
    const day = new Date().getDay();
    if (day === 0 || day === 6)
        return;
    const channel = getProp_(PROP.TARGET_CHANNEL_ID);
    if (!channel)
        throw new Error("TARGET_CHANNEL_ID is missing");
    let topic = "最近ちょっと気分転換になったことは？";
    try {
        topic = generateDailyTopic_();
    }
    catch {
        // keep fallback
    }
    const text = `【今日のお題】${topic}\n短文OK／読むだけOK。返信はこのスレッドへどうぞ。`;
    const ts = slackChatPost_(channel, text);
    setProp_(topicTsKey_(), ts || "");
}
/**
 * ユーザの投稿がNGトピックに該当するかどうかをGeminiに判定させる
 * 返り値: OKならtrue、NGならfalse
 */
function judgeTopicByGemini_(text) {
    const systemText = [
        "あなたは社内Slackの雑談botの安全判定を行う分類器です。",
        "入力された投稿が、社内の軽い雑談として扱ってよいかを判定してください。",
        "次の話題はNGです。",
        `- ${generateNgTopicString_()}に関する話題`,
        "- 個人攻撃、誹謗中傷、強い対立を招く話題",
        "- 専門的助言が必要な話題",
        "",
        "OKにする例:",
        "- 軽い感想",
        "- 日常の雑談",
        "- 趣味や食べ物の話",
        "- 抽象的で深刻でない言及",
        "",
        "NGにする例:",
        "- 政治的主張や政治に関わる選挙の話",
        "- 宗教の勧誘や信条の議論",
        "- 病気、診断、薬、治療の相談",
        "- 法律相談、訴訟相談",
        "- 投資判断、株やFXや仮想通貨の売買助言",
        "- ニュースや事件の論評",
        "",
        "出力は必ずJSONのみ。",
        '形式: {"allowed": true} または {"allowed": false}',
    ].join("\n");
    const userText = [
        "次の投稿が社内雑談botで返答してよい内容か判定してください。",
        "",
        "投稿:",
        text,
    ].join("\n");
    const raw = geminiGenerateText_(systemText, userText, {
        temperature: 0,
        maxOutputTokens: 128,
        thinkingLevel: "minimal",
    }).trim();
    try {
        const cleaned = raw.replace(/```json|```/g, "").trim();
        const result = JSON.parse(cleaned);
        setProp_(PROP.DEBUG_LAST_NG_RESULT, JSON.stringify({
            time: new Date().toISOString(),
            input: text,
            raw: raw,
            parsed: result,
            allowed: result.allowed === true,
        }));
        return result.allowed === true;
    }
    catch {
        // 解析失敗時は安全側に倒す
        return false;
    }
}
