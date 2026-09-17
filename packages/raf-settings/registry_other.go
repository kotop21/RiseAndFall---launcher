//go:build !windows

package main

import (
	"fmt"
	"runtime"
)

func RunExport(targetDir string) error {
	return fmt.Errorf("registry export is not supported on %s (Windows only)", runtime.GOOS)
}

func RunImport(filePath string) error {
	return fmt.Errorf("registry import is not supported on %s (Windows only)", runtime.GOOS)
}
