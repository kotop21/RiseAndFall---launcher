import { isWindows } from "@/lib/utils/os";

export const GAME_INSTALL_DIR_NAME = "RiseAndFall-launcher";

/**
 * Гарантирует, что путь для установки игры всегда заканчивается на папку "RiseAndFall-launcher".
 *
 * Примеры:
 * - "D:" или "D:\" -> "D:\RiseAndFall-launcher"
 * - "D:\Games" -> "D:\Games\RiseAndFall-launcher"
 * - "D:\Games\RiseAndFall-launcher" -> "D:\Games\RiseAndFall-launcher"
 * - "/Users/user" -> "/Users/user/RiseAndFall-launcher"
 * - "/" -> "/RiseAndFall-launcher"
 */
export function ensureInstallDir(targetDir?: string | null): string {
  const trimmed = targetDir?.trim() || "";
  if (!trimmed) {
    return "";
  }

  // Убираем хвостовые слеши для анализа последнего сегмента пути
  const withoutTrailing = trimmed.replace(/[\\/]+$/, "");
  const segments = withoutTrailing.split(/[\\/]+/).filter(Boolean);
  const lastSegment = segments[segments.length - 1];

  // Если путь уже оканчивается на RiseAndFall-launcher (регистронезависимо)
  if (lastSegment && lastSegment.toLowerCase() === GAME_INSTALL_DIR_NAME.toLowerCase()) {
    return withoutTrailing;
  }

  // Корень диска Windows (например "D:" или "D:\")
  if (/^[a-zA-Z]:$/.test(withoutTrailing)) {
    return `${withoutTrailing}\\${GAME_INSTALL_DIR_NAME}`;
  }

  // Корень Unix ("/")
  if (withoutTrailing === "") {
    return `/${GAME_INSTALL_DIR_NAME}`;
  }

  // Определяем разделитель пути (обратный слэш для Windows, прямой для Unix)
  const hasBackslash = withoutTrailing.includes("\\");
  const hasForwardSlash = withoutTrailing.includes("/");
  const useBackslash = hasBackslash || (isWindows() && !hasForwardSlash);
  const sep = useBackslash ? "\\" : "/";

  return `${withoutTrailing}${sep}${GAME_INSTALL_DIR_NAME}`;
}
