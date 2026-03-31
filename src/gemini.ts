function geminiGenerateText_(
  systemText: string,
  userText: string,
  opts: GeminiGenerateOpts = {},
): string {
  const apiKey = getProp_("GEMINI_API_KEY");
  if (!apiKey) throw new Error("GEMINI_API_KEY is missing");

  const model =
    opts.model || getProp_("GEMINI_MODEL") || "gemini-3-flash-preview";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    model,
  )}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const thinkingLevel: GeminiThinkingLevel =
    opts.thinkingLevel ||
    (getProp_("GEMINI_THINKING_LEVEL") as GeminiThinkingLevel) ||
    "minimal";

  const makePayload = (maxOut: number) => ({
    contents: [
      {
        role: "user",
        parts: [{ text: `【前提】\n${systemText}\n\n【依頼】\n${userText}` }],
      },
    ],
    generationConfig: {
      temperature: opts.temperature ?? 0.8,
      topP: opts.topP ?? 0.9,
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

  type GeminiCandidate = {
    content?: { parts?: Array<{ text?: string }> };
    finishReason?: string;
  };
  type GeminiResponse = { candidates?: GeminiCandidate[] };

  const call_ = (
    maxOut: number,
  ): { text: string; finishReason: string; raw: string } => {
    const res = UrlFetchApp.fetch(url, {
      method: "post",
      contentType: "application/json; charset=utf-8",
      payload: JSON.stringify(makePayload(maxOut)),
      muteHttpExceptions: true,
    });

    const body = res.getContentText();
    setProp_("DEBUG_LAST_GEMINI", body);

    const data = JSON.parse(body || "{}") as GeminiResponse;
    const cand = data.candidates?.[0];
    const text = (cand?.content?.parts ?? [])
      .map((p) => p.text || "")
      .join("")
      .trim();
    const finishReason = cand?.finishReason || "";
    return { text, finishReason, raw: body };
  };

  const firstMax = opts.maxOutputTokens ?? 512;
  let out = call_(firstMax);

  // MAX_TOKENS で本文が短い場合のみリトライ
  if (out.finishReason === "MAX_TOKENS" && out.text.length < 60) {
    out = call_(Math.max(firstMax, 1024));
  }

  if (!out.text) throw new Error(`Gemini failed: ${out.raw}`);
  return out.text;
}
