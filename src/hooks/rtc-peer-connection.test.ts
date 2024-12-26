import { useEffect, useRef, useState } from "react";
import { ConnectionState } from "src/types";
import { createWSMessage, parseWSMessage } from "src/utils";

export const useRTCPeerConnection = (
  selfVideoRef: React.RefObject<HTMLVideoElement>,
  remoteVideoRef: React.RefObject<HTMLVideoElement>,
  send: (message: string | object) => void,
  autoConnect: boolean = false,
  onMessage: (action: (ev: MessageEvent) => void) => void,
  onTextMessage: (text: string) => void = () => {},
  onConnect: () => void = () => {},
  onDisconnect: () => void = () => {}
) => {
  const globalPc = useRef<RTCPeerConnection | null>(null);
  const [recipientSessionId, setRecipientSessionId] = useState<string>("");
  const [connectionState, setConnectionState] =
    useState<ConnectionState>("disconnected");

  const initPeerConnection = (
    remoteVideoRef: React.RefObject<HTMLVideoElement>
  ) => {
    // const iceServers = [
    // { urls: "stun:stun.l.google.com:19302" },
    // { urls: "stun:stun.l.google.com:5349" },
    // { urls: "stun:stun1.l.google.com:3478" },
    // { urls: "stun:stun1.l.google.com:5349" },
    // { urls: "stun:stun2.l.google.com:19302" },
    // { urls: "stun:stun2.l.google.com:5349" },
    // { urls: "stun:stun3.l.google.com:3478" },
    // { urls: "stun:stun3.l.google.com:5349" },
    // { urls: "stun:stun4.l.google.com:19302" },
    // { urls: "stun:stun4.l.google.com:5349" },
    // ];
    // const pc = new RTCPeerConnection({ iceServers });
    const pc = new RTCPeerConnection();

    pc.ontrack = ({ track, streams }) => {
      track.onunmute = () => {
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = streams[0];
        }
      };
    };

    globalPc.current = pc;

    return pc;
  };

  // 1. Create a message which included "candidate"
  // and send to the recipient session id
  const initOnIceCandidateEvent = (
    peerConnection: RTCPeerConnection,
    recipientSessionId: string
  ) => {
    peerConnection.onicecandidate = ({ candidate }) => {
      // 1. Create a message which included "candidate"
      // and send to the recipient session id
      const message = createWSMessage({
        type: "candidate",
        data: candidate,
        recipientSessionId,
      });
      send(message);
    };
  };

  // 1. Set remote description
  // 2. Set connection state to "connected"
  const handleConnect = async (
    peerConnection: RTCPeerConnection,
    recipientSessionId: string,
    description: RTCSessionDescription
  ) => {
    // 1. Set remote description
    await peerConnection.setRemoteDescription(description);

    initOnIceCandidateEvent(peerConnection, recipientSessionId);

    // 2. Set connection state to "connected"
    setConnectionState("connected");

    // 3. Trigger onConnect
    onConnect();
  };

  // 1. Set connection state to "disconnected"
  // 2. Remove recipient session id
  // 3. Remove "srcObject" from "remoteVideoRef"
  // 4. Reconnect if "autoConnect" is true
  const handleDisconnect = () => {
    if (globalPc.current) {
      globalPc.current.close();
      globalPc.current = null;
    }

    // 1. Set connection state to "disconnected"
    setConnectionState("disconnected");

    // 2. Remove recipient session id
    setRecipientSessionId("");

    // 3. Remove "srcObject" from "remoteVideoRef"
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }

    // 4. Reconnect if "autoConnect" is true
    if (autoConnect) {
      start();
    }

    // 5. Trigger onDisconnect
    onDisconnect();
  };

  const handleOnMessage = (peerConnection: RTCPeerConnection) => {
    onMessage(async (ev) => {
      const { type, data, senderSessionId } = parseWSMessage(ev.data);

      switch (type) {
        // 1. Receive the sender's session id
        // 2. Initialize onicecandidate event
        // 3. Send back a message with type "found"
        case "start": {
          console.log("start");
          // 1. Save the sender's session id
          setRecipientSessionId(senderSessionId!);

          // 2. Initialize onicecandidate event
          initOnIceCandidateEvent(peerConnection, senderSessionId!);

          // 3. Send back a message with type "found" to the "sender"
          const message = createWSMessage({
            type: "found",
            recipientSessionId: senderSessionId,
          });
          send(message);

          break;
        }

        // 1. Receive the sender's session id
        // 2. Initialize onicecandidate event
        // 3. Initialize an offer and send back to the "sender"
        // 4. Set the connection state to "connecting"
        case "found": {
          console.log("found");
          // 1. Receive the sender's session id
          setRecipientSessionId(senderSessionId!);

          // 2. Initialize onicecandidate event
          // initOnIceCandidateEvent(peerConnection, senderSessionId!);

          // 3. Initialize an offer and send back to the "sender"
          await peerConnection.setLocalDescription();
          const message = createWSMessage({
            type: "offer",
            data: peerConnection.localDescription,
            recipientSessionId: senderSessionId,
          });
          send(message);

          // 4. Set the connection state to "connecting"
          setConnectionState("connecting");

          break;
        }

        // 1. Add Ice Candidate to the Peer Connection
        case "candidate": {
          console.log("candidate");
          // 1. Add Ice Candidate to the Peer Connection
          peerConnection.addIceCandidate(data as RTCIceCandidate);

          break;
        }

        // 1. Connection handler
        // 2. Initialize an answer and send back to the "sender"
        case "offer": {
          console.log("offer");
          // 1. Connection handler
          handleConnect(
            peerConnection,
            senderSessionId!,
            data as RTCSessionDescription
          );

          // 2. Initialize an answer and send back to the "sender"
          await peerConnection.setLocalDescription();
          const message = createWSMessage({
            type: "answer",
            data: peerConnection.localDescription,
            recipientSessionId: senderSessionId,
          });
          send(message);

          break;
        }

        // 1. Connection handler
        case "answer": {
          console.log("answer");
          // 1. Connection handler
          handleConnect(
            peerConnection,
            senderSessionId!,
            data as RTCSessionDescription
          );

          break;
        }
        case "disconnect": {
          console.log("disconnect");
          handleDisconnect();
          break;
        }
        case "sensitive": {
          console.log("sensitive content detected");
          alert(
            "The stranger has disconnected because shared sensitive content"
          );
          handleDisconnect();
          break;
        }
        case "text": {
          onTextMessage(data as string);
          break;
        }

        default:
          break;
      }
    });
  };

  // 1. Initialize peer connection
  // 2. Handle websocket onmessage
  // 3. Get user media
  // 4. Send a message with "start" type
  // 5. Set connection state to "connecting"
  const start = async () => {
    try {
      // 1. Initialize peer connection
      const peerConnection = initPeerConnection(remoteVideoRef);

      // 2. Handle websocket onmessage
      handleOnMessage(peerConnection);

      // 3. Get user media
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: true,
      });
      stream.getTracks().forEach((track) => {
        peerConnection.addTrack(track, stream);
      });
      if (selfVideoRef.current && !selfVideoRef.current.srcObject) {
        selfVideoRef.current.srcObject = stream;
      }

      // 4. Send a message with "start" type
      const message = createWSMessage({ type: "start" });
      send(message);

      // 5. Set connection state to "connecting"
      setConnectionState("connecting");
    } catch (error) {
      console.log(error);
    }
  };

  const disconnect = () => {
    if (recipientSessionId) {
      send(createWSMessage({ type: "disconnect", recipientSessionId }));
      handleDisconnect();
    }
  };

  // Sensitive content detected
  // 1. Send a message with type "sensitive" to the recipient
  // 2. Disconnect the p2p connection
  // 3. Display an alert
  const sensitiveContentDetected = () => {
    if (recipientSessionId) {
      // 1. Send a message with type "sensitive" to the recipient
      send(createWSMessage({ type: "sensitive", recipientSessionId }));

      // 2. Disconnect the p2p connection
      handleDisconnect();

      // 3. Display an alert
      console.warn("NSFW content detected!");
      alert("Sensitive content detected!");
    }
  };

  // Handle disconnected by closing tab or browser
  useEffect(() => {
    const handleBeforeUnload = () => {
      disconnect();
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [recipientSessionId]);

  return {
    start,
    disconnect,
    sensitiveContentDetected,
    connectionState,
    recipientSessionId,
  };
};
