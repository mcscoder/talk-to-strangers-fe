import { Button, Checkbox, Form, Input } from "antd";
import * as nsfwjs from "nsfwjs";
import { useEffect, useRef, useState } from "react";
import { useRTCPeerConnection } from "src/hooks/rtc-peer-connection.test";
import { useWebSocket } from "src/hooks/web-socket";
import { TextMessage } from "src/types";
import { createWSMessage } from "src/utils";

export const ChatRoute = () => {
  const { send, onMessage } = useWebSocket();

  const [textMessages, setTextMessages] = useState<TextMessage[]>([]);
  const selfVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const [textMessage, setTextMessage] = useState<string>("");
  const [autoConnect, setAutoConnect] = useState<boolean>(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [nsfwModel, setNsfwModel] = useState<nsfwjs.NSFWJS | null>(null);

  const onTextMessage = (text: string) => {
    setTextMessages((prev) => [...prev, { stranger: true, text }]);
  };

  const onConnect = () => {
    // Do something here...
  };

  const onDisconnect = () => {
    // Clear all the message
    setTextMessage("");
    setTextMessages([]);
  };

  const {
    recipientSessionId,
    start,
    disconnect,
    sensitiveContentDetected,
    connectionState,
  } = useRTCPeerConnection(
    selfVideoRef,
    remoteVideoRef,
    send,
    autoConnect,
    onMessage,
    onTextMessage,
    onConnect,
    onDisconnect
  );

  useEffect(() => {
    (async () => {
      setNsfwModel(await nsfwjs.load("InceptionV3"));
      console.log("NSFW model loaded.");
    })();
  }, []);

  useEffect(() => {
    if (connectionState === "connected") {
      const video = selfVideoRef.current!;
      const canvas = canvasRef.current!;
      const context = canvas.getContext("2d");
      canvas.width = video.clientWidth;
      canvas.height = video.clientHeight;

      const intervalId = setInterval(async () => {
        if (context && nsfwModel) {
          context.drawImage(video, 0, 0, canvas.width, canvas.height);
          const predictions = await nsfwModel.classify(canvas);
          console.log("Predictions:", JSON.stringify(predictions));

          // Handle prediction results
          const nsfwScore =
            predictions.find(
              (p) => p.className === "Porn" || p.className === "Sexy"
            )?.probability || 0;
          console.log(nsfwScore);
          if (nsfwScore > 0.6) {
            sensitiveContentDetected();
          }
        }
      }, 1000);

      return () => {
        clearInterval(intervalId);
      };
    }
  }, [connectionState]);

  if (!nsfwModel) {
    return <>Loading model...</>;
  }

  return (
    <div className="flex flex-col gap-3 p-4 flex-1 lg:flex-row">
      <div className="flex-1 grid grid-rows-2 gap-3">
        <div className="relative bg-gray-400 rounded-md overflow-hidden">
          <video
            autoPlay
            playsInline
            ref={remoteVideoRef}
            className="absolute inset-0 size-full object-cover"
          />
        </div>
        <div className="relative bg-gray-400 rounded-md overflow-hidden">
          <video
            autoPlay
            muted
            playsInline
            ref={selfVideoRef}
            className="absolute inset-0 size-full object-cover"
          />
        </div>
        <canvas
          ref={canvasRef}
          style={{ display: "none" }}
        />
      </div>
      <div className="flex lg:flex-[2] flex-col gap-3">
        <div className="rounded-md bg-white flex-1 shadow-sm p-2 gap-1 flex flex-col">
          {textMessages.map(({ stranger, text }, index) => (
            <div key={index}>
              <span
                className={`${stranger ? "text-red-500" : "text-blue-500"} font-bold`}
              >
                {stranger ? "Stranger" : "You"}:
              </span>{" "}
              <span className="text-gray-700">{text}</span>
            </div>
          ))}
        </div>
        <div className="flex gap-3">
          <div className="flex flex-col">
            <Button
              disabled={connectionState == "connecting"}
              onClick={() => {
                switch (connectionState) {
                  case "connected":
                    return disconnect();
                  case "disconnected":
                    return start();
                  case "connecting":
                    return;
                }
              }}
            >
              {(() => {
                switch (connectionState) {
                  case "connected":
                    return "Disconnect";
                  case "disconnected":
                    return "Start";
                  case "connecting":
                    return "Connecting";
                  default:
                    break;
                }
              })()}
            </Button>
            <Checkbox
              checked={autoConnect}
              onChange={(e) => setAutoConnect(e.target.checked)}
            >
              Auto connect
            </Checkbox>
          </div>
          <Form
            className="flex gap-3 flex-1"
            onFinish={() => {
              if (textMessage) {
                setTextMessages((prev) => [
                  ...prev,
                  { stranger: false, text: textMessage },
                ]);
                send(
                  createWSMessage({
                    type: "text",
                    data: textMessage,
                    recipientSessionId,
                  })
                );
                setTextMessage("");
              }
            }}
          >
            <Input
              disabled={connectionState !== "connected"}
              value={textMessage}
              onChange={(e) => setTextMessage(e.target.value)}
            />
            <Button
              disabled={textMessage == ""}
              htmlType="submit"
              className="h-full"
            >
              Send
            </Button>
          </Form>
        </div>
      </div>
    </div>
  );
};
