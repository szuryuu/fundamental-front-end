package main

import (
	"archive/zip"
	"encoding/json"
	"fmt"
	"io"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"
)

type PackageJSON struct {
	Dependencies    map[string]string `json:"dependencies"`
	DevDependencies map[string]string `json:"devDependencies"`
}

var forbiddenFrameworks = []string{"react", "vue", "@angular/core", "nuxt", "next"}

func main() {
	if len(os.Args) < 2 {
		fmt.Println("[-] [ERROR] Usage: reviewer <sub1|sub2|sub3> [path-to-zip]")
		os.Exit(1)
	}

	submissionType := os.Args[1]
	var zipPath string

	if len(os.Args) >= 3 {
		zipPath = os.Args[2]
	} else {
		fmt.Println("[i] [INFO] No ZIP path provided. Searching for the newest submission...")
		zipPath = getLatestZip()
	}

	fmt.Printf("\n[>] [LAYER 1] Starting Static Analysis for %s: %s\n", strings.ToUpper(submissionType), zipPath)

	tmpDir, err := os.MkdirTemp("", "dicoding-review-*")
	if err != nil {
		fmt.Printf("[-] [FATAL] Failed to create temp directory: %v\n", err)
		os.Exit(1)
	}
	defer os.RemoveAll(tmpDir)

	err = extractAndValidateZip(zipPath, tmpDir)
	if err != nil {
		fmt.Printf("[-] [REJECTED] Static validation failed: %v\n", err)
		os.Exit(1)
	}

	fmt.Println("[+] [PASS] Static validation successful. No prohibited frameworks or 'node_modules' detected.")

	actualProjectDir := resolveTargetDirectory(tmpDir)
	if actualProjectDir != tmpDir {
		fmt.Printf("[i] [INFO] Nested directory structure detected. Dynamically adjusting root to: %s\n", filepath.Base(actualProjectDir))
	}

	fmt.Printf("[*] [LAYER 2] Handing over to Playwright E2E Runner...\n")
	runPlaywrightRunner(submissionType, actualProjectDir)
}

func getLatestZip() string {
	homeDir, err := os.UserHomeDir()
	if err != nil {
		fmt.Printf("[-] [FATAL] Could not determine home directory: %v\n", err)
		os.Exit(1)
	}

	targetDir := filepath.Join(homeDir, "Personal", "temp", "dicoding-submission")
	files, err := os.ReadDir(targetDir)
	if err != nil {
		fmt.Printf("[-] [FATAL] Could not read directory %s: %v\n", targetDir, err)
		os.Exit(1)
	}

	var latestFile string
	var latestTime time.Time

	for _, file := range files {
		if !file.IsDir() && strings.HasSuffix(file.Name(), ".zip") {
			info, err := file.Info()
			if err != nil {
				continue
			}
			if info.ModTime().After(latestTime) {
				latestTime = info.ModTime()
				latestFile = filepath.Join(targetDir, file.Name())
			}
		}
	}

	if latestFile == "" {
		fmt.Println("[-] [FATAL] No .zip files found in", targetDir)
		os.Exit(1)
	}

	fmt.Printf("[+] [AUTO-TARGET] Acquired target: %s\n", latestFile)
	return latestFile
}

func extractAndValidateZip(zipPath string, dest string) error {
	r, err := zip.OpenReader(zipPath)
	if err != nil {
		return fmt.Errorf("failed to open ZIP archive: %v", err)
	}
	defer r.Close()

	hasHTML := false

	for _, f := range r.File {
		if strings.Contains(f.Name, "node_modules/") {
			return fmt.Errorf("ZIP contains prohibited 'node_modules' directory")
		}

		if strings.HasSuffix(f.Name, ".html") {
			hasHTML = true
		}

		fpath := filepath.Join(dest, f.Name)

		if !strings.HasPrefix(fpath, filepath.Clean(dest)+string(os.PathSeparator)) {
			continue
		}

		if f.FileInfo().IsDir() {
			os.MkdirAll(fpath, os.ModePerm)
			continue
		}

		if err = os.MkdirAll(filepath.Dir(fpath), os.ModePerm); err != nil {
			return err
		}

		outFile, err := os.OpenFile(fpath, os.O_WRONLY|os.O_CREATE|os.O_TRUNC, f.Mode())
		if err != nil {
			return err
		}

		rc, err := f.Open()
		if err != nil {
			outFile.Close()
			return err
		}

		if strings.HasSuffix(f.Name, "package.json") {
			content, _ := io.ReadAll(rc)
			if err := checkFrameworks(content); err != nil {
				outFile.Close()
				rc.Close()
				return err
			}
			rc.Close()
			rc, _ = f.Open()
		}

		_, err = io.Copy(outFile, rc)
		outFile.Close()
		rc.Close()
		if err != nil {
			return err
		}
	}

	if !hasHTML {
		return fmt.Errorf("no HTML files found anywhere in the project")
	}
	return nil
}

func checkFrameworks(content []byte) error {
	var pkg PackageJSON
	if err := json.Unmarshal(content, &pkg); err != nil {
		return nil
	}

	for _, framework := range forbiddenFrameworks {
		if _, exists := pkg.Dependencies[framework]; exists {
			return fmt.Errorf("usage of prohibited framework detected: %s", framework)
		}
		if _, exists := pkg.DevDependencies[framework]; exists {
			return fmt.Errorf("usage of prohibited framework detected: %s", framework)
		}
	}
	return nil
}

func resolveTargetDirectory(baseDir string) string {
	var projectRoot = baseDir
	var shortestPathLength = 9999

	err := filepath.Walk(baseDir, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return nil
		}

		if !info.IsDir() && (info.Name() == "package.json" || info.Name() == "index.html") {
			dir := filepath.Dir(path)
			depth := len(strings.Split(dir, string(os.PathSeparator)))

			if depth < shortestPathLength {
				shortestPathLength = depth
				projectRoot = dir
			}
		}
		return nil
	})

	if err != nil {
		return baseDir
	}

	return projectRoot
}

func runPlaywrightRunner(subType string, targetDir string) {
	executablePath, _ := os.Executable()
	baseDir := filepath.Dir(executablePath)
	runnerPath := filepath.Join(baseDir, "runner.js")

	cmd := exec.Command("node", runnerPath, subType, targetDir)
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr

	err := cmd.Run()
	if err != nil {
		fmt.Printf("\n[!] [WARNING] E2E Pipeline finished with exit code 1. Manual review required.\n")
	} else {
		fmt.Printf("\n[+] [SUCCESS] Automated E2E pipeline executed successfully.\n")
	}
}
