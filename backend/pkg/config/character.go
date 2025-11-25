package config

import "unicode"

const (
	UnknownVocation = "Unknown"
)

// CharacterCreationConfig holds default values for character creation
type CharacterCreationConfig struct {
	GroupID   int
	Cap       int
	Health    int
	MaxHealth int
	Mana      int
	MaxMana   int
	ManaSpent int
	Experience int64
	TownID int
	SkillFist      int
	SkillClub      int
	SkillClubTries  int
	SkillSword     int
	SkillSwordTries int
	SkillAxe       int
	SkillAxeTries   int
	SkillDist      int
	SkillDistTries  int
	SkillShielding int
	SkillFishing   int
	MagLevel int
	Level int
	LookBody  int
	LookFeet  int
	LookHead  int
	LookLegs  int
}

func GetCharacterCreationConfig() *CharacterCreationConfig {
	defaultTown := 1
	if len(Towns) > 0 {
		defaultTown = Towns[0].ID
	}

	return &CharacterCreationConfig{
		GroupID:         1,
		Cap:             470,
		Health:          185,
		MaxHealth:       185,
		Mana:            185,
		MaxMana:         185,
		ManaSpent:       0,
		Experience:      4200,
		TownID:          defaultTown,
		SkillFist:       10,
		SkillClub:       10,
		SkillClubTries:  0,
		SkillSword:      10,
		SkillSwordTries: 0,
		SkillAxe:        10,
		SkillAxeTries:   0,
		SkillDist:       10,
		SkillDistTries:  0,
		SkillShielding:  10,
		SkillFishing:    10,
		MagLevel:        0,
		Level:           8,
		LookBody:        69,
		LookFeet:        76,
		LookHead:        78,
		LookLegs:        58,
	}
}

var VocationMapping = map[string]int{
	"sorcerer": 1,
	"druid":    2,
	"paladin":  3,
	"knight":   4,
}

var SexMapping = map[string]int{
	"male":   1,
	"female": 0,
}

var VocationReverseMapping map[int]string
var SexReverseMapping map[int]string

var LookTypeMapping = map[int]int{
	1: 128, // male
	0: 136, // female
}

func init() {
	VocationReverseMapping = make(map[int]string, len(VocationMapping))
	for name, id := range VocationMapping {
		if len(name) == 0 {
			continue
		}
		runes := []rune(name)
		runes[0] = unicode.ToUpper(runes[0])
		for i := 1; i < len(runes); i++ {
			runes[i] = unicode.ToLower(runes[i])
		}
		VocationReverseMapping[id] = string(runes)
	}

	SexReverseMapping = make(map[int]string, len(SexMapping))
	for name, id := range SexMapping {
		SexReverseMapping[id] = name
	}
}

func GetVocationName(vocationID int) string {
	if name, ok := VocationReverseMapping[vocationID]; ok {
		return name
	}
	return UnknownVocation
}

func GetSexName(sexID int) string {
	if name, ok := SexReverseMapping[sexID]; ok {
		return name
	}
	return "unknown"
}
