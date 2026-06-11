"use strict";
/**
 * Gemini APIを呼び出してテキスト生成する関数
 * Vertex AIのGeminiモデルを呼び出してテキスト生成を行う。
 */
function geminiGenerateText_(systemText, userText, opts = {}) {
    var _a;
    const projectId = getProp_(PROP.GCP_PROJECT_ID);
    if (!projectId)
        throw new Error("GCP_PROJECT_ID is missing");
    const location = getProp_(PROP.VERTEX_LOCATION) || "us-central1";
    const model = opts.model || getProp_(PROP.GEMINI_MODEL) || "gemini-2.5-flash";
    const url = `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}` +
        `/locations/${location}/publishers/google/models/${encodeURIComponent(model)}:generateContent`;
    const thinkingBudget = opts.thinkingLevel === "minimal"
        ? 0
        : opts.thinkingLevel === "low"
            ? 1024
            : opts.thinkingLevel === "medium"
                ? 4096
                : opts.thinkingLevel === "high"
                    ? 8192
                    : undefined;
    const makePayload = (maxOut) => {
        var _a, _b;
        return ({
            contents: [
                {
                    role: "user",
                    parts: [{ text: `【前提】\n${systemText}\n\n【依頼】\n${userText}` }],
                },
            ],
            generationConfig: {
                temperature: (_a = opts.temperature) !== null && _a !== void 0 ? _a : 0.8,
                topP: (_b = opts.topP) !== null && _b !== void 0 ? _b : 0.9,
                maxOutputTokens: maxOut,
                ...(thinkingBudget !== undefined && {
                    thinkingConfig: { thinkingBudget },
                }),
            },
        });
    };
    const call_ = (maxOut) => {
        var _a, _b, _c;
        const res = UrlFetchApp.fetch(url, {
            method: "post",
            contentType: "application/json; charset=utf-8",
            headers: {
                Authorization: `Bearer ${ScriptApp.getOAuthToken()}`,
            },
            payload: JSON.stringify(makePayload(maxOut)),
            muteHttpExceptions: true,
        });
        const body = res.getContentText();
        const data = JSON.parse(body || "{}");
        const cand = (_a = data.candidates) === null || _a === void 0 ? void 0 : _a[0];
        const text = ((_c = (_b = cand === null || cand === void 0 ? void 0 : cand.content) === null || _b === void 0 ? void 0 : _b.parts) !== null && _c !== void 0 ? _c : [])
            .map((p) => p.text || "")
            .join("")
            .trim();
        const finishReason = (cand === null || cand === void 0 ? void 0 : cand.finishReason) || "";
        return { text, finishReason, raw: body };
    };
    const firstMax = (_a = opts.maxOutputTokens) !== null && _a !== void 0 ? _a : 512;
    let out = call_(firstMax);
    // MAX_TOKENS で本文が短い場合のみリトライ
    if (out.finishReason === "MAX_TOKENS" && out.text.length < 60) {
        out = call_(Math.max(firstMax, 1024));
    }
    if (!out.text)
        throw new Error(`Gemini failed: ${out.raw}`);
    return out.text;
}
