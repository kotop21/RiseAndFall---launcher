package main

import (
	"testing"
)

func TestIsIgnoredKey(t *testing.T) {
	gameSpyCases := []string{
		"GameSpy CD Key",
		"GameSpy Password",
		"gamespy password",
		"GAMESPY_PORT",
		"GameSpy Automatch Map Pref",
		"GameSpy Account Name",
		"GameSpy Last Game Created",
		"MyGameSpyKey",
		"gamespy",
		"GameSpy",
		"  GameSpy Token  ",
	}

	for _, key := range gameSpyCases {
		if !IsIgnoredKey(key) {
			t.Errorf("expected IsIgnoredKey(%q) to be true, got false", key)
		}
	}

	staticIgnoredCases := []string{
		"Player Name",
		"Host Game Name",
		"MatchMaking.com Game Name",
		"Graphics Device ID",
		"Install Directory",
		"Last Quick Save",
		"Rise and Fall",
		"Version Number",
	}

	for _, key := range staticIgnoredCases {
		if !IsIgnoredKey(key) {
			t.Errorf("expected IsIgnoredKey(%q) to be true for static ignored key, got false", key)
		}
	}

	validAllowedCases := []string{
		"Game Window Width",
		"Game Window Height",
		"Sound Volume",
		"Music Volume",
		"Difficulty Level",
		"Model Quality Level",
		"Texture Quality Level",
		"3P Mouse Sensitivity",
	}

	for _, key := range validAllowedCases {
		if IsIgnoredKey(key) {
			t.Errorf("expected IsIgnoredKey(%q) to be false for valid setting, got true", key)
		}
	}

	if !IsIgnoredKey("") {
		t.Errorf("expected empty string key to be ignored")
	}
	if !IsIgnoredKey("   ") {
		t.Errorf("expected whitespace key to be ignored")
	}
}

func TestIsIgnoredSection(t *testing.T) {
	if !IsIgnoredSection("GameSpy") {
		t.Errorf("expected section 'GameSpy' to be ignored")
	}
	if !IsIgnoredSection("gamespy_settings") {
		t.Errorf("expected section 'gamespy_settings' to be ignored")
	}
	if !IsIgnoredSection("Network\\GameSpy") {
		t.Errorf("expected section 'Network\\GameSpy' to be ignored")
	}
	if IsIgnoredSection("root") {
		t.Errorf("expected section 'root' to NOT be ignored")
	}
	if IsIgnoredSection("Graphics Settings") {
		t.Errorf("expected section 'Graphics Settings' to NOT be ignored")
	}
}

func TestValidateSettings(t *testing.T) {
	payload := &SettingsPayload{
		Version: "1.0",
		Game:    "Rise and Fall: Civilizations at War",
		Settings: map[string]map[string]any{
			"root": {
				"Game Window Width":  1920.0,
				"Game Window Height": 1080.0,
				"GameSpy CD Key":     "SECRET123", // should be safely ignored
			},
			"GameSpy": {
				"Password": "pass", // entire section ignored
			},
			"Graphics Settings": {
				"Texture Quality Level": 2.0,
			},
		},
	}

	if err := ValidateSettings(payload); err != nil {
		t.Fatalf("expected valid payload to pass, got error: %v", err)
	}

	invalidGamePayload := &SettingsPayload{
		Version:  "1.0",
		Game:     "Wrong Game",
		Settings: payload.Settings,
	}
	if err := ValidateSettings(invalidGamePayload); err == nil {
		t.Fatalf("expected error for invalid game title")
	}
}
