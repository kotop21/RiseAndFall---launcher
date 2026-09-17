# raf-settings

CLI tool for exporting and importing **Rise and Fall: Civilizations at War** settings via the Windows Registry.

---

### `export`

Exports current game settings from `HKCU\Software\Midway Home Entertainment\Rise and Fall` to a sanitized JSON file. Automatically skips hardware IDs, local installation paths, accounts, secrets, and session cache.

```bash
raf-settings.exe export <target_directory>

```

* **Arguments:**
* `<target_directory>` (string, required): Directory where the output file will be created.


* **Output:**
* Generates `raf-settings.json`.
* If the file already exists, appends an incremental numeric suffix: `raf-settings-1.json`, `raf-settings-2.json`, etc.


* **Exit Codes:**
* `0`: Export successful.
* `1`: Error (missing registry keys, invalid path, or non-Windows OS).



---

### `import`

Validates and writes configuration data from JSON directly into the registry. Ignores any sensitive, machine-specific, or local path entries if present in the payload.

```bash
raf-settings.exe import <json_file_path>

```

* **Arguments:**
* `<json_file_path>` (string, required): Full or relative path to a settings JSON file.


* **Validation:**
* Requires `"game": "Rise and Fall: Civilizations at War"`.
* Verifies section path safety (rejects path traversal `..` or illegal characters).
* Enforces `DWORD` bounds (`uint32`) and maximum string lengths.


* **Output:**
* Restores valid `DWORD` and `REG_SZ` (string) values into `HKCU\Software\Midway Home Entertainment\Rise and Fall`.


* **Exit Codes:**
* `0`: Import successful.
* `1`: Error (validation failed, file not found, permission denied, or non-Windows OS).



---

### Security & Sanitization Policy

The following keys are strictly excluded from both export and import:

* **Secrets & Accounts:** `GameSpy CD Key`, `GameSpy Password`, `GameSpy Remember Password`, `GameSpy Account Name`, `Player Name`, `Host Game Name`, `MatchMaking.com Game Name`, `GameSpy Last Game Created`, `GameSpy Last Max Players`, `GameSpy Allow Buddy Chat`, `GameSpy Automatch *`.
* **Hardware & System:** `Graphics Device ID`, `Graphics Vendor ID`, `Graphics Autodetect Version`, `Network Adapter`, `System RAM Size`, `Rasterizer Name`.
* **Local Paths:** `Install Directory`, `Rise Install`.
* **Session Cache & Saves:** `Last Auto Save`, `Last Game File`, `Last Quick Save`, `Last Scenario File`, `Last Open Post Game Stats Page`.
* **Registry Markers:** `Rise and Fall`, `Version Number`.

---

### Payload Structure

```json
{
  "version": "1.0",
  "game": "Rise and Fall: Civilizations at War",
  "settings": {
    "root": {
      "Game Window Width": 1024,
      "Game Window Height": 768,
      "Sound Volume": 100,
      "Music Volume": 68
    },
    "Game Options": {
      "Difficulty Level": 1,
      "Game Speed": 1,
      "Map Type": "Random"
    },
    "Graphics Settings": {
      "Model Quality Level": 2,
      "Texture Quality Level": 2
    },
    "3P": {
      "3P Mouse Sensitivity": 3
    }
  }
}

```
