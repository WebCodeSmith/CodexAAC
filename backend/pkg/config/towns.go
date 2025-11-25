package config

import (
    "strconv"
    "strings"
)

type TownInfo struct {
    ID   int    `json:"id"`
    Name string `json:"name"`
}

var Towns []TownInfo
var TownsMap map[int]string

func parseTownsFromEnv(envVal string) []TownInfo {
    towns := make([]TownInfo, 0)
    if envVal == "" {
        serverName := GetServerName()
        if serverName == "" {
            serverName = "Rookgaard"
        }
        return []TownInfo{{ID: 1, Name: serverName}}
    }
    pairs := strings.Split(envVal, ",")
    for _, p := range pairs {
        p = strings.TrimSpace(p)
        if p == "" {
            continue
        }
        if strings.Contains(p, ":") {
            parts := strings.SplitN(p, ":", 2)
            id, err := strconv.Atoi(strings.TrimSpace(parts[0]))
            if err != nil {
                continue
            }
            name := strings.TrimSpace(parts[1])
            towns = append(towns, TownInfo{ID: id, Name: name})
        } else if strings.Contains(p, "=") {
            parts := strings.SplitN(p, "=", 2)
            id, err := strconv.Atoi(strings.TrimSpace(parts[1]))
            if err != nil {
                continue
            }
            name := strings.TrimSpace(parts[0])
            towns = append(towns, TownInfo{ID: id, Name: name})
        }
    }
    return towns
}

func InitTowns(envVal string) {
    Towns = parseTownsFromEnv(envVal)
    if TownsMap == nil {
        TownsMap = make(map[int]string, len(Towns))
    }
    for _, t := range Towns {
        TownsMap[t.ID] = t.Name
    }
    if len(Towns) == 0 {
        serverName := GetServerName()
        if serverName == "" {
            serverName = "Rookgaard"
        }
        Towns = []TownInfo{{ID: 1, Name: serverName}}
        TownsMap[1] = serverName
    }
}

func GetTowns() []TownInfo { return Towns }
func IsValidTown(id int) bool { _, ok := TownsMap[id]; return ok }
func GetTownName(id int) (string, bool) { name, ok := TownsMap[id]; return name, ok }
