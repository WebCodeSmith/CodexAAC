package config

import (
	"bufio"
	"fmt"
	"os"
	"regexp"
	"strconv"
	"strings"
	"sync"
	"time"
)

// ServerConfig holds server configuration from config.lua
type ServerConfig struct {
	ServerName            string
	WorldType             string
	IP                    string
	LoginPort             int
	GamePort              int
	RateExp               int
	RateSkill             int
	RateMagic             int
	RateLoot              int
	RateSpawn             int
	MapName               string
	MapAuthor             string
	HouseRentPeriod       string
	MaxPlayers            int
	OwnerName             string
	OwnerEmail            string
	URL                   string
	Location              string
	ProtectionLevel      int
	LowLevelBonusExp     int
	RateUseStages        bool
	FreePremium          bool
	FragDuration         int // in hours
	RedSkullDuration     int // in days
	BlackSkullDuration   int // in days
	DayKillsToRedSkull   int
	WeekKillsToRedSkull  int
	MonthKillsToRedSkull int
	LastLoaded           time.Time
}

var (
	serverConfig      *ServerConfig
	serverConfigOnce  sync.Once
	serverConfigMutex sync.RWMutex
	configFilePath    string
	// Compile regex once for better performance
	configLineRegex = regexp.MustCompile(`^(\w+)\s*=\s*(.+)$`)
)

// configSetter is a function that sets a value in ServerConfig
type configSetter func(*ServerConfig, string)

// Helper function to parse and set integer values
func parseIntValue(value string) (int, bool) {
	intVal, err := strconv.Atoi(value)
	return intVal, err == nil
}

// Helper function to parse boolean values
func parseBoolValue(value string) bool {
	value = strings.ToLower(strings.TrimSpace(value))
	return value == "true" || value == "1"
}

// configSetters maps config keys (lowercase) to their setter functions
// This map-based approach makes it easy to add new fields without modifying parsing logic
var configSetters = map[string]configSetter{
	"servername": func(c *ServerConfig, v string) {
		c.ServerName = v
	},
	"worldtype": func(c *ServerConfig, v string) {
		c.WorldType = v
	},
	"ip": func(c *ServerConfig, v string) {
		c.IP = v
	},
	"loginprotocolport": func(c *ServerConfig, v string) {
		if port, ok := parseIntValue(v); ok {
			c.LoginPort = port
		}
	},
	"gameprotocolport": func(c *ServerConfig, v string) {
		if port, ok := parseIntValue(v); ok {
			c.GamePort = port
		}
	},
	"rateexp": func(c *ServerConfig, v string) {
		if rate, ok := parseIntValue(v); ok {
			c.RateExp = rate
		}
	},
	"rateskill": func(c *ServerConfig, v string) {
		if rate, ok := parseIntValue(v); ok {
			c.RateSkill = rate
		}
	},
	"ratemagic": func(c *ServerConfig, v string) {
		if rate, ok := parseIntValue(v); ok {
			c.RateMagic = rate
		}
	},
	"rateloot": func(c *ServerConfig, v string) {
		if rate, ok := parseIntValue(v); ok {
			c.RateLoot = rate
		}
	},
	"ratespawn": func(c *ServerConfig, v string) {
		if rate, ok := parseIntValue(v); ok {
			c.RateSpawn = rate
		}
	},
	"mapname": func(c *ServerConfig, v string) {
		c.MapName = v
	},
	"mapauthor": func(c *ServerConfig, v string) {
		c.MapAuthor = v
	},
	"houserentperiod": func(c *ServerConfig, v string) {
		c.HouseRentPeriod = v
	},
	"maxplayers": func(c *ServerConfig, v string) {
		if max, ok := parseIntValue(v); ok {
			c.MaxPlayers = max
		}
	},
	"ownername": func(c *ServerConfig, v string) {
		c.OwnerName = v
	},
	"owneremail": func(c *ServerConfig, v string) {
		c.OwnerEmail = v
	},
	"url": func(c *ServerConfig, v string) {
		c.URL = v
	},
	"location": func(c *ServerConfig, v string) {
		c.Location = v
	},
	"protectionlevel": func(c *ServerConfig, v string) {
		if level, ok := parseIntValue(v); ok {
			c.ProtectionLevel = level
		}
	},
	"lowlevelbonusexp": func(c *ServerConfig, v string) {
		if exp, ok := parseIntValue(v); ok {
			c.LowLevelBonusExp = exp
		}
	},
	"rateusestages": func(c *ServerConfig, v string) {
		c.RateUseStages = parseBoolValue(v)
	},
	"freepremium": func(c *ServerConfig, v string) {
		c.FreePremium = parseBoolValue(v)
	},
	"timetodecreasefrags": func(c *ServerConfig, v string) {
		// Parse expression like "24 * 60 * 60 * 1000" (milliseconds) and convert to hours
		// Format: hours * 60 * 60 * 1000 = milliseconds
		// We extract the first number which represents hours
		if strings.Contains(v, "*") {
			parts := strings.Split(v, "*")
			if len(parts) > 0 {
				// First number is the hours
				if hours, ok := parseIntValue(strings.TrimSpace(parts[0])); ok {
					c.FragDuration = hours
				}
			}
		} else {
			// If it's a simple number, assume it's already in hours
			if hours, ok := parseIntValue(v); ok {
				c.FragDuration = hours
			}
		}
	},
	"redskullduration": func(c *ServerConfig, v string) {
		if days, ok := parseIntValue(v); ok {
			c.RedSkullDuration = days
		}
	},
	"blackskullduration": func(c *ServerConfig, v string) {
		if days, ok := parseIntValue(v); ok {
			c.BlackSkullDuration = days
		}
	},
	"daykillstoredskull": func(c *ServerConfig, v string) {
		if kills, ok := parseIntValue(v); ok {
			c.DayKillsToRedSkull = kills
		}
	},
	"weekkillstoredskull": func(c *ServerConfig, v string) {
		if kills, ok := parseIntValue(v); ok {
			c.WeekKillsToRedSkull = kills
		}
	},
	"monthkillstoredskull": func(c *ServerConfig, v string) {
		if kills, ok := parseIntValue(v); ok {
			c.MonthKillsToRedSkull = kills
		}
	},
}

