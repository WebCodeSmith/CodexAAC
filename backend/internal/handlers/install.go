package handlers

import (
	"bufio"
	"context"
	"fmt"
	"log"
	"os"
	"os/exec"
	"path/filepath"
	"strings"

	"codexaac-backend/internal/database"
	"github.com/joho/godotenv"
)

// InitDatabase initializes the database connection
// Exported for use in CLI tools
func InitDatabase() error {
	// Load .env file if database is not initialized
	if database.DB == nil {
		// Try to load .env from backend directory
		backendDir := getBackendDir()
		envPath := filepath.Join(backendDir, ".env")

		if err := godotenv.Load(envPath); err != nil {
			// Try current directory
			if err := godotenv.Load(); err != nil {
				log.Println("⚠️  .env file not found, using system environment variables")
			}
		}

		// Initialize database connection
		if err := database.InitDB(); err != nil {
			return fmt.Errorf("failed to initialize database: %w", err)
		}
	}

	// Test connection
	if err := database.DB.Ping(); err != nil {
		return fmt.Errorf("database ping failed: %w", err)
	}

	return nil
}

// CheckIfAlreadyInstalled checks if installation was already completed
// Exported for use in CLI tools
func CheckIfAlreadyInstalled(ctx context.Context) (bool, error) {
	// Check if maintenance table exists and has data
	var count int
	err := database.DB.QueryRowContext(ctx,
		"SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'maintenance'",
	).Scan(&count)

	if err != nil {
		return false, err
	}

	if count == 0 {
		return false, nil // Not installed yet
	}

	// Check if maintenance table has the default row (installation completed)
	var exists bool
	err = database.DB.QueryRowContext(ctx,
		"SELECT COUNT(*) > 0 FROM maintenance WHERE id = 1",
	).Scan(&exists)

	return exists, err
}

// SyncDatabaseToSchema syncs the database structure to schema.prisma
// This pulls all existing tables from the database into schema.prisma
// Then adds our required models (maintenance, changelogs) and columns if they don't exist
// This does NOT delete anything from the database, only updates the schema.prisma file
// Exported for use in CLI tools
func SyncDatabaseToSchema(backendDir string) error {
	schemaPath := filepath.Join(backendDir, "prisma", "schema.prisma")

	// Pull all existing database structure into schema.prisma
	// This syncs the schema with the database (doesn't delete anything from DB)
	cmd := exec.Command("pnpm", "prisma", "db", "pull", "--force")
	cmd.Dir = backendDir
	output, err := cmd.CombinedOutput()

	if err != nil {
		return fmt.Errorf("%s: %w", string(output), err)
	}

	// After pull, add our required models if they don't exist
	if err := AddRequiredModelsToSchema(schemaPath); err != nil {
		return fmt.Errorf("failed to add required models: %w", err)
	}

	// After pull, ensure accounts model has our required columns
	if err := AddRequiredColumnsToAccountsModel(schemaPath); err != nil {
		return fmt.Errorf("failed to add required columns to accounts model: %w", err)
	}

	return nil
}

// AddRequiredModelsToSchema adds maintenance and changelogs models to schema.prisma if they don't exist
// Exported for use in CLI tools
func AddRequiredModelsToSchema(schemaPath string) error {
	// Read current schema
	file, err := os.Open(schemaPath)
	if err != nil {
		return fmt.Errorf("failed to open schema file: %w", err)
	}
	defer file.Close()

	scanner := bufio.NewScanner(file)
	hasMaintenance := false
	hasChangelogs := false
	hasSitePages := false
	var lines []string
	// Pre-allocate with reasonable capacity to reduce allocations
	lines = make([]string, 0, 1000)

	for scanner.Scan() {
		line := scanner.Text()
		lines = append(lines, line)

		// Check if models already exist (optimized: only check if not already found)
		if !hasMaintenance && strings.Contains(line, "model maintenance") {
			hasMaintenance = true
		}
		if !hasChangelogs && strings.Contains(line, "model changelogs") {
			hasChangelogs = true
		}
		if !hasSitePages && strings.Contains(line, "model site_pages") {
			hasSitePages = true
		}
	}

	if err := scanner.Err(); err != nil {
		return fmt.Errorf("error reading schema file: %w", err)
	}

	// If all models exist, nothing to do
	if hasMaintenance && hasChangelogs && hasSitePages {
		return nil
	}

	// Find the last line (should be empty or closing)
	// Add our models before the end
	maintenanceModel := `
model maintenance {
  id        Int      @id @default(1)
  enabled   Boolean  @default(false)
  message   String?  @db.Text
  updated_at DateTime @default(now()) @updatedAt @db.Timestamp(0)

  @@map("maintenance")
}
`

	changelogsModel := `
model changelogs {
  id          Int      @id @default(autoincrement())
  version     String   @db.VarChar(50)
  title       String   @db.VarChar(255)
  description String?  @db.Text
  type        String   @default("update") @db.VarChar(50)
  created_at  DateTime @default(now()) @db.Timestamp(0)
  created_by  Int?     @db.UnsignedInt

  @@index([created_at], map: "idx_created_at")
  @@index([version], map: "idx_version")
  @@map("changelogs")
}
`

sitePagesModel := `
model site_pages {
	id         Int      @id @default(autoincrement())
	page_key   String   @unique @db.VarChar(50)
	content    String?  @db.Text
	created_at DateTime @default(now()) @db.Timestamp(0)
	updated_at DateTime @default(now()) @updatedAt @db.Timestamp(0)

	@@map("site_pages")
}
`

	// Write back with added models
	file, err = os.Create(schemaPath)
	if err != nil {
		return fmt.Errorf("failed to create schema file: %w", err)
	}
	defer file.Close()

	writer := bufio.NewWriter(file)

	// Write all existing lines
	for _, line := range lines {
		if _, err := writer.WriteString(line + "\n"); err != nil {
			return fmt.Errorf("error writing schema: %w", err)
		}
	}

	// Add missing models
	if !hasMaintenance {
		if _, err := writer.WriteString(maintenanceModel); err != nil {
			return fmt.Errorf("error writing maintenance model: %w", err)
		}
	}

	if !hasChangelogs {
		if _, err := writer.WriteString(changelogsModel); err != nil {
			return fmt.Errorf("error writing changelogs model: %w", err)
		}

		if !hasSitePages {
			if _, err := writer.WriteString(sitePagesModel); err != nil {
				return fmt.Errorf("error writing site_pages model: %w", err)
			}
		}
	}

	if err := writer.Flush(); err != nil {
		return fmt.Errorf("error flushing schema file: %w", err)
	}

	return nil
}

