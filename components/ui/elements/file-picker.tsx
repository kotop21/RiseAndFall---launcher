import { useCallback, type ReactNode } from "react";
import { spawn } from "node:child_process";
import { access } from "node:fs/promises";
import { join } from "node:path";
import { logger } from "@/lib/logger";

export interface FileDialogOptions {
  title?: string;
  defaultPath?: string;
  extensions?: string[];
  multiple?: boolean;
}

export interface FolderDialogOptions
  extends Omit<FileDialogOptions, "extensions"> {
  requiredFile?: string;
}

export interface FolderDialogResult {
  paths: string[];
  validPaths: string[];
}

async function checkFileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

function getPowershellPath(): string {
  const sysRoot =
    process.platform === "win32"
      ? process.env.SystemRoot || process.env.WINDIR
      : undefined;
  if (sysRoot) {
    return join(sysRoot, "System32", "WindowsPowerShell", "v1.0", "powershell.exe");
  }
  return "powershell.exe";
}

async function runProcess(cmd: string[]): Promise<string[] | null> {
  return new Promise<string[] | null>((resolve) => {
    try {
      const [executable, ...args] = cmd;
      const proc = spawn(executable, args, {
        stdio: ["ignore", "pipe", "pipe"],
        windowsHide: true,
      });

      let stdout = "";
      let stderr = "";

      proc.stdout?.on("data", (chunk) => {
        stdout += chunk.toString();
      });

      proc.stderr?.on("data", (chunk) => {
        stderr += chunk.toString();
      });

      proc.on("error", (err) => {
        logger.error("file-picker", "dialog process error", err);
        resolve(null);
      });

      proc.on("close", (exitCode) => {
        if (exitCode !== 0 || !stdout.trim()) {
          if (stderr.trim()) {
            logger.error("file-picker", `dialog process stderr: ${stderr.trim()}`);
          }
          resolve(null);
          return;
        }

        const lines = stdout
          .trim()
          .split(/\r?\n/)
          .map((p) => p.trim())
          .filter(Boolean);

        resolve(lines);
      });
    } catch (err) {
      logger.error("file-picker", "dialog execution error", err);
      resolve(null);
    }
  });
}

export async function openFileDialog(
  options: FileDialogOptions = {},
): Promise<string[] | null> {
  const {
    title = "Choose File",
    defaultPath,
    extensions = [],
    multiple = false,
  } = options;
  const platform = process.platform;

  if (platform === "darwin") {
    const sanitizedPath = defaultPath?.trim();
    const hasValidPath = Boolean(
      sanitizedPath && sanitizedPath.startsWith("/"),
    );

    let script = `set theFiles to choose file with prompt "${title.replace(/"/g, '\\"')}"`;
    if (hasValidPath) {
      script += ` default location POSIX file "${sanitizedPath!.replace(/"/g, '\\"')}"`;
    }
    if (extensions.length > 0) {
      const typesStr = extensions
        .map((ext) => `"${ext.replace(/^\./, "")}"`)
        .join(", ");
      script += ` of type {${typesStr}}`;
    }
    if (multiple) {
      script += ` with multiple selections allowed`;
    }
    script += `\nset posixPaths to {}\nrepeat with aFile in (theFiles as list)\nset end of posixPaths to POSIX path of aFile\nend repeat\nset AppleScript's text item delimiters to "\\n"\nreturn posixPaths as text`;

    return runProcess(["osascript", "-e", script]);
  }

  if (platform === "win32") {
    const filter =
      extensions.length > 0
        ? `Files (*.${extensions.join(";*.")})|*.${extensions.join(";*.")}|All files (*.*)|*.*`
        : "All files (*.*)|*.*";

    const multiselect = multiple ? "$d.Multiselect = $true;" : "";
    const cleanDefault = defaultPath?.trim();
    const normalizedDefault =
      cleanDefault && /^[a-zA-Z]:$/.test(cleanDefault)
        ? `${cleanDefault}\\`
        : cleanDefault;

    const initDir = normalizedDefault
      ? `$init = '${normalizedDefault.replace(/'/g, "''")}'; while ($init -and -not (Test-Path -LiteralPath $init)) { $p = Split-Path -Parent $init; if (-not $p -or $p -eq $init) { break; }; $init = $p; }; if ($init -and (Test-Path -LiteralPath $init)) { $d.InitialDirectory = $init; };`
      : "";

    const psCommand = `
      try {
        Add-Type -AssemblyName System.Windows.Forms -ErrorAction Stop;
        $f = New-Object System.Windows.Forms.Form -Property @{TopMost = $true};
        $d = New-Object System.Windows.Forms.OpenFileDialog;
        $d.Title = '${title.replace(/'/g, "''")}';
        $d.Filter = '${filter}';
        ${initDir}
        ${multiselect}
        if ($d.ShowDialog($f) -eq [System.Windows.Forms.DialogResult]::OK) {
          [Console]::WriteLine(($d.FileNames -join [Environment]::NewLine));
        };
        $f.Dispose();
        $d.Dispose();
      } catch {}
    `
      .replace(/\s+/g, " ")
      .trim();

    return runProcess([
      getPowershellPath(),
      "-NoProfile",
      "-NonInteractive",
      "-ExecutionPolicy",
      "Bypass",
      "-STA",
      "-Command",
      psCommand,
    ]);
  }

  if (platform === "linux") {
    const cmd = ["zenity", "--file-selection", `--title=${title}`];
    if (multiple) cmd.push("--multiple", "--separator=\n");
    if (defaultPath?.trim()) cmd.push(`--filename=${defaultPath.trim()}`);
    if (extensions.length > 0) {
      const pattern = extensions
        .map((e) => `*.${e.replace(/^\./, "")}`)
        .join(" ");
      cmd.push(`--file-filter=${pattern}`);
    }
    return runProcess(cmd);
  }

  return null;
}

