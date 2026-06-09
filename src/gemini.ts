/**
 * Gemini APIを呼び出してテキスト生成する関数
 * Vertex AIのGeminiモデルを呼び出してテキスト生成を行う。
 */
function geminiGenerateText_(
  systemText: string,
  userText: string,
  opts: GeminiGenerateOpts = {},
): string {
  const projectId = getProp_("GCP_PROJECT_ID");
  if (!projectId) throw new Error("GCP_PROJECT_ID is missing");

  const location = getProp_("VERTEX_LOCATION") || "us-central1";

  const model = opts.model || getProp_("GEMINI_MODEL") || "gemini-2.5-flash"; // 2024-06-12現在のデフォルトモデル（まずは安定優先）
  const url =
    `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}` +
    `/locations/${location}/publishers/google/models/${encodeURIComponent(
      model,
    )}:generateContent`;

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
    },
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
      headers: {
        Authorization: `Bearer ${ScriptApp.getOAuthToken()}`,
      },
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