// AddRequiredColumnsToAccountsModel adds required columns to accounts model in schema.prisma if they don't exist
// Exported for use in CLI tools
func AddRequiredColumnsToAccountsModel(schemaPath string) error {
	// Read current schema
	file, err := os.Open(schemaPath)
	if err != nil {
		return fmt.Errorf("failed to open schema file: %w", err)
	}
	defer file.Close()

	scanner := bufio.NewScanner(file)
	var lines []string
	lines = make([]string, 0, 1000)
	inAccountsModel := false
	accountsModelEnd := -1
	hasSecret := false
	hasPageAccess := false
	hasDeletionScheduledAt := false
	hasStatus := false

	for scanner.Scan() {
		line := scanner.Text()
		lines = append(lines, line)

		// Check if we're in accounts model
		if strings.Contains(line, "model accounts") {
			inAccountsModel = true
		}

		if inAccountsModel {
			// Check for required columns (check field definitions, not comments)
			trimmedLine := strings.TrimSpace(line)
			if !strings.HasPrefix(trimmedLine, "//") {
				if strings.Contains(trimmedLine, "secret") && (strings.Contains(trimmedLine, "String") || strings.Contains(trimmedLine, "@db")) {
					hasSecret = true
				}
				if strings.Contains(trimmedLine, "page_access") && (strings.Contains(trimmedLine, "Int") || strings.Contains(trimmedLine, "@db")) {
					hasPageAccess = true
				}
				if strings.Contains(trimmedLine, "deletion_scheduled_at") && (strings.Contains(trimmedLine, "BigInt") || strings.Contains(trimmedLine, "@db")) {
					hasDeletionScheduledAt = true
				}
				if strings.Contains(trimmedLine, "status") && !strings.Contains(trimmedLine, "@@") && (strings.Contains(trimmedLine, "String") || strings.Contains(trimmedLine, "@db")) {
					hasStatus = true
				}
			}

			// Find end of accounts model (next model or closing brace)
			if strings.HasPrefix(trimmedLine, "model ") && !strings.Contains(line, "model accounts") {
				accountsModelEnd = len(lines) - 1
				inAccountsModel = false
			} else if trimmedLine == "}" && inAccountsModel {
				accountsModelEnd = len(lines) - 1
				inAccountsModel = false
			}
		}
	}

	if err := scanner.Err(); err != nil {
		return fmt.Errorf("error reading schema file: %w", err)
	}

	// If all columns exist, nothing to do
	if hasSecret && hasPageAccess && hasDeletionScheduledAt && hasStatus {
		return nil
	}

	// If we didn't find the accounts model, can't add columns
	if accountsModelEnd == -1 {
		return fmt.Errorf("accounts model not found in schema")
	}

	// Build columns to add
	var columnsToAdd []string
	if !hasSecret {
		columnsToAdd = append(columnsToAdd, "  secret                String?               @db.VarChar(16)")
	}
	if !hasPageAccess {
		columnsToAdd = append(columnsToAdd, "  page_access           Int                   @default(0) @db.TinyInt")
	}
	if !hasDeletionScheduledAt {
		columnsToAdd = append(columnsToAdd, "  deletion_scheduled_at BigInt?                @db.UnsignedBigInt")
	}
	if !hasStatus {
		columnsToAdd = append(columnsToAdd, "  status                String?                 @default(\"active\") @db.VarChar(50)")
	}

	// Insert columns before the closing brace of accounts model
	// Find the line with just "}" that closes the accounts model
	insertIndex := accountsModelEnd
	for i := accountsModelEnd; i >= 0; i-- {
		if strings.TrimSpace(lines[i]) == "}" {
			insertIndex = i
			break
		}
	}

	newLines := make([]string, 0, len(lines)+len(columnsToAdd))
	newLines = append(newLines, lines[:insertIndex]...)
	newLines = append(newLines, columnsToAdd...)
	newLines = append(newLines, lines[insertIndex:]...)

	// Write back
	file, err = os.Create(schemaPath)
	if err != nil {
		return fmt.Errorf("failed to create schema file: %w", err)
	}
	defer file.Close()

	writer := bufio.NewWriter(file)
	for _, line := range newLines {
		if _, err := writer.WriteString(line + "\n"); err != nil {
			return fmt.Errorf("error writing schema: %w", err)
		}
	}

	if err := writer.Flush(); err != nil {
		return fmt.Errorf("error flushing schema file: %w", err)
	}

	return nil
}

