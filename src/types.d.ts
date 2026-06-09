/**
 * src/types.ts
 * このファイルは「型だけ」を全体に配るためのもの。
 * module: none でも確実に全ファイルから参照できるように declare global を使う。
 */

declare global {
  type SlackEnvelopeType = "url_verification" | "event_callback";
  type SlackEventType = "app_mention" | "message";

  type SlackEvent = {
    type: SlackEventType | string;
    channel?: string;
    text?: string;
    ts?: string;
    thread_ts?: string;
    subtype?: string;
    bot_id?: string;
  };

  type SlackEventCallbackPayload = {
    type: SlackEnvelopeType | string;
    event_id?: string;
    event?: SlackEvent;
  };

  type GeminiThinkingLevel = "minimal" | "low" | "medium" | "high";

  type GeminiGenerateOpts = {
    model?: string;
    temperature?: number;
    topP?: number;
    maxOutputTokens?: number;
    thinkingLevel?: GeminiThinkingLevel;
  };
}

// これにより「このファイル自体」はモジュール扱いになるが、declare global があるので型は全体に出る
export {};
