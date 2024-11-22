export type WSMessageType =
  | "candidate"
  | "offer"
  | "answer"
  | "disconnect"
  | "text";

export type WSMessage = {
  type: WSMessageType;
  data?: unknown;
  recipientSessionId?: string;
  senderSessionId?: string;
};

export type TextMessage = {
  stranger: boolean;
  text: string;
};

export type ConnectionState = "connected" | "disconnected" | "connecting";
