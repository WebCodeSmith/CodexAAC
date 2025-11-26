package main

import (
	"flag"
	"fmt"
	"log"
	"os"
	"os/exec"
	"path/filepath"

	"codexaac-backend/internal/database"
	"codexaac-backend/internal/handlers"
	"codexaac-backend/pkg/utils"
	"github.com/joho/godotenv"
)

func main() {
	forceFlag := flag.Bool("force", false, "Force installation even if already installed")
	flag.Parse()

	// Load .env file
	backendDir := getBackendDir()
	envPath := filepath.Join(backendDir, ".env")
	if err := godotenv.Load(envPath); err != nil {
		if err := godotenv.Load(); err != nil {
			log.Println("⚠️  .env file not found, using system environment variables")
		}
	}

	log.Println("🚀 Starting CodexAAC installation...")
	log.Println("")

	// Step 1: Check database connection
	log.Println("📋 Step 1/3: Checking database connection...")
	if err := database.InitDB(); err != nil {
		log.Fatalf("❌ Database connection failed: %v", err)
	}
	defer database.CloseDB()

	// Test connection
	if err := database.DB.Ping(); err != nil {
		log.Fatalf("❌ Database ping failed: %v", err)
	}
	log.Println("✅ Database connection successful")
	log.Println("")

	// Check if already installed
	ctx, cancel := utils.NewDBContext()
	defer cancel()

	alreadyInstalled, err := handlers.CheckIfAlreadyInstalled(ctx)
	if err != nil {
		log.Printf("⚠️  Warning: Could not check installation status: %v", err)
	} else if alreadyInstalled && !*forceFlag {
		log.Println("⚠️  Installation already completed!")
		log.Println("   Use --force flag to reinstall if needed")
		os.Exit(0)
	}

	if alreadyInstalled && *forceFlag {
		log.Println("⚠️  Force flag detected - proceeding with reinstallation...")
		log.Println("")
	}

	// Step 2: Sync database to schema.prisma
	log.Println("📋 Step 2/3: Syncing existing database to schema.prisma...")
	if err := handlers.SyncDatabaseToSchema(backendDir); err != nil {
		log.Fatalf("❌ Failed to sync database: %v", err)
	}
	log.Println("✅ Database structure synced to schema.prisma")
	log.Println("")

	// Step 3: Add missing tables/columns
	log.Println("📋 Step 3/3: Adding missing tables/columns...")
	results := handlers.ApplySchema(ctx)

	// Print results
	for key, value := range results {
		if value == "created" || value == "added" {
			log.Printf("  ✅ %s: %s", key, value)
		} else if value == "already exists" {
			log.Printf("  ℹ️  %s: %s", key, value)
		} else {
			log.Printf("  ⚠️  %s: %s", key, value)
		}
	}
	log.Println("")

	log.Println("🎉 Installation completed successfully!")
	log.Println("")
	log.Println("Next steps:")
	log.Println("  1. Configure your server settings")
	log.Println("  2. Start the backend server: go run cmd/server/main.go")
	log.Println("  3. Access the frontend and create your admin account")
}


func getBackendDir() string {
	cwd, err := os.Getwd()
	if err == nil {
		if filepath.Base(cwd) == "backend" {
			return cwd
		}
		backendPath := filepath.Join(cwd, "backend")
		if _, err := os.Stat(filepath.Join(backendPath, "prisma")); err == nil {
			return backendPath
		}
	}
	return "."
}