// ApplySchema adds only the missing tables/columns that we need
// This uses direct SQL to add only what's missing, without affecting existing tables
// Exported for use in CLI tools
func ApplySchema(ctx context.Context) map[string]string {
	results := make(map[string]string)

	// 1. Check and add maintenance table if missing
	if err := CreateTableIfNotExists(ctx, "maintenance", `
		CREATE TABLE IF NOT EXISTS maintenance (
			id INT PRIMARY KEY DEFAULT 1,
			enabled BOOLEAN NOT NULL DEFAULT FALSE,
			message TEXT NULL,
			updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
		) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
	`, "INSERT IGNORE INTO maintenance (id, enabled) VALUES (1, FALSE)", &results); err != nil {
		results["maintenance"] = "Error: " + err.Error()
	}

	// 2. Check and add changelogs table if missing
	if err := CreateTableIfNotExists(ctx, "changelogs", `
		CREATE TABLE IF NOT EXISTS changelogs (
			id INT AUTO_INCREMENT PRIMARY KEY,
			version VARCHAR(50) NOT NULL,
			title VARCHAR(255) NOT NULL,
			description TEXT NULL,
			type VARCHAR(50) NOT NULL DEFAULT 'update',
			created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
			created_by INT UNSIGNED NULL,
			INDEX idx_created_at (created_at),
			INDEX idx_version (version)
		) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
	`, "", &results); err != nil {
		results["changelogs"] = "Error: " + err.Error()
	}

	// 3. Check and add columns to accounts table if missing
	columns := map[string]string{
		"secret":               "VARCHAR(16) NULL",
		"page_access":          "TINYINT NOT NULL DEFAULT 0",
		"deletion_scheduled_at": "BIGINT UNSIGNED NULL",
		"status":                "VARCHAR(50) NULL DEFAULT 'active'",
	}

	for columnName, columnDef := range columns {
		var exists bool
		err := database.DB.QueryRowContext(ctx,
			"SELECT COUNT(*) > 0 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'accounts' AND column_name = ?",
			columnName,
		).Scan(&exists)

		if err != nil {
			results["accounts."+columnName] = "Error checking: " + err.Error()
			continue
		}

		// 4. Create site_pages table if missing
		if err := CreateTableIfNotExists(ctx, "site_pages", `
			CREATE TABLE IF NOT EXISTS site_pages (
				id INT AUTO_INCREMENT PRIMARY KEY,
				page_key VARCHAR(50) NOT NULL UNIQUE,
				content TEXT NULL,
				created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
				updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
			) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
		`, `INSERT IGNORE INTO site_pages (page_key, content) VALUES ('rules', '')`, &results); err != nil {
			results["site_pages"] = "Error: " + err.Error()
		}

		if exists {
			results["accounts."+columnName] = "already exists"
			continue
		}

		// Add column
		query := fmt.Sprintf("ALTER TABLE accounts ADD COLUMN %s %s", columnName, columnDef)
		if _, err := database.DB.ExecContext(ctx, query); err != nil {
			results["accounts."+columnName] = "Error adding: " + err.Error()
			continue
		}

		results["accounts."+columnName] = "added"
	}

	return results
}


// CreateTableIfNotExists checks if a table exists and creates it if missing
// Returns error only if creation fails, nil if table already exists or was created successfully
// Exported for use in CLI tools
func CreateTableIfNotExists(ctx context.Context, tableName, createQuery, postCreateQuery string, results *map[string]string) error {
	var exists bool
	err := database.DB.QueryRowContext(ctx,
		"SELECT COUNT(*) > 0 FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = ?",
		tableName,
	).Scan(&exists)

	if err != nil {
		(*results)[tableName] = "Error checking: " + err.Error()
		return err
	}

	if exists {
		(*results)[tableName] = "already exists"
		return nil
	}

	// Create table
	if _, err := database.DB.ExecContext(ctx, createQuery); err != nil {
		return err
	}

	// Execute post-create query if provided (e.g., insert default row)
	if postCreateQuery != "" {
		if _, err := database.DB.ExecContext(ctx, postCreateQuery); err != nil {
			// Log but don't fail - table was created successfully
			log.Printf("Warning: Failed to execute post-create query for %s: %v", tableName, err)
		}
	}

	(*results)[tableName] = "created"
	return nil
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

