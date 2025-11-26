package handlers

import (
	"database/sql"
	"errors"
	"net/http"
	"strconv"
	"strings"

	"codexaac-backend/internal/database"
	"codexaac-backend/pkg/config"
	"codexaac-backend/pkg/middleware"
	"codexaac-backend/pkg/utils"
	"github.com/gorilla/mux"
)

type CreateCharacterRequest struct {
	Name     string `json:"name"`
	Vocation string `json:"vocation"`
	Sex      string `json:"sex"`
	TownID   int    `json:"town_id,omitempty"`
}

type CreateCharacterResponse struct {
	Message string `json:"message"`
	ID      int    `json:"id,omitempty"`
}

type CharacterDetails struct {
	Name          string          `json:"name"`
	Sex           string          `json:"sex"`
	Vocation      string          `json:"vocation"`
	Level         int             `json:"level"`
	Residence     string          `json:"residence"`
	GuildName     string          `json:"guildName,omitempty"`
	GuildRank     string          `json:"guildRank,omitempty"`
	LastSeen      int64           `json:"lastSeen"`
	Created       int64           `json:"created"`
	AccountStatus string          `json:"accountStatus"`
	Status        string          `json:"status"`
	LookType      int             `json:"lookType"`
	LookHead      int             `json:"lookHead"`
	LookBody      int             `json:"lookBody"`
	LookLegs      int             `json:"lookLegs"`
	LookFeet      int             `json:"lookFeet"`
	LookAddons    int             `json:"lookAddons"`
	Health        int64           `json:"health"`
	HealthMax     int64           `json:"healthMax"`
	Mana          int64           `json:"mana"`
	ManaMax       int64           `json:"manaMax"`
	MagicLevel    int             `json:"magicLevel"`
	SkillFist     int             `json:"skillFist"`
	SkillClub     int             `json:"skillClub"`
	SkillSword    int             `json:"skillSword"`
	SkillAxe      int             `json:"skillAxe"`
	SkillDist     int             `json:"skillDist"`
	SkillDef      int             `json:"skillDef"`
	SkillFish     int             `json:"skillFish"`
	Soul          int             `json:"soul"`
	Cap           int             `json:"cap"`
	Equipment     []EquipmentItem `json:"equipment"`
}

type EquipmentItem struct {
	Slot   int `json:"slot"`
	ItemID int `json:"itemId"`
	Count  int `json:"count"`
}

type Death struct {
	Time     int64  `json:"time"`
	Level    int    `json:"level"`
	KilledBy string `json:"killedBy"`
	IsPlayer bool   `json:"isPlayer"`
}

type CharacterDetailsResponse struct {
	Character CharacterDetails `json:"character"`
	Deaths    []Death          `json:"deaths"`
}

type Character struct {
	ID         int    `json:"id"`
	Name       string `json:"name"`
	Vocation   string `json:"vocation"`
	Level      int    `json:"level"`
	World      string `json:"world"`
	Status     string `json:"status"`
	LookType   int    `json:"lookType"`
	LookHead   int    `json:"lookHead"`
	LookBody   int    `json:"lookBody"`
	LookLegs  int    `json:"lookLegs"`
	LookFeet   int    `json:"lookFeet"`
	LookAddons int    `json:"lookAddons"`
}

