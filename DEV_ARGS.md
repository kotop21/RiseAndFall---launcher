# Developer Launch Arguments

These command-line arguments are active **only in development mode** (when running via `bun run dev` or `bun index.tsx`). In production releases (`raf-launcher.exe`), dev arguments are completely inactive and do not alter default runtime behavior.

## Overview

| Argument | Aliases | Description |
| :--- | :--- | :--- |
| `--lang <en\|ua\|ru>` | `--language`, `-l` | Force launcher interface language (`en`, `ua`, `ru`) and **automatically disable language auto-detection** (`detectSystemLanguage`). |
| `--view <name>` | `-v` | Directly open a specific view on launch (`welcome`, `main`, `settings`, `install`). |
| `--release` | `-r`, `--windows`, `-w`, `--mock-release` | Emulate a full Windows release environment: `isWindows()` returns `true` and `isCliAvailable` returns `true` (enabling dgVoodoo buttons, registry export/import actions, and Windows toast workflows on macOS/Linux). |
| `--low-spec` | `--low-performance` | Run the adaptive render loop in battery-saving low performance mode (capped framerate). |
| `--log-file` | `--file-logs`, `--enable-log-file` | Enable writing log files to disk (`logs/launcher_*.log`). *(In dev mode, disk logging is disabled by default to prevent file clutter, while console output remains active).* |

## Usage Examples

```bash
# Run with Ukrainian localization (auto-detect disabled)
bun run dev -- --lang ua

# Run with English localization
bun run dev -- -l en

# Directly open Settings view for rapid UI iteration
bun run dev -- --view settings

# Directly open Install view with Ukrainian language
bun run dev -- -v install -l ua

# Directly open Welcome view
bun run dev -- -v welcome

# Emulate Windows release environment (test Windows UI/buttons/toasts on macOS)
bun run dev -- -r
# or
bun run dev -- -w

# Run in low-spec mode
bun run dev -- --low-spec

# Enable file logging in dev mode
bun run dev -- --log-file
```
