package config

import (
	"bufio"
	"fmt"
	"os"
	"path/filepath"
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
	configLineRegex = regexp.MustCompile(`^(\w+)\s*=\s*(.+)$`)
)

type configSetter func(*ServerConfig, string)

func parseIntValue(value string) (int, bool) {
	intVal, err := strconv.Atoi(value)
	return intVal, err == nil
}

func parseBoolValue(value string) bool {
	value = strings.ToLower(strings.TrimSpace(value))
	return value == "true" || value == "1"
}

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
		if strings.Contains(v, "*") {
			parts := strings.Split(v, "*")
			if len(parts) > 0 {
				if hours, ok := parseIntValue(strings.TrimSpace(parts[0])); ok {
					c.FragDuration = hours
				}
			}
		} else if hours, ok := parseIntValue(v); ok {
			c.FragDuration = hours
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

func ReloadServerConfig() error {
	if configFilePath == "" {
		serverPath := os.Getenv("SERVER_PATH")
		if serverPath == "" {
			return fmt.Errorf("SERVER_PATH not configured")
		}

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

		if line == "" || strings.HasPrefix(line, "--") {
			continue
		}

		parseConfigLine(line, config)
	}

	if err := scanner.Err(); err != nil {
		return fmt.Errorf("error reading config.lua: %w", err)
	}

	serverConfigMutex.Lock()
	serverConfig = config
	serverConfigMutex.Unlock()

	return nil
}

func parseConfigLine(line string, config *ServerConfig) {
	if idx := strings.Index(line, "--"); idx != -1 {
		line = line[:idx]
		line = strings.TrimSpace(line)
	}

	if !strings.Contains(line, "=") {
		return
	}

	matches := configLineRegex.FindStringSubmatch(line)
	if len(matches) != 3 {
		return
	}

	key := strings.TrimSpace(matches[1])
	value := strings.TrimSpace(matches[2])

	if strings.HasPrefix(value, "{") {
		return
	}

	keyLower := strings.ToLower(key)
	allowExpressions := keyLower == "timetodecreasefrags"

	if !allowExpressions && strings.ContainsAny(value, "+-*/%") && !strings.HasPrefix(value, `"`) && !strings.HasPrefix(value, `'`) {
		return
	}

	value = strings.Trim(value, `"'`)

	if setter, exists := configSetters[keyLower]; exists {
		setter(config, value)
	}
}

func GetServerConfig() *ServerConfig {
	serverConfigMutex.RLock()
	defer serverConfigMutex.RUnlock()

	if serverConfig == nil {
		return &ServerConfig{}
	}

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

func GetServerName() string {
	serverConfigMutex.RLock()
	defer serverConfigMutex.RUnlock()

	if serverConfig != nil && serverConfig.ServerName != "" {
		return serverConfig.ServerName
	}
	return "CodexAAC" // Default fallback
}

func GetMinGuildLevel() int {
	const defaultMinGuildLevel = 8
	envVal := strings.TrimSpace(os.Getenv("MIN_GUILD_LEVEL"))
	if envVal == "" {
		return defaultMinGuildLevel
	}

	if parsed, err := strconv.Atoi(envVal); err == nil && parsed > 0 {
		return parsed
	}
	return defaultMinGuildLevel
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
	MinLevelToCreateGuild int `json:"minLevelToCreateGuild"`
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
		MinLevelToCreateGuild: GetMinGuildLevel(),
	}
}