func CreateCharacterHandler(w http.ResponseWriter, r *http.Request) {
	userID, ok := r.Context().Value(middleware.UserIDKey).(int)
	if !ok {
		utils.WriteError(w, http.StatusUnauthorized, "Authentication required")
		return
	}

	var req CreateCharacterRequest
	if err := utils.DecodeJSON(r, &req); err != nil {
		if errors.Is(err, utils.ErrBodyTooLarge) {
			utils.WriteError(w, http.StatusRequestEntityTooLarge, "Request body too large")
		} else if errors.Is(err, utils.ErrInvalidContentType) {
			utils.WriteError(w, http.StatusUnsupportedMediaType, "Content-Type must be application/json")
		} else {
			utils.WriteError(w, http.StatusBadRequest, "Invalid request")
		}
		return
	}

	req.Name = utils.SanitizeString(req.Name, 255)
	if req.Name == "" {
		utils.WriteError(w, http.StatusBadRequest, "Character name is required")
		return
	}

	if len(req.Name) < 3 || len(req.Name) > 20 {
		utils.WriteError(w, http.StatusBadRequest, "Character name must be between 3 and 20 characters")
		return
	}

	nameRegex := utils.GetNameRegex()
	if !nameRegex.MatchString(req.Name) {
		utils.WriteError(w, http.StatusBadRequest, "Character name must contain only letters and spaces")
		return
	}

	vocationID, ok := config.VocationMapping[strings.ToLower(req.Vocation)]
	if !ok {
		utils.WriteError(w, http.StatusBadRequest, "Invalid vocation")
		return
	}

	sexID, ok := config.SexMapping[strings.ToLower(req.Sex)]
	if !ok {
		utils.WriteError(w, http.StatusBadRequest, "Invalid sex")
		return
	}

	charConfig := config.GetCharacterCreationConfig()

	lookType, ok := config.LookTypeMapping[sexID]
	if !ok {
		lookType = 136
	}

	ctx, cancel := utils.NewDBContext()
	defer cancel()

	var exists bool
	err := database.DB.QueryRowContext(ctx, "SELECT EXISTS(SELECT 1 FROM players WHERE name = ?)", req.Name).Scan(&exists)
	if err != nil {
		if utils.HandleDBError(w, err) {
			return
		}
		utils.WriteError(w, http.StatusInternalServerError, "Error checking character name")
		return
	}

	if exists {
		utils.WriteError(w, http.StatusConflict, "Character name already exists")
		return
	}

	query := `
		INSERT INTO players (
			name, group_id, account_id, level, vocation,
			health, healthmax, experience,
			lookbody, lookfeet, lookhead, looklegs, looktype, lookaddons,
			maglevel, mana, manamax, manaspent, town_id,
			conditions, cap, sex, stamina,
			skill_fist, skill_fist_tries,
			skill_club, skill_club_tries,
			skill_sword, skill_sword_tries,
			skill_axe, skill_axe_tries,
			skill_dist, skill_dist_tries,
			skill_shielding, skill_shielding_tries,
			skill_fishing, skill_fishing_tries
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`

	townID := charConfig.TownID
	if req.TownID != 0 {
		if !config.IsValidTown(req.TownID) {
			utils.WriteError(w, http.StatusBadRequest, "Invalid town selection")
			return
		}

		townID = req.TownID
	}

	result, err := database.DB.ExecContext(ctx, query,
		req.Name,                   // name
		charConfig.GroupID,         // group_id
		userID,                     // account_id
		charConfig.Level,           // level
		vocationID,                 // vocation
		charConfig.Health,          // health
		charConfig.MaxHealth,       // healthmax
		charConfig.Experience,      // experience
		charConfig.LookBody,        // lookbody
		charConfig.LookFeet,        // lookfeet
		charConfig.LookHead,        // lookhead
		charConfig.LookLegs,        // looklegs
		lookType,                   // looktype
		charConfig.LookAddons,      // lookaddons
		charConfig.MagLevel,        // maglevel
		charConfig.Mana,            // mana
		charConfig.MaxMana,         // manamax
		charConfig.ManaSpent,       // manaspent
		townID,                     // town_id
		[]byte{},                   // conditions (empty blob)
		charConfig.Cap,             // cap
		sexID,                      // sex
		charConfig.Stamina,         // stamina
		charConfig.SkillFist,       // skill_fist
		charConfig.SkillFistTries,  // skill_fist_tries
		charConfig.SkillClub,       // skill_club
		charConfig.SkillClubTries,  // skill_club_tries
		charConfig.SkillSword,      // skill_sword
		charConfig.SkillSwordTries, // skill_sword_tries
		charConfig.SkillAxe,        // skill_axe
		charConfig.SkillAxeTries,   // skill_axe_tries
		charConfig.SkillDist,       // skill_dist
		charConfig.SkillDistTries,  // skill_dist_tries
		charConfig.SkillShielding,  // skill_shielding
		charConfig.SkillShieldingTries, // skill_shielding_tries
		charConfig.SkillFishing,    // skill_fishing
		charConfig.SkillFishingTries, // skill_fishing_tries
	)

	if err != nil {
		if utils.HandleDBError(w, err) {
			return
		}
		utils.WriteError(w, http.StatusInternalServerError, "Error creating character")
		return
	}

	characterID, err := result.LastInsertId()
	if err != nil {
		utils.WriteError(w, http.StatusInternalServerError, "Error getting character ID")
		return
	}

	utils.WriteSuccess(w, http.StatusCreated, "Character created successfully", CreateCharacterResponse{
		ID: int(characterID),
	})
}

