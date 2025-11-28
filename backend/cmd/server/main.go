package main

import (
	"log"
	"net/http"
	"os"
	"path/filepath"

	"codexaac-backend/internal/database"
	"codexaac-backend/internal/handlers"
	"codexaac-backend/pkg/config"
	"codexaac-backend/pkg/middleware"
	"codexaac-backend/pkg/utils"
	"github.com/gorilla/mux"
	"github.com/joho/godotenv"
)

type Response struct {
	Message string `json:"message"`
	Status  string `json:"status"`
}

func main() {
	if err := godotenv.Load(); err != nil {
		log.Println(".env file not found, using system environment variables")
	}

	config.InitTowns(os.Getenv("CHARACTER_TOWNS"))

	jwtSecret := os.Getenv("JWT_SECRET")
	if jwtSecret == "" {
		log.Println("⚠️  WARNING: JWT_SECRET is not configured. Using default key for development (NOT SAFE FOR PRODUCTION)")
		log.Println("   Configure JWT_SECRET in .env file for production")
	}

	serverPath := os.Getenv("SERVER_PATH")
	if serverPath != "" {
		configPath := filepath.Join(serverPath, "config.lua")

		if err := config.InitServerConfig(configPath); err != nil {
			log.Printf("⚠️  WARNING: Failed to load server config.lua: %v", err)
			log.Println("   Server configuration will use defaults")
		} else {
			log.Println("✅ Server configuration loaded successfully")
		}

		stagesPath := filepath.Join(serverPath, "data", "stages.lua")

		if err := config.InitStagesConfig(stagesPath); err != nil {
			log.Printf("⚠️  WARNING: Failed to load stages.lua: %v", err)
			log.Println("   Stages configuration will use defaults")
		} else {
			log.Println("✅ Stages configuration loaded successfully")
		}
	} else {
		log.Println("ℹ️  SERVER_PATH not set, server config will use defaults")
	}

	if err := database.InitDB(); err != nil {
		log.Fatalf("Error connecting to database: %v", err)
	}
	defer database.CloseDB()

	r := mux.NewRouter()

	r.Use(middleware.SecurityHeadersMiddleware)
	r.Use(middleware.BodyLimitMiddleware)
	r.Use(middleware.MaintenanceMiddleware)

	r.HandleFunc("/api/health", healthHandler).Methods("GET")
	r.HandleFunc("/api", homeHandler).Methods("GET")
	r.HandleFunc("/api/login", handlers.LoginHandler).Methods("POST")
	r.HandleFunc("/api/register", handlers.RegisterHandler).Methods("POST")
	r.HandleFunc("/api/logout", handlers.LogoutHandler).Methods("POST")
	r.HandleFunc("/api/server/config", handlers.GetServerConfigHandler).Methods("GET")
	r.HandleFunc("/api/server/stages", handlers.GetStagesConfigHandler).Methods("GET")
	r.HandleFunc("/api/towns", handlers.GetTownsHandler).Methods("GET")
	r.HandleFunc("/api/social/links", handlers.GetSocialLinksHandler).Methods("GET")
	r.HandleFunc("/api/maintenance/status", handlers.GetMaintenanceStatusPublicHandler).Methods("GET")

	r.HandleFunc("/api/pages/rules", handlers.GetRulesHandler).Methods("GET")

	r.HandleFunc("/login", handlers.TibiaClientLoginHandler).Methods("POST", "OPTIONS")

	protected := r.PathPrefix("/api").Subrouter()
	protected.Use(middleware.AuthMiddleware)

	protected.HandleFunc("/account", handlers.GetAccountHandler).Methods("GET")
	protected.HandleFunc("/account", handlers.DeleteAccountHandler).Methods("DELETE")
	protected.HandleFunc("/account/cancel-deletion", handlers.CancelDeletionHandler).Methods("POST")

	protected.HandleFunc("/account/2fa/status", handlers.Get2FAStatusHandler).Methods("GET")
	protected.HandleFunc("/account/2fa/enable", handlers.Enable2FAHandler).Methods("POST")
	protected.HandleFunc("/account/2fa/verify", handlers.Verify2FAHandler).Methods("POST")
	protected.HandleFunc("/account/2fa/disable", handlers.Disable2FAHandler).Methods("POST")

	protected.HandleFunc("/characters", handlers.GetCharactersHandler).Methods("GET")
	protected.HandleFunc("/characters", handlers.CreateCharacterHandler).Methods("POST")

	protected.HandleFunc("/guilds", handlers.CreateGuildHandler).Methods("POST")
	protected.HandleFunc("/guilds/invites", handlers.GetPendingInvitesHandler).Methods("GET")
	protected.HandleFunc("/guilds/{name}/invite", handlers.InvitePlayerHandler).Methods("POST")
	protected.HandleFunc("/guilds/{name}/accept-invite", handlers.AcceptInviteHandler).Methods("POST")
	protected.HandleFunc("/guilds/{name}/leave", handlers.LeaveGuildHandler).Methods("POST")
	protected.HandleFunc("/guilds/{name}/kick", handlers.KickPlayerHandler).Methods("POST")

	r.HandleFunc("/api/characters/{name}", handlers.GetCharacterDetailsHandler).Methods("GET")
	r.HandleFunc("/api/players/online", handlers.GetOnlinePlayersHandler).Methods("GET")
	r.HandleFunc("/api/ranking", handlers.GetRankingHandler).Methods("GET")
	r.HandleFunc("/api/changelogs", handlers.GetChangelogsHandler).Methods("GET")
	r.HandleFunc("/api/guilds", handlers.GetGuildsHandler).Methods("GET")
	r.HandleFunc("/api/boosted", handlers.GetBoostedHandler).Methods("GET")
	r.HandleFunc("/api/banishments", handlers.GetBanishmentsHandler).Methods("GET")

	guildDetailsRouter := r.PathPrefix("/api/guilds/{name}").Subrouter()
	guildDetailsRouter.Use(middleware.OptionalAuthMiddleware)
	guildDetailsRouter.HandleFunc("", handlers.GetGuildDetailsHandler).Methods("GET")

	admin := r.PathPrefix("/api/admin").Subrouter()
	admin.Use(middleware.AuthMiddleware)
	admin.Use(middleware.AdminMiddleware)

	admin.HandleFunc("/stats", handlers.GetAdminStatsHandler).Methods("GET")
	admin.HandleFunc("/accounts", handlers.GetAdminAccountsHandler).Methods("GET")
	admin.HandleFunc("/account", handlers.GetAdminAccountDetailsHandler).Methods("GET")
	admin.HandleFunc("/maintenance", handlers.GetMaintenanceStatusHandler).Methods("GET")
	admin.HandleFunc("/maintenance", handlers.ToggleMaintenanceHandler).Methods("POST")
	admin.HandleFunc("/changelogs", handlers.CreateChangelogHandler).Methods("POST")
	admin.HandleFunc("/changelogs/{id}", handlers.DeleteChangelogHandler).Methods("DELETE")
	admin.HandleFunc("/pages/rules", handlers.UpdateRulesHandler).Methods("PUT")

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("🌐 Server starting on port %s", port)
	log.Fatal(http.ListenAndServe(":"+port, middleware.CorsMiddleware(r)))
}

func healthHandler(w http.ResponseWriter, r *http.Request) {
	dbStatus := "ok"
	statusCode := http.StatusOK
	if database.DB != nil {
		if err := database.DB.Ping(); err != nil {
			dbStatus = "error"
			statusCode = http.StatusServiceUnavailable
		}
	}

	message := "Server and database are running"
	if dbStatus == "error" {
		message = "Database is not accessible"
	}

	utils.WriteJSON(w, statusCode, Response{
		Message: message,
		Status:  dbStatus,
	})
}

func homeHandler(w http.ResponseWriter, r *http.Request) {
	utils.WriteJSON(w, http.StatusOK, Response{
		Message: "Welcome to CodexAAC Backend",
		Status:  "ok",
	})
}
