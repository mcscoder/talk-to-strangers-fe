import { useEffect, useState } from "react";
import { ConnectionState, WSMessage } from "src/types";
import { createWSMessage } from "src/utils";

export const useRTCPeerConnection = (
  selfVideoRef: React.RefObject<HTMLVideoElement>,
  remoteVideoRef: React.RefObject<HTMLVideoElement>,
  send: (message: string | object) => void,
  onMessage: (action: (ev: MessageEvent) => void) => void,
  onTextMessage: (text: string) => void = () => {},
  onConnect: () => void = () => {},
  onDisconnect: () => void = () => {}
) => {
  const [recipientSessionId, setRecipientSessionId] = useState<string>("");
  const [connectionState, setConnectionState] =
    useState<ConnectionState>("disconnected");

  const handleConnect = async (
    pc: RTCPeerConnection,
    recipientSessionId: string,
    data: unknown
  ) => {
    setRecipientSessionId(recipientSessionId);
    handleIceCandidate(pc, recipientSessionId);
    await pc.setRemoteDescription(data as RTCSessionDescription);
    setConnectionState("connected");
    onConnect();
  };

  const handleDisconnect = () => {
    setConnectionState("disconnected");
    setRecipientSessionId("");
    onDisconnect();
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }
  };

  const disconnect = () => {
    if (recipientSessionId) {
      send(createWSMessage({ type: "disconnect", recipientSessionId }));
      handleDisconnect();
    }
  };

  // Handle when user close tab or browser
  // This code will send and message to the other client
  // To announce this user is disconnected
  useEffect(() => {
    const handleBeforeUnload = () => {
      disconnect();
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [recipientSessionId]);

  const initPeerConnection = (
    remoteVideoRef: React.RefObject<HTMLVideoElement>
  ) => {
    const pc = new RTCPeerConnection();

    pc.ontrack = ({ track, streams }) => {
      track.onunmute = () => {
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = streams[0];
        }
      };
    };

    return pc;
  };

  const handleIceCandidate = (
    pc: RTCPeerConnection,
    recipientSessionId: string
  ) => {
    pc.onicecandidate = ({ candidate }) => {
      const message = createWSMessage({
        type: "candidate",
        data: candidate,
        recipientSessionId,
      });
      send(message);
    };
  };

  const setupHandleOnMessage = (pc: RTCPeerConnection) => {
    onMessage(async (ev) => {
      const { type, data, senderSessionId } = JSON.parse(ev.data) as WSMessage;

      switch (type) {
        case "offer": {
          await handleConnect(pc, senderSessionId!, data);
          await pc.setLocalDescription();
          send(
            createWSMessage({
              type: "answer",
              data: pc.localDescription,
              recipientSessionId: senderSessionId,
            })
          );
          break;
        }
        case "answer": {
          await handleConnect(pc, senderSessionId!, data);

          break;
        }
        case "candidate": {
          await pc.addIceCandidate(data as RTCIceCandidateInit);
          break;
        }
        case "disconnect": {
          handleDisconnect();
          break;
        }
        case "text":
          console.log("data");
          onTextMessage(data as string);
          break;
        default:
          break;
      }
    });
  };

  const start = async () => {
    try {
      const pc = initPeerConnection(remoteVideoRef);
      setupHandleOnMessage(pc);

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: true,
      });
      stream.getTracks().forEach((track) => {
        pc.addTrack(track, stream);
      });

      if (selfVideoRef.current && !selfVideoRef.current.srcObject) {
        selfVideoRef.current.srcObject = stream;
      }

      await pc.setLocalDescription();
      send(createWSMessage({ type: "offer", data: pc.localDescription }));
      setConnectionState("connecting");
    } catch (error) {
      console.log(error);
    }
  };

  return { start, disconnect, connectionState, recipientSessionId };
};
