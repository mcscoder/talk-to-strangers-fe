import { WSMessage } from "src/types";

export function createWSMessage(message: WSMessage, stringify: true): string;
export function createWSMessage(
  message: WSMessage,
  stringify?: false
): WSMessage;

export function createWSMessage(
  message: WSMessage,
  stringify: boolean = false
) {
  if (stringify) {
    return JSON.stringify(message);
  }
  return message;
}
