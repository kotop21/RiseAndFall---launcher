import { connect, type Socket } from "node:net";
import { join } from "node:path";
import { existsSync } from "node:fs";
import { logger } from "@/lib/logger";
import type { DiscordActivity } from "./types";

const CLIENT_ID = "1522886092452266075";
const OP_HANDSHAKE = 0;
const OP_FRAME = 1;
const OP_CLOSE = 2;

function getIpcPath(id = 0): string {
  if (process.platform === "win32") {
    return `\\\\?\\pipe\\discord-ipc-${id}`;
  }

  const envDir =
    process.env.XDG_RUNTIME_DIR ||
    process.env.TMPDIR ||
    process.env.TMP ||
    process.env.TEMP ||
    "/tmp";

  return join(envDir, `discord-ipc-${id}`);
}

export class DiscordRpcClient {
  private socket: Socket | null = null;
  private isConnected = false;
  private isConnecting = false;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private currentActivity: DiscordActivity | null = null;
  private enabled = true;

  constructor() {
    this.connect = this.connect.bind(this);
  }

  public setEnabled(enabled: boolean) {
    this.enabled = enabled;
    if (!enabled) {
      this.disconnect();
    } else if (!this.isConnected && !this.isConnecting) {
      this.connect();
    }
  }

  public connect(): void {
    if (!this.enabled || this.isConnected || this.isConnecting) return;
    this.isConnecting = true;

    let socketPath = "";
    if (process.platform === "win32") {
      socketPath = getIpcPath(0);
    } else {
      for (let i = 0; i < 10; i++) {
        const p = getIpcPath(i);
        if (existsSync(p)) {
          socketPath = p;
          break;
        }
      }
      if (!socketPath) socketPath = getIpcPath(0);
    }

    const sock = connect(socketPath);
    this.socket = sock;

    sock.once("connect", () => {
      this.isConnecting = false;
      this.isConnected = true;
      logger.info("discord-rpc", `Connected to Discord IPC: ${socketPath}`);

      const handshakePayload = JSON.stringify({
        v: 1,
        client_id: CLIENT_ID,
      });
      this.send(OP_HANDSHAKE, handshakePayload);

      if (this.currentActivity) {
        this.sendActivity(this.currentActivity);
      }
    });

    sock.on("data", () => {});

    sock.on("error", (err: any) => {
      if (this.isConnected) {
        logger.error("discord-rpc", "Socket connection error:", err.message);
      }
      this.cleanup();
      this.scheduleReconnect();
    });

    sock.once("close", () => {
      if (this.isConnected) {
        logger.info("discord-rpc", "Discord connection closed or Discord exited.");
      }
      this.cleanup();
      this.scheduleReconnect();
    });
  }

  private send(op: number, payload: string): void {
    if (!this.socket || !this.isConnected) return;
    try {
      const dataBuffer = Buffer.from(payload, "utf-8");
      const header = Buffer.alloc(8);
      header.writeInt32LE(op, 0);
      header.writeInt32LE(dataBuffer.length, 4);
      this.socket.write(Buffer.concat([header, dataBuffer]));
    } catch (err: any) {
      logger.error("discord-rpc", "Failed to send packet:", err.message);
    }
  }

  public setActivity(activity: DiscordActivity): void {
    this.currentActivity = activity;
    if (this.isConnected) {
      this.sendActivity(activity);
    } else if (this.enabled && !this.isConnecting) {
      this.connect();
    }
  }

  public clearActivity(): void {
    this.currentActivity = null;
    if (this.isConnected) {
      this.sendActivity(null);
    }
  }

  private sendActivity(activity: DiscordActivity | null): void {
    const payload = JSON.stringify({
      cmd: "SET_ACTIVITY",
      args: {
        pid: process.pid,
        activity,
      },
      nonce: `${Date.now()}_${Math.random()}`,
    });
    this.send(OP_FRAME, payload);
  }

  public disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.socket) {
      try {
        this.send(OP_CLOSE, "{}");
        this.socket.destroy();
      } catch {}
    }
    this.cleanup();
  }

  private cleanup(): void {
    this.socket = null;
    this.isConnected = false;
    this.isConnecting = false;
  }

  private scheduleReconnect(): void {
    if (!this.enabled || this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (this.enabled && !this.isConnected && !this.isConnecting) {
        this.connect();
      }
    }, 15000);
  }
}
