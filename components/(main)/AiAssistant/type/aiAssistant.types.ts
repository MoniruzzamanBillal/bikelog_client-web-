export interface TChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface TBikeChatResponse {
  reply: string;
}
