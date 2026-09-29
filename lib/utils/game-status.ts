import { useState, useEffect, useCallback, useRef } from "react";
import { hasRiseAndFallExe, hasDgVoodooCplExe } from "./game-files";
import { hasSettingsCli } from "@/lib/settings-cli";

export interface GameStatus {
  gameExists: boolean;
  dgVoodooExists: boolean;
  cliExists: boolean;
  isValidating: boolean;
  recheck: () => Promise<void>;
}

// Кэш статуса файлов по пути директории в оперативной памяти
const statusCache = new Map<
  string,
  {
    gameExists: boolean;
    dgVoodooExists: boolean;
    cliExists: boolean;
    timestamp: number;
  }
>();

const CACHE_TTL_MS = 15000;
const globalListeners = new Set<() => void>();

function notifyListeners() {
  for (const listener of globalListeners) {
    try {
      listener();
    } catch {}
  }
}

export async function checkGameFiles(gameDir?: string | null, forceRefresh = false) {
  const cleanDir = gameDir?.trim() || "";
  const now = Date.now();
  const cached = statusCache.get(cleanDir);

  if (!forceRefresh && cached && now - cached.timestamp < CACHE_TTL_MS) {
    return cached;
  }

  const [gameExists, dgVoodooExists] = await Promise.all([
    hasRiseAndFallExe(cleanDir),
    hasDgVoodooCplExe(cleanDir),
  ]);
  const cliExists = hasSettingsCli(forceRefresh);

  const result = {
    gameExists,
    dgVoodooExists,
    cliExists,
    timestamp: now,
  };

  statusCache.set(cleanDir, result);
  return result;
}

export function invalidateGameStatusCache(gameDir?: string | null) {
  if (gameDir) {
    statusCache.delete(gameDir.trim());
  } else {
    statusCache.clear();
  }
  notifyListeners();
}

export function useGameStatus(gameDir?: string | null): GameStatus {
  const cleanDir = gameDir?.trim() || "";
  const [status, setStatus] = useState(() => {
    const cached = statusCache.get(cleanDir);
    return {
      gameExists: cached?.gameExists ?? false,
      dgVoodooExists: cached?.dgVoodooExists ?? false,
      cliExists: cached?.cliExists ?? hasSettingsCli(),
      isValidating: !cached,
    };
  });

  const isMountedRef = useRef(true);

  const recheck = useCallback(
    async (force = true) => {
      setStatus((prev) => ({ ...prev, isValidating: true }));
      const res = await checkGameFiles(cleanDir, force);
      if (isMountedRef.current) {
        setStatus({
          gameExists: res.gameExists,
          dgVoodooExists: res.dgVoodooExists,
          cliExists: res.cliExists,
          isValidating: false,
        });
      }
    },
    [cleanDir],
  );

  useEffect(() => {
    isMountedRef.current = true;
    recheck(false);

    const onGlobalChange = () => {
      recheck(false);
    };
    globalListeners.add(onGlobalChange);

    // Автоматическая проверка при возвращении фокуса в окно лаунчера
    const onFocus = () => {
      recheck(true);
    };

    if (typeof window !== "undefined") {
      window.addEventListener?.("focus", onFocus);
    }

    // Фоновая проверка раз в 15 секунд при открытом окне
    const interval = setInterval(() => {
      recheck(false);
    }, 15000);

    return () => {
      isMountedRef.current = false;
      globalListeners.delete(onGlobalChange);
      clearInterval(interval);
      if (typeof window !== "undefined") {
        window.removeEventListener?.("focus", onFocus);
      }
    };
  }, [cleanDir, recheck]);

  return {
    ...status,
    recheck: () => recheck(true),
  };
}