func GetCharactersHandler(w http.ResponseWriter, r *http.Request) {
	userID, ok := r.Context().Value(middleware.UserIDKey).(int)
	if !ok {
		utils.WriteError(w, http.StatusUnauthorized, "Authentication required")
		return
	}

	ctx, cancel := utils.NewDBContext()
	defer cancel()

	query := `
		SELECT
			p.id,
			p.name,
			p.vocation,
			p.level,
			CASE WHEN po.player_id IS NOT NULL THEN 'online' ELSE 'offline' END as status,
			COALESCE(p.looktype, 128) as looktype,
			COALESCE(p.lookhead, 0) as lookhead,
			COALESCE(p.lookbody, 0) as lookbody,
			COALESCE(p.looklegs, 0) as looklegs,
			COALESCE(p.lookfeet, 0) as lookfeet,
			COALESCE(p.lookaddons, 0) as lookaddons
		FROM players p
		LEFT JOIN players_online po ON p.id = po.player_id
		WHERE p.account_id = ?
		ORDER BY p.name
	`

	rows, err := database.DB.QueryContext(ctx, query, userID)
	if err != nil {
		if utils.HandleDBError(w, err) {
			return
		}
		utils.WriteError(w, http.StatusInternalServerError, "Error fetching characters")
		return
	}
	defer rows.Close()

	characters := make([]Character, 0, 5)
	for rows.Next() {
		var char Character
		var vocationID int
		var status string

		if err := rows.Scan(&char.ID, &char.Name, &vocationID, &char.Level, &status, &char.LookType, &char.LookHead, &char.LookBody, &char.LookLegs, &char.LookFeet, &char.LookAddons); err != nil {
			utils.WriteError(w, http.StatusInternalServerError, "Error reading character data")
			return
		}

		char.Vocation = config.GetVocationName(vocationID)
		char.Status = status
		char.World = config.GetServerName()

		characters = append(characters, char)
	}

	if err = rows.Err(); err != nil {
		utils.WriteError(w, http.StatusInternalServerError, "Error processing characters")
		return
	}

	utils.WriteSuccess(w, http.StatusOK, "Characters retrieved successfully", characters)
}

