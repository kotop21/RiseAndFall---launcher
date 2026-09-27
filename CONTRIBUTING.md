# Contributing to Rise & Fall Launcher

Thank you for your interest in contributing to the **Rise & Fall Launcher**! This document provides technical guidelines and policies to ensure smooth collaboration and high code quality.

---

## 🌐 1. Language Policy (STRICT)

> [!IMPORTANT]
> **Official Project Communication Languages: English (EN) and Ukrainian (UA).**
> - All **Pull Requests**, **Issues**, **Commit Messages**, **Code Comments**, and **Discussions** must be written exclusively in **English** or **Українською мовою** (regardless of in-app localization files).
> - Submissions in any other language will be closed or asked to be rewritten in one of the supported languages.

---

## 🌲 2. Branching Strategy

We follow a structured Git branching workflow:

| Branch / Pattern | Purpose | Policies |
| :--- | :--- | :--- |
| `develop` | **Active Integration Branch** | All PRs must target this branch. Pushes automatically trigger `dev.yml` (compiles dev launcher with console enabled + runs tests on Ubuntu). |
| `main` | **Stable Production Branch** | Direct commits are **strictly prohibited**. Code merges into `main` exclusively via approved Pull Requests from `develop`. Pushes trigger `main.yml` (production binary compile + tests). |
| `v*` *(Tags)* | **Release Snapshots** | Pushing a tag (e.g. `v2.0.0`) triggers `release.yml`. If all unit tests pass, it packages the release archive and automatically generates a **GitHub Draft Release**. |

---

## 🔄 3. Contribution Workflow

### Step 1: Fork & Clone
```bash
git clone https://github.com/<your-username>/RiseAndFall---launcher.git
cd RiseAndFall---launcher
git checkout develop
```

### Step 2: Create a Topic Branch
Always branch off from `develop` and follow the branch naming conventions:
- `feat/<feature-name>` — New feature or capability
- `fix/<bug-description>` — Bug fix or error resolution
- `refactor/<module-name>` — Code restructuring without altering external behavior
- `test/<test-scope>` — Adding or improving unit/integration tests
- `docs/<topic>` — Documentation changes or additions
- `chore/<task>` — Build scripts, dependencies, or repository maintenance

```bash
git checkout -b feat/custom-resolution-selector
```

### Step 3: Implement & Validate Locally
Make your changes following the architectural patterns of the repository:
- Keep React views in `app/views/` concise and delegate UI/logic to domain components in `components/<domain>/`.
- If you add or change user-facing text, ensure the keys are added to all language dictionaries in [`lang/`](lang/) (`en.json`, `ua.json`, `ru.json`).
- If you modify file cleanup routines in [`lib/explorer/clean.ts`](lib/explorer/clean.ts), always preserve user save files (`Data/Saved Games`).

### Step 4: Run Tests & Typechecks
Before committing, you **must** verify that all TypeScript types and unit tests pass:
```bash
# Runs tsc --noEmit && bun test
bun run prebuild
```
> [!NOTE]
> All unit tests run in silent mode via `logger.silence(true)`, ensuring zero terminal spam during test execution.

### Step 5: Commit using Conventional Commits
All commit messages must follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:
```
<type>(<optional scope>): <description in EN or UA>
```

**Allowed types:**
- `feat:` — Introduces a new feature
- `fix:` — Fixes a bug
- `refactor:` — Code changes that neither fix a bug nor add a feature
- `test:` — Adds missing tests or corrects existing tests
- `docs:` — Documentation only changes
- `chore:` — Changes to build processes, auxiliary tools, or libraries

**Examples:**
```bash
git commit -m "feat(updater): add automatic release check with unobtrusive toast"
git commit -m "fix(registry): safely fallback when display resolution key is absent"
git commit -m "docs: оновити інструкцію зі збирання лаунчера"
```

### Step 6: Submit a Pull Request
1. Push your branch to your fork:
   ```bash
   git push origin feat/custom-resolution-selector
   ```
2. Open a Pull Request targeting the **`develop`** branch of `kotop21/RiseAndFall---launcher`.
3. Provide a clear description of what changed, why it changed, and how it was tested.
4. Verify that all automated GitHub Actions CI checks pass on your PR.

---

## 💻 4. Local Development & Debugging

### Quick Setup & Dev Server
```bash
# 1. Install project dependencies
bun install

# 2. (Optional) Build the Go settings CLI helper
cd packages/raf-settings
go build -ldflags="-s -w" -o raf-settings.exe .
cd ../..
mkdir -p dist/bin
cp packages/raf-settings/raf-settings.exe dist/bin/

# 3. Launch launcher in dev mode
bun run dev
```

### Running the Test Suite
We use Bun's built-in fast test runner (`bun:test`):
```bash
# Run all 68+ unit tests
bun test

# Run a specific test file
bun test test/config.test.ts

# Run tests in watch mode during development
bun test --watch
```

### Building the Windows Binary Locally (Docker + Python)
The project provides an automated build system managed by [`build.py`](build.py) and [`Dockerfile`](Dockerfile):

```bash
# Development build (console terminal enabled)
bun run build

# Production release build (no console window)
RELEASE=1 bun run build
```
This script automatically:
1. Validates that Docker is running.
2. Ensures the `@gpuix` Windows native addon is available.
3. Generates version stamps and bundles source code with N-API glue.
4. Runs a Debian container with Deno Canary QuickJS to compile `dist/raf-launcher.exe`.

---

## 🛡️ 5. Code Style & Standards

- **TypeScript:** Strict mode enabled. Avoid `any`; use well-defined interfaces and discriminated unions in `lib/*/types.ts`.
- **Modularity:** Separate business logic and filesystem operations from React UI components. Place domain logic in [`lib/`](lib/) and presentation components in [`components/`](components/).
- **Error Handling:** Use `LauncherAppError` and the centralized error normalizer in [`lib/errors/`](lib/errors/) for consistent error handling and user-friendly toasts.
- **Security:** Do not commit hardcoded credentials, local directory paths, or sensitive keys. Keep environment configurations in `.env`.
