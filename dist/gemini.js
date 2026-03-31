"use strict";
function geminiGenerateText_(systemText, userText, opts = {}) {
    var _a;
    const apiKey = getProp_("GEMINI_API_KEY");
    if (!apiKey)
        throw new Error("GEMINI_API_KEY is missing");
    const model = opts.model || getProp_("GEMINI_MODEL") || "gemini-3-flash-preview";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
    const thinkingLevel = opts.thinkingLevel ||
        getProp_("GEMINI_THINKING_LEVEL") ||
        "minimal";
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
                thinkingConfig: { thinkingLevel },
            },
            safetySettings: [
                {
                    category: "HARM_CATEGORY_HARASSMENT",
                    threshold: "BLOCK_MEDIUM_AND_ABOVE",
                },
                {
                    category: "HARM_CATEGORY_HATE_SPEECH",
                    threshold: "BLOCK_MEDIUM_AND_ABOVE",
                },
                {
                    category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
                    threshold: "BLOCK_MEDIUM_AND_ABOVE",
                },
                {
                    category: "HARM_CATEGORY_DANGEROUS_CONTENT",
                    threshold: "BLOCK_MEDIUM_AND_ABOVE",
                },
            ],
        });
    };
    const call_ = (maxOut) => {
        var _a, _b, _c;
        const res = UrlFetchApp.fetch(url, {
            method: "post",
            contentType: "application/json; charset=utf-8",
            payload: JSON.stringify(makePayload(maxOut)),
            muteHttpExceptions: true,
        });
        const body = res.getContentText();
        setProp_("DEBUG_LAST_GEMINI", body);
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
