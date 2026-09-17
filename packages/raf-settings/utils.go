package main

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"
)

const (
	RootRegistryPath = `Software\Midway Home Entertainment\Rise and Fall`
	DefaultFileName  = "raf-settings"
	FileExtension    = ".json"
)

var IgnoredKeys = map[string]bool{
	// Секреты, мультиплеер и учетные записи
	"GameSpy CD Key":                 true,
	"GameSpy Password":               true,
	"GameSpy Remember Password":      true,
	"GameSpy Account Name":           true,
	"Player Name":                    true,
	"Host Game Name":                 true,
	"MatchMaking.com Game Name":       true,
	"GameSpy Last Game Created":       true,
	"GameSpy Last Max Players":        true,
	"GameSpy Allow Buddy Chat":        true,
	"GameSpy Automatch Epoch Pref":    true,
	"GameSpy Automatch Game Variant":  true,
	"GameSpy Automatch Map Pref":      true,
	"GameSpy Automatch Middle Age Civ": true,
	"GameSpy Automatch Number Of Players": true,
	"GameSpy Automatch World War Civ": true,

	// Аппаратные ID и конфигурация железа
	"Graphics Device ID":              true,
	"Graphics Vendor ID":              true,
	"Graphics Autodetect Version":     true,
	"Network Adapter":                 true,
	"System RAM Size":                 true,
	"Rasterizer Name":                 true,

	// Локальные пути файловой системы
	"Install Directory":               true,
	"Rise Install":                    true,

	// Состояния игры, сейвы и сессии
	"Last Auto Save":                  true,
	"Last Game File":                  true,
	"Last Quick Save":                 true,
	"Last Scenario File":              true,
	"Last Open Post Game Stats Page":  true,

	// Системные флаги реестра
	"Rise and Fall":                   true,
	"Version Number":                  true,
}

type SettingsPayload struct {
	Version  string                    `json:"version"`
	Game     string                    `json:"game"`
	Settings map[string]map[string]any `json:"settings"`
}

func CleanDirPath(raw string) string {
	cleaned := strings.TrimSpace(raw)
	cleaned = strings.Trim(cleaned, `"'`)
	if strings.HasSuffix(cleaned, `"`) {
		cleaned = strings.TrimSuffix(cleaned, `"`) + `\`
	}
	return cleaned
}

func FileExists(path string) bool {
	_, err := os.Stat(path)
	return err == nil || !os.IsNotExist(err)
}

func GenerateUniqueFilePath(dir string) string {
	basePath := filepath.Join(dir, DefaultFileName+FileExtension)
	if !FileExists(basePath) {
		return basePath
	}

	counter := 1
	for {
		candidate := filepath.Join(dir, fmt.Sprintf("%s-%d%s", DefaultFileName, counter, FileExtension))
		if !FileExists(candidate) {
			return candidate
		}
		counter++
	}
}

func ValidateSettings(payload *SettingsPayload) error {
	if payload.Game != "Rise and Fall: Civilizations at War" {
		return fmt.Errorf("invalid game signature: %q", payload.Game)
	}
	if len(payload.Settings) == 0 {
		return fmt.Errorf("settings payload contains no sections")
	}

	for section, values := range payload.Settings {
		if strings.Contains(section, "..") || strings.ContainsAny(section, `/*?<>|`) {
			return fmt.Errorf("malformed section key: %q", section)
		}

		for key, val := range values {
			cleanKey := strings.TrimSpace(key)
			if cleanKey == "" {
				return fmt.Errorf("empty parameter name detected in section [%s]", section)
			}
			if IgnoredKeys[cleanKey] {
				continue
			}

			switch v := val.(type) {
			case float64:
				if v < 0 || v > 4294967295 {
					return fmt.Errorf("value out of uint32 bounds in [%s]->%s: %v", section, key, v)
				}
			case string:
				if len(v) > 2048 {
					return fmt.Errorf("string parameter too long in [%s]->%s", section, key)
				}
			default:
				return fmt.Errorf("unsupported parameter data type in [%s]->%s", section, key)
			}
		}
	}
	return nil
}