// InitServerConfig initializes server configuration from config.lua
// Should be called once at application startup
func InitServerConfig(configPath string) error {
	configFilePath = configPath
	return ReloadServerConfig()
}

// ReloadServerConfig reloads server configuration from SERVER_PATH/config.lua
func ReloadServerConfig() error {
	// Try to determine config.lua path from SERVER_PATH
	if configFilePath == "" {
		serverPath := os.Getenv("SERVER_PATH")
		if serverPath == "" {
			return fmt.Errorf("SERVER_PATH not configured")
		}

		// Build full path to config.lua
		configFilePath = filepath.Join(serverPath, "config.lua")
	}

	file, err := os.Open(configFilePath)
	if err != nil {
		return fmt.Errorf("failed to open config.lua: %w", err)
	}
	defer file.Close()

	config := &ServerConfig{
		LastLoaded: time.Now(),
	}

	scanner := bufio.NewScanner(file)

	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())

		// Skip empty lines and Lua comments
		if line == "" || strings.HasPrefix(line, "--") {
			continue
		}

		// Parse key-value pairs
		// Expected formats:
		//   key = value
		//   key = "value"
		parseConfigLine(line, config)
	}

	if err := scanner.Err(); err != nil {
		return fmt.Errorf("error reading config.lua: %w", err)
	}

	// Update global server config safely
	serverConfigMutex.Lock()
	serverConfig = config
	serverConfigMutex.Unlock()

	return nil
}

// parseConfigLine parses a single line from config.lua
func parseConfigLine(line string, config *ServerConfig) {
	// Remove comments from line
	if idx := strings.Index(line, "--"); idx != -1 {
		line = line[:idx]
		line = strings.TrimSpace(line)
	}

	// Skip if line doesn't contain '='
	if !strings.Contains(line, "=") {
		return
	}

	// Match: key = value or key = "value" or key = { ... }
	// Support both quoted and unquoted values
	matches := configLineRegex.FindStringSubmatch(line)
	if len(matches) != 3 {
		return
	}

	key := strings.TrimSpace(matches[1])
	value := strings.TrimSpace(matches[2])

	// Skip if value is a table (starts with {)
	if strings.HasPrefix(value, "{") {
		return
	}

	// Allow expressions for specific fields (like timeToDecreaseFrags)
	// For other fields, skip if value contains expressions
	keyLower := strings.ToLower(key)
	allowExpressions := keyLower == "timetodecreasefrags"

	if !allowExpressions && strings.ContainsAny(value, "+-*/%") && !strings.HasPrefix(value, `"`) && !strings.HasPrefix(value, `'`) {
		return
	}

	// Remove quotes if present (both single and double)
	value = strings.Trim(value, `"'`)

	// Look up setter in map and apply if found
	if setter, exists := configSetters[keyLower]; exists {
		setter(config, value)
	}
}

