import { describe, expect, it } from "bun:test";
import { discordRpc } from "@/lib/discord-rpc";

describe("Discord RPC: Service Lifecycle", () => {
  it("initializes disabled without throwing", () => {
    expect(() => discordRpc.init(false)).not.toThrow();
  });

  it("handles state transitions smoothly", () => {
    expect(() => discordRpc.setEnabled(false)).not.toThrow();
    expect(() => discordRpc.setGameRunning(true)).not.toThrow();
    expect(() => discordRpc.setGameRunning(false)).not.toThrow();
    expect(() => discordRpc.destroy()).not.toThrow();
  });
});
