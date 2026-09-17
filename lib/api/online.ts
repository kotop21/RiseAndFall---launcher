import { useState, useEffect } from "react";
import { API_ROUTES, type OnlineResponse } from "./client";
import { logger } from "@/lib/logger";

const HEARTBEAT_INTERVAL_MS = 45 * 1000;
const RETRY_INTERVAL_MS = 15 * 1000;
const REQUEST_TIMEOUT_MS = 15 * 1000;
const SESSION_STORAGE_KEY = "raf_session_key";

let inMemoryKey: string | null = null;
let currentOnline: number | null = null;
let isStarted = false;
let timerId: ReturnType<typeof setTimeout> | null = null;
const listeners = new Set<(count: number | null) => void>();

function notify(count: number | null) {
  currentOnline = count;
  for (const listener of listeners) {
    try {
      listener(count);
    } catch (err) {
      logger.error("online", "Listener callback error:", err);
    }
  }
}

function getStoredKey(): string | null {
  if (inMemoryKey) return inMemoryKey;
  try {
    if (typeof localStorage !== "undefined") {
      const stored = localStorage.getItem(SESSION_STORAGE_KEY);
      if (stored?.trim()) inMemoryKey = stored.trim();
    }
  } catch (err) {
    logger.error("online", "Failed to access localStorage for session key:", err);
  }
  return inMemoryKey;
}

function setStoredKey(key: string): boolean {
  if (typeof key !== "string" || !key.trim()) return false;
  const cleanKey = key.trim();
  const isNew = inMemoryKey !== cleanKey;
  inMemoryKey = cleanKey;
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(SESSION_STORAGE_KEY, inMemoryKey);
    }
  } catch (err) {
    logger.error("online", "Failed to persist session key to localStorage:", err);
  }
  return isNew;
}

export async function sendHeartbeat(): Promise<boolean> {
  const activeKey = getStoredKey();
  const headers: Record<string, string> = { Accept: "application/json" };
  if (activeKey) headers["x-session-key"] = activeKey;

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
      logger.error("online", `Heartbeat request failed with HTTP ${res.status}`);
      notify(null);
      return false;
    }

    const data = (await res.json()) as Partial<OnlineResponse>;
    if (data?.key?.trim()) setStoredKey(data.key);

    if (typeof data?.online === "number" && Number.isFinite(data.online) && data.online >= 0) {
      notify(data.online);
      return true;
    }

    notify(null);
    return false;
  } catch (err: unknown) {
    clearTimeout(timeoutId);
    const isAbort =
      (err instanceof Error && (err.name === "AbortError" || err.message === "AbortError")) ||
      controller.signal.aborted;

    if (isAbort) {
      logger.error("online", "Heartbeat request timed out");
    } else {
      logger.error("online", "Heartbeat network error:", err);
    }

    notify(null);
    return false;
  }
}

function scheduleNext(delayMs: number) {
  if (!isStarted) return;
  if (timerId) clearTimeout(timerId);
  timerId = setTimeout(async () => {
    try {
      const success = await sendHeartbeat();
      scheduleNext(success ? HEARTBEAT_INTERVAL_MS : RETRY_INTERVAL_MS);
    } catch (err) {
      logger.error("online", "Error in heartbeat scheduler cycle:", err);
      scheduleNext(RETRY_INTERVAL_MS);
    }
  }, delayMs);
}

export function startOnlineTracker() {
  if (isStarted) return;
  isStarted = true;
  sendHeartbeat()
    .then((success) => {
      scheduleNext(success ? HEARTBEAT_INTERVAL_MS : RETRY_INTERVAL_MS);
    })
    .catch((err) => {
      logger.error("online", "Failed initial heartbeat:", err);
      scheduleNext(RETRY_INTERVAL_MS);
    });
}

export function stopOnlineTracker() {
  if (timerId) {
    clearTimeout(timerId);
    timerId = null;
  }
  isStarted = false;
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
