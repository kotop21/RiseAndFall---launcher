# Developer Launch Arguments

These command-line arguments are active in **development mode** — both when running from source (`bun run dev` / `bun index.tsx`) and in compiled **dev builds** (from `.github/workflows/dev.yml` or `build.py` without `RELEASE=1`).

In **production builds** (`main.yml`, `release.yml`, or `RELEASE=1`), `scripts/build-bundle.js --mode=prod` injects `IS_DEV=false` and physically strips `@/lib/dev*` and `@/components/dev*`, replacing them with zero-overhead stubs.

## API Selection Behavior in Dev Mode

On startup, dev builds automatically choose the active API base URL:
1. If `--api <url>` is passed, it uses `<url>`.
2. If `--prod` / `--prod-api` is passed, it immediately uses `PROD_API_URL`.
3. Otherwise, it probes `{DEV_API_URL}/health` (800ms timeout):
   - If healthy (`200 OK`), the session uses `DEV_API_URL`.
   - If unreachable, it automatically falls back to `PROD_API_URL`.

## Overview

| Argument                | Aliases                                   | Description |
| :---------------------- | :---------------------------------------- | :---------- |
| `--api <url>`           | `--api-url`                               | Override backend API base URL for this launch (e.g. `http://192.168.1.50:3000`). |
| `--prod`                | `--prod-api`                              | Force the launcher to connect directly to `PROD_API_URL`, skipping the dev `/health` probe. |
| `--dev-menu`            | —                                         | Enable the developer UI overlay/menu hook (`DevOverlay`). |
| `--force-welcome`       | —                                         | Force opening the Welcome flow on launch (dev-only). |
| `--allow-self-update`   | —                                         | Allow compiled dev `.exe` to apply self-updates instead of stopping at staging verification. |
| `--lang <en\|ua\|ru>`   | `--language`, `-l`                        | Force launcher interface language (`en`, `ua`, `ru`) and disable OS auto-detection. |
| `--view <name>`         | `-v`                                      | Directly open a specific view on launch (`welcome`, `main`, `settings`, `install`). |
| `--release`             | `-r`, `--windows`, `-w`, `--mock-release` | Emulate a Windows release environment (`isWindows()` and CLI availability return `true`). |
| `--low-spec`            | `--low-performance`                       | Run the adaptive render loop in low performance mode (capped framerate). |
| `--log-file`            | `--file-logs`, `--enable-log-file`        | Enable writing log files to disk (`logs/launcher_*.log`) in dev mode. |
| `--show-all-badges`     | `--all-badges`                            | Force all feature badges in the UI to be visible simultaneously. |
| `--reset-badges`        | `--clear-badges`                          | Simulate an unread state (empty `seenBadges`). |
| `--unread-badges <ids>` | `--badges`                                | Force a comma-separated list of feature IDs to be unread. |

## Usage Examples

```bash
# Run dev build against a specific local/LAN backend
raf-launcher.exe --api http://192.168.1.15:3000

# Force dev build to talk directly to production API
raf-launcher.exe --prod

# Run with Ukrainian localization & jump straight to Settings
bun run dev -- --lang ua --view settings

# Emulate Windows environment on macOS/Linux
bun run dev -- -r

# Reset badges to test hover/click dismissal
bun run dev -- --reset-badges
```