export async function openFolderDialog(
  options: FolderDialogOptions = {},
): Promise<FolderDialogResult | null> {
  const {
    title = "Choose Folder",
    defaultPath,
    multiple = false,
    requiredFile,
  } = options;
  const platform = process.platform;
  let rawPaths: string[] | null = null;

  if (platform === "darwin") {
    const sanitizedPath = defaultPath?.trim();
    const hasValidPath = Boolean(
      sanitizedPath && sanitizedPath.startsWith("/"),
    );

    let script = `set theFolders to choose folder with prompt "${title.replace(/"/g, '\\"')}"`;
    if (hasValidPath) {
      script += ` default location POSIX file "${sanitizedPath!.replace(/"/g, '\\"')}"`;
    }
    if (multiple) {
      script += ` with multiple selections allowed`;
    }
    script += `\nset posixPaths to {}\nrepeat with aFolder in (theFolders as list)\nset end of posixPaths to POSIX path of aFolder\nend repeat\nset AppleScript's text item delimiters to "\\n"\nreturn posixPaths as text`;

    rawPaths = await runProcess(["osascript", "-e", script]);
  } else if (platform === "win32") {
    const cleanDefault = defaultPath?.trim();
    const normalizedDefault =
      cleanDefault && /^[a-zA-Z]:$/.test(cleanDefault)
        ? `${cleanDefault}\\`
        : cleanDefault;

    const initDir = normalizedDefault
      ? `$init = '${normalizedDefault.replace(/'/g, "''")}'; while ($init -and -not (Test-Path -LiteralPath $init)) { $p = Split-Path -Parent $init; if (-not $p -or $p -eq $init) { break; }; $init = $p; }; if ($init -and (Test-Path -LiteralPath $init)) { $d.SelectedPath = $init; };`
      : "";

    const escapedTitle = title.replace(/'/g, "''");
    const psCommand = `
      try {
        Add-Type -AssemblyName System.Windows.Forms -ErrorAction Stop;
        $f = New-Object System.Windows.Forms.Form -Property @{TopMost = $true};
        $d = New-Object System.Windows.Forms.FolderBrowserDialog;
        $d.Description = '${escapedTitle}';
        ${initDir}
        if ($d.ShowDialog($f) -eq [System.Windows.Forms.DialogResult]::OK) {
          [Console]::WriteLine($d.SelectedPath);
        };
        $f.Dispose();
        $d.Dispose();
      } catch {
        $s = New-Object -ComObject Shell.Application;
        $b = $s.BrowseForFolder(0, '${escapedTitle}', 17, 0);
        if ($b) {
          [Console]::WriteLine($b.Self.Path);
        };
      }
    `
      .replace(/\s+/g, " ")
      .trim();

    rawPaths = await runProcess([
      getPowershellPath(),
      "-NoProfile",
      "-NonInteractive",
      "-ExecutionPolicy",
      "Bypass",
      "-STA",
      "-Command",
      psCommand,
    ]);
  } else if (platform === "linux") {
    const cmd = [
      "zenity",
      "--file-selection",
      "--directory",
      `--title=${title}`,
    ];
    if (multiple) cmd.push("--multiple", "--separator=\n");
    if (defaultPath?.trim()) cmd.push(`--filename=${defaultPath.trim()}`);
    rawPaths = await runProcess(cmd);
  }

  if (!rawPaths || rawPaths.length === 0) {
    return null;
  }

  if (!requiredFile) {
    return { paths: rawPaths, validPaths: rawPaths };
  }

  const cleanReq = requiredFile.replace(/^[\\/]+/, "");
  const validPaths: string[] = [];

  for (const root of rawPaths) {
    const cleanRoot = root.replace(/[\\/]+$/, "");
    const targetFilePath = join(cleanRoot, cleanReq);
    const exists = await checkFileExists(targetFilePath);
    if (exists) {
      validPaths.push(root);
    }
  }

  return { paths: rawPaths, validPaths };
}

export function useFileDialog() {
  const pickFile = useCallback(
    async (options: FileDialogOptions = {}): Promise<string | null> => {
      const paths = await openFileDialog({ ...options, multiple: false });
      return paths && paths.length > 0 ? paths[0] : null;
    },
    [],
  );

  const pickFiles = useCallback(
    async (options: FileDialogOptions = {}): Promise<string[] | null> => {
      return await openFileDialog({ ...options, multiple: true });
    },
    [],
  );

  const pickFolder = useCallback(
    async (
      options: FolderDialogOptions = {},
    ): Promise<string | { path: string; isValid: boolean } | null> => {
      const res = await openFolderDialog({ ...options, multiple: false });
      if (!res || res.paths.length === 0) return null;

      const chosenPath = res.paths[0];
      if (options.requiredFile) {
        return {
          path: chosenPath,
          isValid: res.validPaths.includes(chosenPath),
        };
      }
      return chosenPath;
    },
    [],
  );

  const pickFolders = useCallback(
    async (
      options: FolderDialogOptions = {},
    ): Promise<string[] | { paths: string[]; validPaths: string[] } | null> => {
      const res = await openFolderDialog({ ...options, multiple: true });
      if (!res || res.paths.length === 0) return null;

      if (options.requiredFile) {
        return res;
      }
      return res.paths;
    },
    [],
  );

  return { pickFile, pickFiles, pickFolder, pickFolders };
}

export interface FilePickerTriggerProps extends FolderDialogOptions {
  children: (props: { pick: () => void }) => ReactNode;
  mode?: "file" | "folder";
  extensions?: string[];
  onSelect: (paths: any) => void;
}

export function FilePickerTrigger({
  children,
  mode = "file",
  onSelect,
  ...options
}: FilePickerTriggerProps) {
  const { pickFile, pickFiles, pickFolder, pickFolders } = useFileDialog();

  const handlePick = async () => {
    if (mode === "folder") {
      if (options.multiple) {
        const res = await pickFolders(options);
        if (res) onSelect(res);
      } else {
        const res = await pickFolder(options);
        if (res) onSelect(res);
      }
    } else {
      if (options.multiple) {
        const res = await pickFiles(options);
        if (res) onSelect(res);
      } else {
        const res = await pickFile(options);
        if (res) onSelect(res);
      }
    }
  };

  return <>{children({ pick: handlePick })}</>;
}