// GetServerConfig returns the current server configuration
// Returns a copy to prevent external modifications
func GetServerConfig() *ServerConfig {
	serverConfigMutex.RLock()
	defer serverConfigMutex.RUnlock()

	if serverConfig == nil {
		return &ServerConfig{} // Return empty config if not loaded
	}

	// Return a copy to prevent external modifications
	return &ServerConfig{
		ServerName:         serverConfig.ServerName,
		WorldType:          serverConfig.WorldType,
		IP:                 serverConfig.IP,
		LoginPort:          serverConfig.LoginPort,
		GamePort:           serverConfig.GamePort,
		RateExp:            serverConfig.RateExp,
		RateSkill:          serverConfig.RateSkill,
		RateMagic:          serverConfig.RateMagic,
		RateLoot:           serverConfig.RateLoot,
		RateSpawn:          serverConfig.RateSpawn,
		MapName:            serverConfig.MapName,
		MapAuthor:          serverConfig.MapAuthor,
		HouseRentPeriod:    serverConfig.HouseRentPeriod,
		MaxPlayers:         serverConfig.MaxPlayers,
		OwnerName:          serverConfig.OwnerName,
		OwnerEmail:         serverConfig.OwnerEmail,
		URL:                serverConfig.URL,
		Location:           serverConfig.Location,
		ProtectionLevel:    serverConfig.ProtectionLevel,
		LowLevelBonusExp:   serverConfig.LowLevelBonusExp,
		RateUseStages:      serverConfig.RateUseStages,
		FreePremium:        serverConfig.FreePremium,
		FragDuration:       serverConfig.FragDuration,
		RedSkullDuration:   serverConfig.RedSkullDuration,
		BlackSkullDuration: serverConfig.BlackSkullDuration,
		DayKillsToRedSkull:   serverConfig.DayKillsToRedSkull,
		WeekKillsToRedSkull:  serverConfig.WeekKillsToRedSkull,
		MonthKillsToRedSkull: serverConfig.MonthKillsToRedSkull,
		LastLoaded:         serverConfig.LastLoaded,
	}
}

// GetServerName returns the server name from config
// Optimized to avoid full struct copy
func GetServerName() string {
	serverConfigMutex.RLock()
	defer serverConfigMutex.RUnlock()

	if serverConfig != nil && serverConfig.ServerName != "" {
		return serverConfig.ServerName
	}
	return "CodexAAC" // Default fallback
}

// PublicServerConfig represents the public server configuration (for API responses)
type PublicServerConfig struct {
	ServerName         string `json:"serverName"`
	WorldType          string `json:"worldType"`
	IP                 string `json:"ip"`
	LoginPort          int    `json:"loginPort"`
	GamePort           int    `json:"gamePort"`
	RateExp            int    `json:"rateExp"`
	RateSkill          int    `json:"rateSkill"`
	RateMagic          int    `json:"rateMagic"`
	RateLoot           int    `json:"rateLoot"`
	RateSpawn          int    `json:"rateSpawn"`
	MapName            string `json:"mapName"`
	MapAuthor          string `json:"mapAuthor"`
	HouseRentPeriod    string `json:"houseRentPeriod"`
	MaxPlayers         int    `json:"maxPlayers"`
	OwnerName          string `json:"ownerName"`
	OwnerEmail         string `json:"ownerEmail"`
	URL                string `json:"url"`
	Location           string `json:"location"`
	ProtectionLevel    int    `json:"protectionLevel"`
	LowLevelBonusExp   int    `json:"lowLevelBonusExp"`
	RateUseStages      bool   `json:"rateUseStages"`
	FreePremium        bool   `json:"freePremium"`
	FragDuration       int    `json:"fragDuration"`
	RedSkullDuration   int    `json:"redSkullDuration"`
	BlackSkullDuration int    `json:"blackSkullDuration"`
	DayKillsToRedSkull   int `json:"dayKillsToRedSkull"`
	WeekKillsToRedSkull  int `json:"weekKillsToRedSkull"`
	MonthKillsToRedSkull int `json:"monthKillsToRedSkull"`
}

// GetPublicServerConfig returns the public server configuration (excludes sensitive data)
func GetPublicServerConfig() PublicServerConfig {
	config := GetServerConfig()
	return PublicServerConfig{
		ServerName:          config.ServerName,
		WorldType:           config.WorldType,
		IP:                  config.IP,
		LoginPort:           config.LoginPort,
		GamePort:            config.GamePort,
		RateExp:             config.RateExp,
		RateSkill:           config.RateSkill,
		RateMagic:           config.RateMagic,
		RateLoot:            config.RateLoot,
		RateSpawn:           config.RateSpawn,
		MapName:             config.MapName,
		MapAuthor:           config.MapAuthor,
		HouseRentPeriod:     config.HouseRentPeriod,
		MaxPlayers:          config.MaxPlayers,
		OwnerName:           config.OwnerName,
		OwnerEmail:          config.OwnerEmail,
		URL:                 config.URL,
		Location:            config.Location,
		ProtectionLevel:     config.ProtectionLevel,
		LowLevelBonusExp:    config.LowLevelBonusExp,
		RateUseStages:       config.RateUseStages,
		FreePremium:         config.FreePremium,
		FragDuration:        config.FragDuration,
		RedSkullDuration:    config.RedSkullDuration,
		BlackSkullDuration:  config.BlackSkullDuration,
		DayKillsToRedSkull:   config.DayKillsToRedSkull,
		WeekKillsToRedSkull:  config.WeekKillsToRedSkull,
		MonthKillsToRedSkull: config.MonthKillsToRedSkull,
	}
}
