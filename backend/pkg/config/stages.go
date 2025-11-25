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
)

// Stage represents a single rate stage
type Stage struct {
	MinLevel  int  `json:"minLevel"`
	MaxLevel  *int `json:"maxLevel,omitempty"` // nil means infinite
	Multiplier int `json:"multiplier"`
}

// StagesConfig holds all rate stages from stages.lua
type StagesConfig struct {
	ExperienceStages []Stage `json:"experienceStages"`
	SkillsStages    []Stage `json:"skillsStages"`
	MagicLevelStages []Stage `json:"magicLevelStages"`
}

var (
	stagesConfig      *StagesConfig
	stagesConfigMutex sync.RWMutex
	stagesFilePath    string
	stageEntryRegex = regexp.MustCompile(`(\w+)\s*=\s*(\d+)`)
)

// InitStagesConfig initializes stages configuration from stages.lua
func InitStagesConfig(stagesPath string) error {
	stagesFilePath = stagesPath
	return ReloadStagesConfig()
}

func ReloadStagesConfig() error {
	if stagesFilePath == "" {
		serverPath := os.Getenv("SERVER_PATH")
		if serverPath == "" {
			return fmt.Errorf("SERVER_PATH not configured")
		}

		stagesFilePath = filepath.Join(serverPath, "data", "stages.lua")
	}

	file, err := os.Open(stagesFilePath)
	if err != nil {
		return fmt.Errorf("failed to open stages.lua: %w", err)
	}
	defer file.Close()

	config := &StagesConfig{
		ExperienceStages: []Stage{},
		SkillsStages:     []Stage{},
		MagicLevelStages: []Stage{},
	}

	scanner := bufio.NewScanner(file)
	var currentTable string
	var currentStage Stage
	inStage := false

	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())

		if line == "" || strings.HasPrefix(line, "--") {
			continue
		}

		if strings.Contains(line, "experienceStages") {
			currentTable = "experience"
			continue
		} else if strings.Contains(line, "skillsStages") {
			currentTable = "skills"
			continue
		} else if strings.Contains(line, "magicLevelStages") {
			currentTable = "magic"
			continue
		}

		if strings.HasPrefix(line, "{") {
			inStage = true
			currentStage = Stage{}
			continue
		}

		if strings.HasPrefix(line, "}") {
			if inStage {
				switch currentTable {
				case "experience":
					config.ExperienceStages = append(config.ExperienceStages, currentStage)
				case "skills":
					config.SkillsStages = append(config.SkillsStages, currentStage)
				case "magic":
					config.MagicLevelStages = append(config.MagicLevelStages, currentStage)
				}
				inStage = false
			}
			continue
		}

		if inStage {
			matches := stageEntryRegex.FindStringSubmatch(line)
			if len(matches) == 3 {
				key := strings.ToLower(matches[1])
				value, err := strconv.Atoi(matches[2])
				if err != nil {
					continue
				}

				switch key {
				case "minlevel":
					currentStage.MinLevel = value
				case "maxlevel":
					currentStage.MaxLevel = &value
				case "multiplier":
					currentStage.Multiplier = value
				}
			}
		}
	}

	if err := scanner.Err(); err != nil {
		return fmt.Errorf("error reading stages.lua: %w", err)
	}

	stagesConfigMutex.Lock()
	stagesConfig = config
	stagesConfigMutex.Unlock()

	return nil
}

// GetStagesConfig returns the current stages configuration
func GetStagesConfig() *StagesConfig {
	stagesConfigMutex.RLock()
	defer stagesConfigMutex.RUnlock()

	if stagesConfig == nil {
		return &StagesConfig{
			ExperienceStages: []Stage{},
			SkillsStages:     []Stage{},
			MagicLevelStages: []Stage{},
		}
	}

	return &StagesConfig{
		ExperienceStages: append([]Stage{}, stagesConfig.ExperienceStages...),
		SkillsStages:     append([]Stage{}, stagesConfig.SkillsStages...),
		MagicLevelStages: append([]Stage{}, stagesConfig.MagicLevelStages...),
	}
}
