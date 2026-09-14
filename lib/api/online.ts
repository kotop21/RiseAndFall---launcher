import { useState, useEffect } from "react";
import { API_ROUTES, type OnlineResponse } from "./client";

const HEARTBEAT_INTERVAL_MS = 45 * 1000;
const RETRY_INTERVAL_MS = 10 * 1000;
const REQUEST_TIMEOUT_MS = 5 * 1000;
const SESSION_STORAGE_KEY = "raf_session_key";

let inMemoryKey: string | null = null;
let currentOnline: number | null = null;
let isStarted = false;
let timerId: ReturnType<typeof setTimeout> | null = null;
const listeners = new Set<(count: number | null) => void>();

function notify(count: number | null) {
  currentOnline = count;
  for (const listener of listeners) {
    listener(count);
  }
}

function getStoredKey(): string | null {
  if (inMemoryKey) return inMemoryKey;
  try {
    if (typeof localStorage !== "undefined") {
      const stored = localStorage.getItem(SESSION_STORAGE_KEY);
      if (stored && typeof stored === "string" && stored.trim().length > 0) {
        inMemoryKey = stored.trim();
      }
    }
  } catch {}
  return inMemoryKey;
}

function setStoredKey(key: string) {
  if (typeof key !== "string" || !key.trim()) return;
  inMemoryKey = key.trim();
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(SESSION_STORAGE_KEY, inMemoryKey);
    }
  } catch {}
}

export async function sendHeartbeat(): Promise<boolean> {
  const activeKey = getStoredKey();
  const headers: Record<string, string> = {
    Accept: "application/json",
  };

  if (activeKey) {
    headers["x-session-key"] = activeKey;
  }

  console.log("Online: sending heartbeat request");

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const res = await fetch(API_ROUTES.online, {
      method: "GET",
      headers,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      console.log(`Online: server returned status ${res.status}`);
      notify(null);
      return false;
    }

    const rawData: unknown = await res.json();
    if (!rawData || typeof rawData !== "object") {
      console.log("Online: invalid payload structure received");
      notify(null);
      return false;
    }

    const data = rawData as Partial<OnlineResponse>;

    if (typeof data.key === "string" && data.key.trim().length > 0) {
      setStoredKey(data.key);
      console.log("Online: session key updated");
    }

    if (
      typeof data.online === "number" &&
      Number.isFinite(data.online) &&
      data.online >= 0
    ) {
      notify(data.online);
      console.log(`Online: updated to ${data.online}`);
      return true;
    }

    notify(null);
    return false;
  } catch (err: unknown) {
    clearTimeout(timeoutId);
    console.log("Online: connection failed or timed out");
    notify(null);
    return false;
  }
}

function scheduleNext(delayMs: number) {
  if (!isStarted) return;
  if (timerId) {
    clearTimeout(timerId);
  }
  timerId = setTimeout(async () => {
    const success = await sendHeartbeat();
    scheduleNext(success ? HEARTBEAT_INTERVAL_MS : RETRY_INTERVAL_MS);
  }, delayMs);
}

export function startOnlineTracker() {
  if (isStarted) return;
  isStarted = true;
  console.log("Online: tracker started");

  sendHeartbeat().then((success) => {
    scheduleNext(success ? HEARTBEAT_INTERVAL_MS : RETRY_INTERVAL_MS);
  });
}

export function stopOnlineTracker() {
  if (timerId) {
    clearInterval(timerId);
    timerId = null;
  }
  isStarted = false;
  console.log("Online: tracker stopped");
}

export function useOnlineTracker(): number | null {
  const [online, setOnline] = useState<number | null>(currentOnline);

  useEffect(() => {
    listeners.add(setOnline);
    startOnlineTracker();

    return () => {
      listeners.delete(setOnline);
    };
  }, []);

  return online;
}
