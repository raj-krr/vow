
const BASE_URL = import.meta.env.VITE_SOCKET_URL;

export default class SfuSignalingClient {
  constructor(token = null) {
    this.ws = null;
    this.connected = false;
    this.handlers = new Map();
    this.token = token || localStorage.getItem("accessToken");
    this.participantId = null;
  }

  on(type, fn) {
    if (!this.handlers.has(type)) this.handlers.set(type, new Set());
    this.handlers.get(type).add(fn);
  }

  emit(type, data) {
    if (!this.handlers.has(type)) return;
    this.handlers.get(type).forEach((fn) => fn(data));
  }

  _buildWsUrl() {
    let base =
      import.meta.env.VITE_SOCKET_URL ||
      import.meta.env.VITE_API_URL ||
      (typeof window !== "undefined" ? window.location.origin : "http://localhost:5000");

    base = base.trim();

    if (base.startsWith("https://")) base = base.replace("https://", "wss://");
    else if (base.startsWith("http://")) base = base.replace("http://", "ws://");
    else if (!base.startsWith("ws")) base = "ws://" + base;

    return base.replace(/\/+$/, "") + "/signaling";
  }

  connect() {
    return new Promise((resolve, reject) => {
      try {
        const url = this._buildWsUrl();

        this.ws = new WebSocket(url);

        this.ws.onopen = () => {
          this.connected = true;
          console.log("[SFU] Connected");

          // send auth if needed
          if (this.token) {
            this.send({
              type: "auth",
              token: this.token,
            });
          }

          resolve();
        };

        this.ws.onmessage = (msg) => {
          let data = null;
          try {
            data = JSON.parse(msg.data);
          } catch (e) {
            console.warn("Invalid JSON", e);
            return;
          }

          if (data.type === "room-state" && data.participantId) {
            this.participantId = data.participantId;
          }

          if (data.type) this.emit(data.type, data);
        };

        this.ws.onerror = (e) => {
          console.warn("[SFU] ws error", e);
          reject(e);
        };

        this.ws.onclose = () => {
          this.connected = false;
          console.log("[SFU] ws closed");
        };
      } catch (err) {
        reject(err);
      }
    });
  }

  send(obj) {
    if (!obj || typeof obj !== "object") return;

    if (!obj.participantId && this.participantId) {
      obj.participantId = this.participantId;
    }

    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(obj));
    }
  }

  join(roomId, name) {
    this.send({
      type: "join",
      roomId,
      data: { participantName: name },
    });
  }

  leave(roomId, pid) {
    this.send({
      type: "leave",
      roomId,
      participantId: pid || this.participantId,
    });
  }

  sendOffer(roomId, from, to, sdp) {
    this.send({
      type: "offer",
      roomId,
      participantId: from,
      targetParticipantId: to,
      data: {
        type: sdp.type,
        sdp: sdp.sdp,
      },
    });
  }

  sendAnswer(roomId, from, to, sdp) {
    this.send({
      type: "answer",
      roomId,
      participantId: from,
      targetParticipantId: to,
      data: {
        type: sdp.type,
        sdp: sdp.sdp,
      },
    });
  }

  sendIceCandidate(roomId, from, to, candidate) {
    this.send({
      type: "ice-candidate",
      roomId,
      participantId: from,
      targetParticipantId: to,
      data: {
        candidate: candidate.candidate,
        sdpMid: candidate.sdpMid,
        sdpMLineIndex: candidate.sdpMLineIndex,
      },
    });
  }
}