func GetCharacterDetailsHandler(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	characterName := vars["name"]

	if characterName == "" {
		utils.WriteError(w, http.StatusBadRequest, "Character name is required")
		return
	}

	characterName = utils.SanitizeString(characterName, 255)

	ctx, cancel := utils.NewDBContext()
	defer cancel()

	var char CharacterDetails
	var vocationID, sexID int
	var lastLogin, created int64
	var townName, guildName, guildRank sql.NullString
	var townID sql.NullInt64
	var premdays int

	query := `
		SELECT
			p.id,
			p.name,
			p.sex,
			p.vocation,
			p.level,
			p.lastlogin,
			COALESCE(a.creation, 0) as creation,
			CASE WHEN po.player_id IS NOT NULL THEN 'online' ELSE 'offline' END as status,
			COALESCE(t.name, 'Unknown') as town_name,
			COALESCE(p.town_id, 0) as town_id,
			g.name as guild_name,
			gr.name as guild_rank,
			COALESCE(a.premdays, 0) as premdays,
			COALESCE(p.looktype, 128) as looktype,
			COALESCE(p.lookhead, 0) as lookhead,
			COALESCE(p.lookbody, 0) as lookbody,
			COALESCE(p.looklegs, 0) as looklegs,
			COALESCE(p.lookfeet, 0) as lookfeet,
			COALESCE(p.lookaddons, 0) as lookaddons,
			COALESCE(p.health, 0) as health,
			COALESCE(p.healthmax, 0) as healthmax,
			COALESCE(p.mana, 0) as mana,
			COALESCE(p.manamax, 0) as manamax,
			COALESCE(p.maglevel, 0) as maglevel,
			COALESCE(p.skill_fist, 10) as skill_fist,
			COALESCE(p.skill_club, 10) as skill_club,
			COALESCE(p.skill_sword, 10) as skill_sword,
			COALESCE(p.skill_axe, 10) as skill_axe,
			COALESCE(p.skill_dist, 10) as skill_dist,
			COALESCE(p.skill_shielding, 10) as skill_shielding,
			COALESCE(p.skill_fishing, 10) as skill_fishing,
			COALESCE(p.soul, 0) as soul,
			COALESCE(p.cap, 0) as cap
		FROM players p
		LEFT JOIN players_online po ON p.id = po.player_id
		LEFT JOIN towns t ON p.town_id = t.id
		LEFT JOIN guild_membership gm ON p.id = gm.player_id
		LEFT JOIN guilds g ON gm.guild_id = g.id
		LEFT JOIN guild_ranks gr ON gm.rank_id = gr.id
		LEFT JOIN accounts a ON p.account_id = a.id
		WHERE p.name = ?
		LIMIT 1
	`

	var playerID int
	err := database.DB.QueryRowContext(ctx, query, characterName).Scan(
		&playerID,
		&char.Name,
		&sexID,
		&vocationID,
		&char.Level,
		&lastLogin,
		&created,
		&char.Status,
		&townName,
		&townID,
		&guildName,
		&guildRank,
		&premdays,
		&char.LookType,
		&char.LookHead,
		&char.LookBody,
		&char.LookLegs,
		&char.LookFeet,
		&char.LookAddons,
		&char.Health,
		&char.HealthMax,
		&char.Mana,
		&char.ManaMax,
		&char.MagicLevel,
		&char.SkillFist,
		&char.SkillClub,
		&char.SkillSword,
		&char.SkillAxe,
		&char.SkillDist,
		&char.SkillDef,
		&char.SkillFish,
		&char.Soul,
		&char.Cap,
	)

	if err == sql.ErrNoRows {
		utils.WriteError(w, http.StatusNotFound, "Character not found")
		return
	}

	if err != nil {
		if utils.HandleDBError(w, err) {
			return
		}
		utils.WriteError(w, http.StatusInternalServerError, "Error fetching character details")
		return
	}

	char.Vocation = config.GetVocationName(vocationID)
	char.Sex = config.GetSexName(sexID)

	if townName.Valid {
		char.Residence = townName.String
	} else if townID.Valid && config.IsValidTown(int(townID.Int64)) {
		if name, ok := config.GetTownName(int(townID.Int64)); ok {
			char.Residence = name
		} else {
			char.Residence = "Unknown"
		}
	} else {
		char.Residence = "Unknown"
	}

	if guildName.Valid {
		char.GuildName = guildName.String
	}
	if guildRank.Valid {
		char.GuildRank = guildRank.String
	}

	char.LastSeen = lastLogin
	char.Created = created

	serverConfig := config.GetServerConfig()
	if premdays > 0 || serverConfig.FreePremium {
		char.AccountStatus = "VIP Account"
	} else {
		char.AccountStatus = "Free Account"
	}

	equipmentQuery := `
		SELECT sid, itemtype, count
		FROM player_items
		WHERE player_id = ? AND pid = 0 AND sid IN (1, 2, 3, 4, 5, 6, 7, 8, 9, 10)
		ORDER BY sid
	`

	equipmentRows, err := database.DB.QueryContext(ctx, equipmentQuery, playerID)
	equipment := make([]EquipmentItem, 0, 10)
	if err == nil {
		defer equipmentRows.Close()
		for equipmentRows.Next() {
			var item EquipmentItem
			if err := equipmentRows.Scan(&item.Slot, &item.ItemID, &item.Count); err == nil {
				equipment = append(equipment, item)
			}
		}
		if err = equipmentRows.Err(); err != nil {
		}
	}
	char.Equipment = equipment

	deathsQuery := `
		SELECT time, level, killed_by, is_player
		FROM player_deaths
		WHERE player_id = ?
		ORDER BY time DESC
		LIMIT 20
	`

	rows, err := database.DB.QueryContext(ctx, deathsQuery, playerID)
	deaths := make([]Death, 0, 20)
	if err == nil {
		defer rows.Close()
		for rows.Next() {
			var death Death
			if err := rows.Scan(&death.Time, &death.Level, &death.KilledBy, &death.IsPlayer); err == nil {
				deaths = append(deaths, death)
			}
		}
		if err = rows.Err(); err != nil {
		}
	}

	response := CharacterDetailsResponse{
		Character: char,
		Deaths:    deaths,
	}

	utils.WriteSuccess(w, http.StatusOK, "Character details retrieved successfully", response)
}

