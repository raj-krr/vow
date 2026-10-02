
const BASE_URL = import.meta.env.VITE_SOCKET_URL;

export default class SfuSignalingClient {
  constructor(token = null) {
    this.ws = null;
    this.connected = false;
    this.handlers = new Map();
    this.token = token || localStorage.getItem("accessToken");
    this.participantId = null;
    this._reconnecting = false;
    this._reconnectAttempts = 0;
    this._maxReconnectAttempts = 10;
    this._reconnectBaseDelay = 1000;
    this._intentionalClose = false;
  }

  on(type, fn) {
    if (!this.handlers.has(type)) this.handlers.set(type, new Set());
    this.handlers.get(type).add(fn);
  }

  off(type, fn) {
    if (!this.handlers.has(type)) return;
    this.handlers.get(type).delete(fn);
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

    const isHttps =
      typeof window !== "undefined" && window.location.protocol === "https:";

    if (isHttps) {
      // Insecure ws:// connections are strictly blocked by browsers on HTTPS pages
      if (base.startsWith("http://")) {
        base = base.replace(/^http:\/\//i, "wss://");
      } else if (base.startsWith("https://")) {
        base = base.replace(/^https:\/\//i, "wss://");
      } else if (base.startsWith("ws://")) {
        base = base.replace(/^ws:\/\//i, "wss://");
      } else if (!base.startsWith("wss://")) {
        base = "wss://" + base;
      }
    } else {
      if (base.startsWith("https://")) {
        base = base.replace(/^https:\/\//i, "wss://");
      } else if (base.startsWith("http://")) {
        base = base.replace(/^http:\/\//i, "ws://");
      } else if (!base.startsWith("ws://") && !base.startsWith("wss://")) {
        base = "ws://" + base;
      }
    }

    return base.replace(/\/+$/, "") + "/signaling";
  }

  connect() {
    return new Promise((resolve, reject) => {
      try {
        const url = this._buildWsUrl();

        this.ws = new WebSocket(url);
        this._intentionalClose = false;

        this.ws.onopen = () => {
          this.connected = true;
          this._reconnecting = false;
          this._reconnectAttempts = 0;
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
          if (!this.connected) {
            reject(e);
          }
        };

        this.ws.onclose = () => {
          const wasConnected = this.connected;
          this.connected = false;
          console.log("[SFU] ws closed");

          // Auto-reconnect if not intentionally closed
          if (!this._intentionalClose && wasConnected) {
            this._attemptReconnect();
          }
        };
      } catch (err) {
        reject(err);
      }
    });
  }

  _attemptReconnect() {
    if (this._reconnecting || this._intentionalClose) return;
    if (this._reconnectAttempts >= this._maxReconnectAttempts) {
      console.error("[SFU] Max reconnect attempts reached, giving up");
      return;
    }

    this._reconnecting = true;
    this._reconnectAttempts++;

    // Exponential backoff with jitter
    const delay = Math.min(
      this._reconnectBaseDelay * Math.pow(2, this._reconnectAttempts - 1) +
        Math.random() * 500,
      30000
    );

    console.log(
      `[SFU] Reconnecting in ${Math.round(delay)}ms (attempt ${this._reconnectAttempts}/${this._maxReconnectAttempts})`
    );

    setTimeout(async () => {
      try {
        await this.connect();
        console.log("[SFU] Reconnected successfully");

        // Re-join the room if we were in one
        if (this.participantId) {
          this.emit("reconnected", { participantId: this.participantId });
        }
      } catch (err) {
        console.warn("[SFU] Reconnect attempt failed:", err);
        this._reconnecting = false;
        this._attemptReconnect();
      }
    }, delay);
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

  disconnect() {
    this._intentionalClose = true;
    this.connected = false;
    this._reconnecting = false;
    if (this.ws) {
      try {
        this.ws.onopen = null;
        this.ws.onmessage = null;
        this.ws.onerror = null;
        this.ws.onclose = null;
        this.ws.close();
      } catch (_) {}
      this.ws = null;
    }
    this.handlers.clear();
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