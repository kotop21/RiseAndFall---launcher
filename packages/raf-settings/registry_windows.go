//go:build windows

package main

import (
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"golang.org/x/sys/windows/registry"
)

func collectSubkeys(rootKey registry.Key, basePath string, subPath string, out *[]string) {
	fullPath := basePath
	if subPath != "" {
		fullPath = basePath + `\` + subPath
	}

	k, err := registry.OpenKey(rootKey, fullPath, registry.ENUMERATE_SUB_KEYS|registry.QUERY_VALUE)
	if err != nil {
		return
	}
	defer k.Close()

	names, err := k.ReadSubKeyNames(-1)
	if err != nil {
		return
	}

	for _, name := range names {
		childSubPath := name
		if subPath != "" {
			childSubPath = subPath + `\` + name
		}
		*out = append(*out, childSubPath)
		collectSubkeys(rootKey, basePath, childSubPath, out)
	}
}

func RunExport(targetDir string) error {
	cleanDir := CleanDirPath(targetDir)
	absDir, err := filepath.Abs(cleanDir)
	if err != nil {
		return fmt.Errorf("invalid directory path %q: %w", targetDir, err)
	}

	if err := os.MkdirAll(absDir, 0755); err != nil {
		return fmt.Errorf("failed creating output directory %q: %w", absDir, err)
	}

	rootKey, err := registry.OpenKey(registry.CURRENT_USER, RootRegistryPath, registry.QUERY_VALUE|registry.ENUMERATE_SUB_KEYS)
	if err != nil {
		if errors.Is(err, registry.ErrNotExist) {
			return fmt.Errorf("registry key '%s' not found. Run the game once first", RootRegistryPath)
		}
		return fmt.Errorf("failed opening registry: %w", err)
	}
	rootKey.Close()

	allSections := []string{""}
	collectSubkeys(registry.CURRENT_USER, RootRegistryPath, "", &allSections)

	data := SettingsPayload{
		Version:  "1.0",
		Game:     "Rise and Fall: Civilizations at War",
		Settings: make(map[string]map[string]any),
	}

	totalExported := 0
	totalIgnored := 0

	for _, relSub := range allSections {
		secKey := "root"
		targetRegPath := RootRegistryPath
		if relSub != "" {
			secKey = relSub
			targetRegPath = RootRegistryPath + `\` + relSub
		}

		k, err := registry.OpenKey(registry.CURRENT_USER, targetRegPath, registry.QUERY_VALUE)
		if err != nil {
			continue
		}

		valNames, err := k.ReadValueNames(-1)
		if err != nil {
			k.Close()
			continue
		}

		sectionMap := make(map[string]any)
		for _, name := range valNames {
			trimmedName := strings.TrimSpace(name)
			if IgnoredKeys[trimmedName] || IgnoredKeys[name] {
				totalIgnored++
				continue
			}

			_, valType, err := k.GetValue(name, nil)
			if err != nil {
				continue
			}

			switch valType {
			case registry.DWORD:
				val, _, err := k.GetIntegerValue(name)
				if err == nil {
					sectionMap[name] = val
					totalExported++
				}
			case registry.SZ:
				val, _, err := k.GetStringValue(name)
				if err == nil {
					sectionMap[name] = val
					totalExported++
				}
			}
		}
		k.Close()

		data.Settings[secKey] = sectionMap
	}

	if totalExported == 0 {
		return fmt.Errorf("no user settings found in '%s'", RootRegistryPath)
	}

	outPath := GenerateUniqueFilePath(absDir)
	bytes, err := json.MarshalIndent(data, "", "  ")
	if err != nil {
		return fmt.Errorf("failed generating JSON: %w", err)
	}

	if err := os.WriteFile(outPath, bytes, 0644); err != nil {
		return fmt.Errorf("failed writing file %s: %w", outPath, err)
	}

	fmt.Printf("[OK] Exported %d clean parameters (%d machine/secret keys skipped) to: %s\n", totalExported, totalIgnored, outPath)
	return nil
}

func RunImport(filePath string) error {
	cleanPath := CleanDirPath(filePath)
	absPath, err := filepath.Abs(cleanPath)
	if err != nil {
		return fmt.Errorf("invalid path %q: %w", filePath, err)
	}

	bytes, err := os.ReadFile(absPath)
	if err != nil {
		return fmt.Errorf("cannot read file %s: %w", absPath, err)
	}

	var payload SettingsPayload
	if err := json.Unmarshal(bytes, &payload); err != nil {
		return fmt.Errorf("invalid JSON syntax: %w", err)
	}

	if err := ValidateSettings(&payload); err != nil {
		return fmt.Errorf("validation error: %w", err)
	}

	restoredCount := 0
	skippedSecurity := 0

	for section, values := range payload.Settings {
		targetPath := RootRegistryPath
		if section != "root" {
			targetPath = RootRegistryPath + `\` + section
		}

		k, _, err := registry.CreateKey(registry.CURRENT_USER, targetPath, registry.SET_VALUE)
		if err != nil {
			return fmt.Errorf("failed opening key '%s': %w", targetPath, err)
		}

		for valName, rawVal := range values {
			cleanName := strings.TrimSpace(valName)
			if IgnoredKeys[cleanName] || IgnoredKeys[valName] {
				skippedSecurity++
				continue
			}

			switch v := rawVal.(type) {
			case float64:
				if err := k.SetDWordValue(valName, uint32(v)); err != nil {
					k.Close()
					return fmt.Errorf("failed setting DWORD %s\\%s: %w", targetPath, valName, err)
				}
				restoredCount++
			case string:
				if err := k.SetStringValue(valName, v); err != nil {
					k.Close()
					return fmt.Errorf("failed setting String %s\\%s: %w", targetPath, valName, err)
				}
				restoredCount++
			}
		}
		k.Close()
	}

	fmt.Printf("[OK] Successfully imported %d parameters (%d unsafe keys blocked) from: %s\n", restoredCount, skippedSecurity, absPath)
	return nil
}
