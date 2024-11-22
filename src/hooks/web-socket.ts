import { useMemo } from "react";
import { WS_URL } from "src/constants";

export const useWebSocket = () => {
  const websocket = useMemo(() => {
    const ws = new WebSocket(WS_URL);
    ws.onopen = () => console.log("Connected");
    return ws;
  }, []);

  const send = (message: string | object) => {
    websocket.send(JSON.stringify(message));
  };

  const onMessage = (action: (ev: MessageEvent) => void) => {
    websocket.onmessage = action;
  };

  return { send, onMessage };
};