type OnlinePlayer struct {
	Name       string `json:"name"`
	Level      int    `json:"level"`
	Vocation   string `json:"vocation"`
	LookType   int    `json:"lookType"`
	LookHead   int    `json:"lookHead"`
	LookBody   int    `json:"lookBody"`
	LookLegs   int    `json:"lookLegs"`
	LookFeet   int    `json:"lookFeet"`
	LookAddons int    `json:"lookAddons"`
}

func GetOnlinePlayersHandler(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := utils.NewDBContext()
	defer cancel()

	pageStr := r.URL.Query().Get("page")
	limitStr := r.URL.Query().Get("limit")
	search := r.URL.Query().Get("search")
	search = strings.TrimSpace(search)

	page := 1
	limit := 50

	if pageStr != "" {
		if p, err := strconv.Atoi(pageStr); err == nil && p > 0 {
			page = p
		}
	}

	if limitStr != "" {
		if l, err := strconv.Atoi(limitStr); err == nil && l > 0 && l <= 200 {
			limit = l
		}
	}

	offset := (page - 1) * limit

	query := `
		SELECT
			p.name,
			p.level,
			p.vocation,
			COALESCE(NULLIF(p.looktype, 0), 128) as looktype,
			COALESCE(p.lookhead, 0) as lookhead,
			COALESCE(p.lookbody, 0) as lookbody,
			COALESCE(p.looklegs, 0) as looklegs,
			COALESCE(p.lookfeet, 0) as lookfeet,
			COALESCE(p.lookaddons, 0) as lookaddons
		FROM players_online po
		INNER JOIN players p ON po.player_id = p.id
		WHERE p.deletion = 0
	`

	args := make([]interface{}, 0, 3)
	if search != "" {
		query += " AND p.name LIKE ?"
		args = append(args, "%"+search+"%")
	}
	query += " ORDER BY p.level DESC, p.name ASC LIMIT ? OFFSET ?"
	args = append(args, limit, offset)

	rows, err := database.DB.QueryContext(ctx, query, args...)
	if err != nil {
		if utils.HandleDBError(w, err) {
			return
		}
		utils.WriteError(w, http.StatusInternalServerError, "Error fetching online players")
		return
	}
	defer rows.Close()

	players := make([]OnlinePlayer, 0, limit)
	for rows.Next() {
		var player OnlinePlayer
		var vocationID int

		if err := rows.Scan(
			&player.Name,
			&player.Level,
			&vocationID,
			&player.LookType,
			&player.LookHead,
			&player.LookBody,
			&player.LookLegs,
			&player.LookFeet,
			&player.LookAddons,
		); err != nil {
			continue
		}

		player.Vocation = config.GetVocationName(vocationID)
		players = append(players, player)
	}

	var totalCount int
	countQuery := `
		SELECT COUNT(*)
		FROM players_online po
		INNER JOIN players p ON po.player_id = p.id
		WHERE p.deletion = 0
	`
	countArgs := make([]interface{}, 0, 1)
	if search != "" {
		countQuery += " AND p.name LIKE ?"
		countArgs = append(countArgs, "%"+search+"%")
	}
	err = database.DB.QueryRowContext(ctx, countQuery, countArgs...).Scan(&totalCount)
	if err != nil {
		totalCount = len(players)
	}

	response := map[string]interface{}{
		"players": players,
		"pagination": map[string]interface{}{
			"page":       page,
			"limit":      limit,
			"total":      totalCount,
			"totalPages": (totalCount + limit - 1) / limit,
		},
	}

	utils.WriteSuccess(w, http.StatusOK, "Online players retrieved successfully", response)
}

