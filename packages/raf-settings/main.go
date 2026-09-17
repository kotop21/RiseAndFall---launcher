package main

import (
	"flag"
	"fmt"
	"os"
	"runtime"
)

func printUsage() {
	fmt.Println("Rise and Fall - Registry Settings Manager CLI")
	fmt.Println()
	fmt.Println("Usage:")
	fmt.Println("  raf-settings.exe export <directory_path>")
	fmt.Println("  raf-settings.exe import <json_file_path>")
	fmt.Println()
	fmt.Println("Examples:")
	fmt.Println("  raf-settings.exe export C:\\")
	fmt.Println("  raf-settings.exe import C:\\raf-settings.json")
}

func main() {
	if runtime.GOOS != "windows" {
		fmt.Fprintf(os.Stderr, "[ERROR] This tool interacts with Windows Registry and can only run on Windows (current OS: %s)\n", runtime.GOOS)
		os.Exit(1)
	}

	flag.Usage = printUsage
	flag.Parse()

	args := flag.Args()
	if len(args) < 2 {
		printUsage()
		os.Exit(1)
	}

	command := args[0]
	targetPath := args[1]

	var err error
	switch command {
	case "export":
		err = RunExport(targetPath)
	case "import":
		err = RunImport(targetPath)
	default:
		fmt.Printf("Unknown command: %s\n\n", command)
		printUsage()
		os.Exit(1)
	}

	if err != nil {
		fmt.Fprintf(os.Stderr, "[ERROR] %v\n", err)
		os.Exit(1)
	}
}
