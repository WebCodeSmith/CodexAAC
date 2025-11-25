package handlers

import (
	"database/sql"
	"errors"
	"net/http"
	"net/url"
	"regexp"
	"sort"
	"strconv"
	"time"

	"codexaac-backend/internal/database"
	"codexaac-backend/pkg/config"
	"codexaac-backend/pkg/middleware"
	"codexaac-backend/pkg/utils"
	"github.com/gorilla/mux"
)

// GuildMember represents a member of a guild
type GuildMember struct {
	PlayerID   int    `json:"playerId"`
	Name       string `json:"name"`
	Level      int    `json:"level"`
	Vocation   string `json:"vocation"`
	Rank       string `json:"rank"`
	RankLevel  int    `json:"rankLevel"`
	Nick       string `json:"nick,omitempty"`
	Status     string `json:"status"`
}

// GuildRank represents a rank in a guild
type GuildRank struct {
	ID    int    `json:"id"`
	Name  string `json:"name"`
	Level int    `json:"level"`
}

// PendingInviteItem represents a pending invite for a guild
type PendingInviteItem struct {
	PlayerID   int    `json:"playerId"`
	PlayerName string `json:"playerName"`
	Level      int    `json:"level"`
	Vocation   string `json:"vocation"`
	InviteDate int64  `json:"inviteDate"`
}

type GuildDetails struct {
	ID              int                `json:"id"`
	Name            string             `json:"name"`
	Level           int                 `json:"level"`
	OwnerID         int                `json:"ownerId"`
	OwnerName       string             `json:"ownerName"`
	CreatedAt       string             `json:"createdAt"`
	MOTD            string             `json:"motd,omitempty"`
	Balance         int64              `json:"balance"`
	Points          int                `json:"points"`
	MemberCount     int                `json:"memberCount"`
	Members         []GuildMember      `json:"members"`
	Ranks           []GuildRank       `json:"ranks"`
	PendingInvites  []PendingInviteItem `json:"pendingInvites"`
	HasPendingInvite bool              `json:"hasPendingInvite,omitempty"`
	IsMember        bool               `json:"isMember,omitempty"`
	CanInvite       bool               `json:"canInvite,omitempty"`
}

// GuildListItem represents a guild in the list view
type GuildListItem struct {
	ID          int    `json:"id"`
	Name        string `json:"name"`
	Level       int    `json:"level"`
	OwnerName   string `json:"ownerName"`
	MemberCount int    `json:"memberCount"`
	Points      int    `json:"points"`
}

// GetGuildsHandler returns a list of all guilds
func GetGuildsHandler(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := utils.NewDBContext()
	defer cancel()

	pageStr := r.URL.Query().Get("page")
	limitStr := r.URL.Query().Get("limit")
	search := r.URL.Query().Get("search")

	page := 1
	limit := 20

	if pageStr != "" {
		if p, err := strconv.Atoi(pageStr); err == nil && p > 0 {
			page = p
		}
	}

	if limitStr != "" {
		if l, err := strconv.Atoi(limitStr); err == nil && l > 0 && l <= 100 {
			limit = l
		}
	}

	offset := (page - 1) * limit

	var guilds []GuildListItem
	var query string
	var args []interface{}

	if search != "" {
		query = `
			SELECT g.id, g.name, g.level, g.points,
			       p.name as owner_name,
			       GREATEST(COUNT(DISTINCT gm.player_id) +
			                CASE WHEN SUM(CASE WHEN gm.player_id = g.ownerid THEN 1 ELSE 0 END) = 0 THEN 1 ELSE 0 END, 1) as member_count
			FROM guilds g
			LEFT JOIN players p ON g.ownerid = p.id
			LEFT JOIN guild_membership gm ON g.id = gm.guild_id
			WHERE g.name LIKE ?
			GROUP BY g.id, g.name, g.level, g.points, g.ownerid, p.name
			ORDER BY g.level DESC, g.points DESC, g.name ASC
			LIMIT ? OFFSET ?
		`
		args = []interface{}{"%" + search + "%", limit, offset}
	} else {
		query = `
			SELECT g.id, g.name, g.level, g.points,
			       p.name as owner_name,
			       GREATEST(COUNT(DISTINCT gm.player_id) +
			                CASE WHEN SUM(CASE WHEN gm.player_id = g.ownerid THEN 1 ELSE 0 END) = 0 THEN 1 ELSE 0 END, 1) as member_count
			FROM guilds g
			LEFT JOIN players p ON g.ownerid = p.id
			LEFT JOIN guild_membership gm ON g.id = gm.guild_id
			GROUP BY g.id, g.name, g.level, g.points, g.ownerid, p.name
			ORDER BY g.level DESC, g.points DESC, g.name ASC
			LIMIT ? OFFSET ?
		`
		args = []interface{}{limit, offset}
	}

	rows, err := database.DB.QueryContext(ctx, query, args...)
	if err != nil {
		if utils.HandleDBError(w, err) {
			return
		}

		utils.WriteError(w, http.StatusInternalServerError, "Error fetching guilds")
		return
	}
	defer rows.Close()

	for rows.Next() {
		var guild GuildListItem
		var ownerName sql.NullString

		err := rows.Scan(
			&guild.ID,
			&guild.Name,
			&guild.Level,
			&guild.Points,
			&ownerName,
			&guild.MemberCount,
		)
		if err != nil {
			continue
		}

		if ownerName.Valid {
			guild.OwnerName = ownerName.String
		} else {
			guild.OwnerName = "Unknown"
		}

		guilds = append(guilds, guild)
	}

	var totalCount int
	countQuery := "SELECT COUNT(*) FROM guilds"
	if search != "" {
		countQuery += " WHERE name LIKE ?"
		_ = database.DB.QueryRowContext(ctx, countQuery, "%"+search+"%").Scan(&totalCount)
	} else {
		_ = database.DB.QueryRowContext(ctx, countQuery).Scan(&totalCount)
	}

	response := map[string]interface{}{
		"guilds": guilds,
		"pagination": map[string]interface{}{
			"page":       page,
			"limit":      limit,
			"total":      totalCount,
			"totalPages": (totalCount + limit - 1) / limit,
		},
	}

	utils.WriteSuccess(w, http.StatusOK, "Guilds retrieved successfully", response)
}

// GetGuildDetailsHandler returns detailed information about a specific guild
func GetGuildDetailsHandler(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	guildName := vars["name"]

	if guildName == "" {
		utils.WriteError(w, http.StatusBadRequest, "Guild name is required")
		return
	}

	decodedName, err := url.PathUnescape(guildName)
	if err == nil && decodedName != guildName {
		guildName = decodedName
	}

	ctx, cancel := utils.NewDBContext()
	defer cancel()

	var guild GuildDetails
	guild.Ranks = []GuildRank{} // Initialize empty ranks array
	guild.Members = []GuildMember{} // Initialize empty members array
	guild.PendingInvites = []PendingInviteItem{}
	var ownerName sql.NullString
	var creationData int64
	var motd sql.NullString

	err = database.DB.QueryRowContext(ctx,
		`SELECT g.id, g.name, g.level, g.ownerid, g.creationdata,
		        g.motd, g.balance, g.points,
		        p.name as owner_name
		 FROM guilds g
		 LEFT JOIN players p ON g.ownerid = p.id
		 WHERE LOWER(g.name) = LOWER(?)`,
		guildName,
	).Scan(
		&guild.ID,
		&guild.Name,
		&guild.Level,
		&guild.OwnerID,
		&creationData,
		&motd,
		&guild.Balance,
		&guild.Points,
		&ownerName,
	)

	if err != nil {
		if err == sql.ErrNoRows {
			utils.WriteError(w, http.StatusNotFound, "Guild not found")
			return
		}
		if utils.HandleDBError(w, err) {
			return
		}
		utils.WriteError(w, http.StatusInternalServerError, "Error fetching guild")
		return
	}

	if ownerName.Valid {
		guild.OwnerName = ownerName.String
	} else {
		guild.OwnerName = "Unknown"
	}

	guild.CreatedAt = time.Unix(creationData, 0).Format("Jan 2, 2006, 15:04:05")
	if motd.Valid {
		guild.MOTD = motd.String
	}

	rankRows, err := database.DB.QueryContext(ctx,
		`SELECT id, name, level
		 FROM guild_ranks
		 WHERE guild_id = ?
		 ORDER BY level DESC`,
		guild.ID,
	)
	if err == nil {
		defer rankRows.Close()
		for rankRows.Next() {
			var rank GuildRank
			if err := rankRows.Scan(&rank.ID, &rank.Name, &rank.Level); err == nil {
				guild.Ranks = append(guild.Ranks, rank)
			}
		}
	}

	memberRows, err := database.DB.QueryContext(ctx,
		`SELECT p.id, p.name, p.level, p.vocation,
		        COALESCE(gr.name, 'Member') as rank_name,
		        COALESCE(gr.level, 0) as rank_level,
		        COALESCE(gm.nick, '') as nick,
		        CASE WHEN po.player_id IS NOT NULL THEN 'online' ELSE 'offline' END as status
		 FROM guild_membership gm
		 INNER JOIN players p ON gm.player_id = p.id
		 LEFT JOIN guild_ranks gr ON gm.rank_id = gr.id
		 LEFT JOIN players_online po ON p.id = po.player_id
		 WHERE gm.guild_id = ?
		 ORDER BY COALESCE(gr.level, 0) DESC, p.level DESC, p.name ASC`,
		guild.ID,
	)

	if err != nil {
	} else {
		defer memberRows.Close()
		for memberRows.Next() {
			var member GuildMember
			var rankName sql.NullString
			var rankLevel sql.NullInt64
			var nick sql.NullString
			var status string
			var vocationID int

			scanErr := memberRows.Scan(
				&member.PlayerID,
				&member.Name,
				&member.Level,
				&vocationID,
				&rankName,
				&rankLevel,
				&nick,
				&status,
			)
			if scanErr != nil {
				continue
			}

			member.Vocation = config.GetVocationName(vocationID)
			if rankName.Valid {
				member.Rank = rankName.String
			} else {
				member.Rank = "Member"
			}
			if rankLevel.Valid {
				member.RankLevel = int(rankLevel.Int64)
			} else {
				member.RankLevel = 0
			}
			if nick.Valid && nick.String != "" {
				member.Nick = nick.String
			}
			member.Status = status
			guild.Members = append(guild.Members, member)
		}
	}

	ownerExists := false
	for _, m := range guild.Members {
		if m.PlayerID == guild.OwnerID {
			ownerExists = true
			break
		}
	}

	if !ownerExists {
		var ownerLevel int
		var ownerVocationID int
		var ownerStatus string
		ownerErr := database.DB.QueryRowContext(ctx,
			`SELECT p.level, p.vocation,
			        CASE WHEN po.player_id IS NOT NULL THEN 'online' ELSE 'offline' END as status
			 FROM players p
			 LEFT JOIN players_online po ON p.id = po.player_id
			 WHERE p.id = ?`,
			guild.OwnerID,
		).Scan(&ownerLevel, &ownerVocationID, &ownerStatus)

		if ownerErr == nil {
			ownerMember := GuildMember{
				PlayerID:   guild.OwnerID,
				Name:       guild.OwnerName,
				Level:      ownerLevel,
				Vocation:   config.GetVocationName(ownerVocationID),
				Rank:       "Leader",
				RankLevel:  999, // Highest rank for owner
				Status:     ownerStatus,
			}
			guild.Members = append(guild.Members, ownerMember)
		}
	}

	sort.Slice(guild.Members, func(i, j int) bool {
		if guild.Members[i].RankLevel != guild.Members[j].RankLevel {
			return guild.Members[i].RankLevel > guild.Members[j].RankLevel
		}
		if guild.Members[i].Level != guild.Members[j].Level {
			return guild.Members[i].Level > guild.Members[j].Level
		}
		return guild.Members[i].Name < guild.Members[j].Name
	})

	guild.MemberCount = len(guild.Members)

	inviteRows, err := database.DB.QueryContext(ctx,
		`SELECT p.id, p.name, p.level, p.vocation, gi.date
		 FROM guild_invites gi
		 INNER JOIN players p ON gi.player_id = p.id
		 WHERE gi.guild_id = ?
		 ORDER BY gi.date DESC`,
		guild.ID,
	)
	if err == nil {
		defer inviteRows.Close()
		for inviteRows.Next() {
			var invite PendingInviteItem
			var vocationID int
			var date int
			if scanErr := inviteRows.Scan(
				&invite.PlayerID,
				&invite.PlayerName,
				&invite.Level,
				&vocationID,
				&date,
			); scanErr == nil {
				invite.Vocation = config.GetVocationName(vocationID)
				invite.InviteDate = int64(date)
				guild.PendingInvites = append(guild.PendingInvites, invite)
			}
		}
	}

	userID, ok := r.Context().Value(middleware.UserIDKey).(int)
	if ok {
		var hasInvite bool
		err = database.DB.QueryRowContext(ctx,
			`SELECT EXISTS(
				SELECT 1 FROM guild_invites gi
				JOIN players p ON gi.player_id = p.id
				WHERE gi.guild_id = ? AND p.account_id = ?
			)`,
			guild.ID, userID,
		).Scan(&hasInvite)
		if err == nil {
			guild.HasPendingInvite = hasInvite
		}

		var isOwner bool
		var userRankLevel int

		err = database.DB.QueryRowContext(ctx,
			`SELECT EXISTS(
				SELECT 1 FROM players p
				WHERE p.id = ? AND p.account_id = ?
			)`,
			guild.OwnerID, userID,
		).Scan(&isOwner)

		if err == nil && isOwner {
			guild.IsMember = true
			guild.CanInvite = true
		} else {
			var rankLevel sql.NullInt64
			err = database.DB.QueryRowContext(ctx,
				`SELECT COALESCE(gr.level, 0) as rank_level
				 FROM guild_membership gm
				 LEFT JOIN guild_ranks gr ON gm.rank_id = gr.id
				 JOIN players p ON gm.player_id = p.id
				 WHERE gm.guild_id = ? AND p.account_id = ?
				 LIMIT 1`,
				guild.ID, userID,
			).Scan(&rankLevel)

			if err == nil {
				if rankLevel.Valid {
					userRankLevel = int(rankLevel.Int64)
				}
				guild.IsMember = true
				guild.CanInvite = (userRankLevel >= 2)
			} else if err == sql.ErrNoRows {
				guild.IsMember = false
				guild.CanInvite = false
			}
		}
	}

	utils.WriteSuccess(w, http.StatusOK, "Guild details retrieved successfully", guild)
}

// CreateGuildRequest represents the request to create a guild
type CreateGuildRequest struct {
	Name     string `json:"name"`
	CharacterName string `json:"characterName"`
	MOTD     string `json:"motd,omitempty"`
}

// CreateGuildResponse represents the response after creating a guild
type CreateGuildResponse struct {
	ID      int    `json:"id"`
	Name    string `json:"name"`
	Message string `json:"message"`
}

// CreateGuildHandler creates a new guild
// Requirements:
// - User must be authenticated
// - User must have at least one character
// - Character must not be in another guild
// - Guild name must be unique and valid
func CreateGuildHandler(w http.ResponseWriter, r *http.Request) {
	userID, ok := r.Context().Value(middleware.UserIDKey).(int)
	if !ok {
		utils.WriteError(w, http.StatusUnauthorized, "Authentication required")
		return
	}

	var req CreateGuildRequest
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
		utils.WriteError(w, http.StatusBadRequest, "Guild name is required")
		return
	}

	if len(req.Name) < 3 || len(req.Name) > 20 {
		utils.WriteError(w, http.StatusBadRequest, "Guild name must be between 3 and 20 characters")
		return
	}

	guildNameRegex := regexp.MustCompile(`^[a-zA-Z0-9\s]+$`)
	if !guildNameRegex.MatchString(req.Name) {
		utils.WriteError(w, http.StatusBadRequest, "Guild name must contain only letters, numbers, and spaces")
		return
	}

	req.CharacterName = utils.SanitizeString(req.CharacterName, 255)
	if req.CharacterName == "" {
		utils.WriteError(w, http.StatusBadRequest, "Character name is required")
		return
	}

	if req.MOTD != "" {
		req.MOTD = utils.SanitizeString(req.MOTD, 255)
	}

	ctx, cancel := utils.NewDBContext()
	defer cancel()

	tx, err := database.DB.BeginTx(ctx, nil)
	if err != nil {
		if utils.HandleDBError(w, err) {
			return
		}
		utils.WriteError(w, http.StatusInternalServerError, "Error starting transaction")
		return
	}
	defer tx.Rollback()

	var characterID int
	var characterLevel int
	err = tx.QueryRowContext(ctx,
		`SELECT id, level FROM players WHERE name = ? AND account_id = ?`,
		req.CharacterName, userID,
	).Scan(&characterID, &characterLevel)

	if err != nil {
		if err == sql.ErrNoRows {
			utils.WriteError(w, http.StatusNotFound, "Character not found or does not belong to your account")
			return
		}
		if utils.HandleDBError(w, err) {
			return
		}
		utils.WriteError(w, http.StatusInternalServerError, "Error verifying character")
		return
	}

	minLevel := config.GetMinGuildLevel()
	if characterLevel < minLevel {
		msg := "Character level is " + strconv.Itoa(characterLevel) + ", but you need to be at least level " + strconv.Itoa(minLevel) + " to create a guild"
		utils.WriteError(w, http.StatusForbidden, msg)
		return
	}

	var existingGuildID sql.NullInt64
	err = tx.QueryRowContext(ctx,
		`SELECT guild_id FROM guild_membership WHERE player_id = ?`,
		characterID,
	).Scan(&existingGuildID)

	if err != nil && err != sql.ErrNoRows {
		if utils.HandleDBError(w, err) {
			return
		}
		utils.WriteError(w, http.StatusInternalServerError, "Error checking guild membership")
		return
	}

	if existingGuildID.Valid {
		utils.WriteError(w, http.StatusConflict, "Character is already in a guild")
		return
	}

	var existingOwnerGuildID sql.NullInt64
	err = tx.QueryRowContext(ctx,
		`SELECT id FROM guilds WHERE ownerid = ?`,
		characterID,
	).Scan(&existingOwnerGuildID)

	if err != nil && err != sql.ErrNoRows {
		if utils.HandleDBError(w, err) {
			return
		}
		utils.WriteError(w, http.StatusInternalServerError, "Error checking guild ownership")
		return
	}

	if existingOwnerGuildID.Valid {
		utils.WriteError(w, http.StatusConflict, "Character already owns a guild")
		return
	}

	var guildExists bool
	err = tx.QueryRowContext(ctx,
		`SELECT EXISTS(SELECT 1 FROM guilds WHERE LOWER(name) = LOWER(?))`,
		req.Name,
	).Scan(&guildExists)

	if err != nil {
		if utils.HandleDBError(w, err) {
			return
		}
		utils.WriteError(w, http.StatusInternalServerError, "Error checking guild name")
		return
	}

	if guildExists {
		utils.WriteError(w, http.StatusConflict, "Guild name already exists")
		return
	}

	creationTime := time.Now().Unix()
	result, err := tx.ExecContext(ctx,
		`INSERT INTO guilds (name, ownerid, creationdata, motd, level, balance, points)
		 VALUES (?, ?, ?, ?, 1, 0, 0)`,
		req.Name, characterID, creationTime, req.MOTD,
	)

	if err != nil {
		if utils.HandleDBError(w, err) {
			return
		}
		utils.WriteError(w, http.StatusInternalServerError, "Error creating guild")
		return
	}

	guildID, err := result.LastInsertId()
	if err != nil {
		utils.WriteError(w, http.StatusInternalServerError, "Error getting guild ID")
		return
	}

	ranks := []struct {
		name  string
		level int
	}{
		{"Leader", 3},
		{"Vice Leader", 2},
		{"Member", 1},
	}

	rankIDs := make(map[string]int64)
	for _, rank := range ranks {
		rankResult, err := tx.ExecContext(ctx,
			`INSERT INTO guild_ranks (guild_id, name, level) VALUES (?, ?, ?)`,
			guildID, rank.name, rank.level,
		)
		if err != nil {
			if utils.HandleDBError(w, err) {
				return
			}
			utils.WriteError(w, http.StatusInternalServerError, "Error creating guild ranks")
			return
		}
		rankID, _ := rankResult.LastInsertId()
		rankIDs[rank.name] = rankID
	}

	leaderRankID := rankIDs["Leader"]
	_, err = tx.ExecContext(ctx,
		`INSERT INTO guild_membership (player_id, guild_id, rank_id, nick) VALUES (?, ?, ?, '')`,
		characterID, guildID, leaderRankID,
	)

	if err != nil {
		if utils.HandleDBError(w, err) {
			return
		}
		utils.WriteError(w, http.StatusInternalServerError, "Error adding owner to guild")
		return
	}

	if err = tx.Commit(); err != nil {
		if utils.HandleDBError(w, err) {
			return
		}
		utils.WriteError(w, http.StatusInternalServerError, "Error finalizing guild creation")
		return
	}

	utils.WriteSuccess(w, http.StatusCreated, "Guild created successfully", CreateGuildResponse{
		ID:      int(guildID),
		Name:    req.Name,
		Message: "Guild created successfully",
	})
}

// InvitePlayerRequest represents the request to invite a player to a guild
type InvitePlayerRequest struct {
	PlayerName string `json:"playerName"`
}

// InvitePlayerResponse represents the response after inviting a player
type InvitePlayerResponse struct {
	Message string `json:"message"`
}

// InvitePlayerHandler invites a player to a guild
// Requirements:
// - User must be authenticated
// - User must be the guild owner or have Vice Leader rank
// - Player must exist and not be in another guild
// - Player must not already have a pending invite
func InvitePlayerHandler(w http.ResponseWriter, r *http.Request) {
	userID, ok := r.Context().Value(middleware.UserIDKey).(int)
	if !ok {
		utils.WriteError(w, http.StatusUnauthorized, "Authentication required")
		return
	}

	vars := mux.Vars(r)
	guildName, err := url.PathUnescape(vars["name"])
	if err != nil {
		utils.WriteError(w, http.StatusBadRequest, "Invalid guild name")
		return
	}

	var req InvitePlayerRequest
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

	req.PlayerName = utils.SanitizeString(req.PlayerName, 255)
	if req.PlayerName == "" {
		utils.WriteError(w, http.StatusBadRequest, "Player name is required")
		return
	}

	ctx, cancel := utils.NewDBContext()
	defer cancel()

	tx, err := database.DB.BeginTx(ctx, nil)
	if err != nil {
		if utils.HandleDBError(w, err) {
			return
		}
		utils.WriteError(w, http.StatusInternalServerError, "Error starting transaction")
		return
	}
	defer tx.Rollback()

	var guildID int
	var ownerID int
	err = tx.QueryRowContext(ctx,
		`SELECT id, ownerid FROM guilds WHERE LOWER(name) = LOWER(?)`,
		guildName,
	).Scan(&guildID, &ownerID)

	if err != nil {
		if err == sql.ErrNoRows {
			utils.WriteError(w, http.StatusNotFound, "Guild not found")
			return
		}
		if utils.HandleDBError(w, err) {
			return
		}
		utils.WriteError(w, http.StatusInternalServerError, "Error fetching guild")
		return
	}

	var userCharacterID int
	var userRankLevel int
	var isOwner bool
	err = tx.QueryRowContext(ctx,
		`SELECT id FROM players WHERE id = ? AND account_id = ?`,
		ownerID, userID,
	).Scan(&userCharacterID)

	if err == nil {
		isOwner = true
		userRankLevel = 999 // Owner has highest rank
	} else if err == sql.ErrNoRows {
		err = tx.QueryRowContext(ctx,
			`SELECT gm.player_id, COALESCE(gr.level, 0) as rank_level
			 FROM guild_membership gm
			 LEFT JOIN guild_ranks gr ON gm.rank_id = gr.id
			 JOIN players p ON gm.player_id = p.id
			 WHERE gm.guild_id = ? AND p.account_id = ?
			 LIMIT 1`,
			guildID, userID,
		).Scan(&userCharacterID, &userRankLevel)
	}

	if err != nil {
		if err == sql.ErrNoRows {
			utils.WriteError(w, http.StatusForbidden, "You are not a member of this guild")
			return
		}
		if utils.HandleDBError(w, err) {
			return
		}
		utils.WriteError(w, http.StatusInternalServerError, "Error verifying membership")
		return
	}

	if !isOwner && userRankLevel < 2 {
		utils.WriteError(w, http.StatusForbidden, "Only guild owner or vice leaders can invite players")
		return
	}

	var invitedPlayerID int
	err = tx.QueryRowContext(ctx,
		`SELECT id FROM players WHERE name = ?`,
		req.PlayerName,
	).Scan(&invitedPlayerID)

	if err != nil {
		if err == sql.ErrNoRows {
			utils.WriteError(w, http.StatusNotFound, "Player not found")
			return
		}
		if utils.HandleDBError(w, err) {
			return
		}
		utils.WriteError(w, http.StatusInternalServerError, "Error fetching player")
		return
	}

	var existingGuildID sql.NullInt64
	err = tx.QueryRowContext(ctx,
		`SELECT guild_id FROM guild_membership WHERE player_id = ?`,
		invitedPlayerID,
	).Scan(&existingGuildID)

	if err != nil && err != sql.ErrNoRows {
		if utils.HandleDBError(w, err) {
			return
		}
		utils.WriteError(w, http.StatusInternalServerError, "Error checking guild membership")
		return
	}

	if existingGuildID.Valid {
		utils.WriteError(w, http.StatusConflict, "Player is already in a guild")
		return
	}

	var existingOwnerGuildID sql.NullInt64
	err = tx.QueryRowContext(ctx,
		`SELECT id FROM guilds WHERE ownerid = ?`,
		invitedPlayerID,
	).Scan(&existingOwnerGuildID)

	if err != nil && err != sql.ErrNoRows {
		if utils.HandleDBError(w, err) {
			return
		}
		utils.WriteError(w, http.StatusInternalServerError, "Error checking guild ownership")
		return
	}

	if existingOwnerGuildID.Valid {
		utils.WriteError(w, http.StatusConflict, "Player already owns a guild")
		return
	}

	var inviteExists bool
	err = tx.QueryRowContext(ctx,
		`SELECT EXISTS(SELECT 1 FROM guild_invites WHERE player_id = ? AND guild_id = ?)`,
		invitedPlayerID, guildID,
	).Scan(&inviteExists)

	if err != nil {
		if utils.HandleDBError(w, err) {
			return
		}
		utils.WriteError(w, http.StatusInternalServerError, "Error checking existing invite")
		return
	}

	if inviteExists {
		utils.WriteError(w, http.StatusConflict, "Player already has a pending invite")
		return
	}

	inviteDate := time.Now().Unix()
	_, err = tx.ExecContext(ctx,
		`INSERT INTO guild_invites (player_id, guild_id, date) VALUES (?, ?, ?)`,
		invitedPlayerID, guildID, inviteDate,
	)

	if err != nil {
		if utils.HandleDBError(w, err) {
			return
		}
		utils.WriteError(w, http.StatusInternalServerError, "Error creating invite")
		return
	}

	if err = tx.Commit(); err != nil {
		if utils.HandleDBError(w, err) {
			return
		}
		utils.WriteError(w, http.StatusInternalServerError, "Error finalizing invite")
		return
	}

	utils.WriteSuccess(w, http.StatusCreated, "Player invited successfully", InvitePlayerResponse{
		Message: "Player invited successfully",
	})
}

// AcceptInviteRequest represents the request to accept a guild invite
type AcceptInviteRequest struct {
	GuildName string `json:"guildName"`
}

// AcceptInviteResponse represents the response after accepting an invite
type AcceptInviteResponse struct {
	Message string `json:"message"`
}

// AcceptInviteHandler accepts a guild invite
// Requirements:
// - User must be authenticated
// - User must have a pending invite for the guild
// - User must not be in another guild
func AcceptInviteHandler(w http.ResponseWriter, r *http.Request) {
	userID, ok := r.Context().Value(middleware.UserIDKey).(int)
	if !ok {
		utils.WriteError(w, http.StatusUnauthorized, "Authentication required")
		return
	}

	var req AcceptInviteRequest
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

	req.GuildName = utils.SanitizeString(req.GuildName, 255)
	if req.GuildName == "" {
		utils.WriteError(w, http.StatusBadRequest, "Guild name is required")
		return
	}

	ctx, cancel := utils.NewDBContext()
	defer cancel()

	tx, err := database.DB.BeginTx(ctx, nil)
	if err != nil {
		if utils.HandleDBError(w, err) {
			return
		}
		utils.WriteError(w, http.StatusInternalServerError, "Error starting transaction")
		return
	}
	defer tx.Rollback()

	var guildID int
	err = tx.QueryRowContext(ctx,
		`SELECT id FROM guilds WHERE LOWER(name) = LOWER(?)`,
		req.GuildName,
	).Scan(&guildID)

	if err != nil {
		if err == sql.ErrNoRows {
			utils.WriteError(w, http.StatusNotFound, "Guild not found")
			return
		}
		if utils.HandleDBError(w, err) {
			return
		}
		utils.WriteError(w, http.StatusInternalServerError, "Error fetching guild")
		return
	}

	var characterID int
	err = tx.QueryRowContext(ctx,
		`SELECT id FROM players WHERE account_id = ? LIMIT 1`,
		userID,
	).Scan(&characterID)

	if err != nil {
		if err == sql.ErrNoRows {
			utils.WriteError(w, http.StatusBadRequest, "You need at least one character to accept a guild invite")
			return
		}
		if utils.HandleDBError(w, err) {
			return
		}
		utils.WriteError(w, http.StatusInternalServerError, "Error fetching character")
		return
	}

	var existingGuildID sql.NullInt64
	err = tx.QueryRowContext(ctx,
		`SELECT guild_id FROM guild_membership WHERE player_id = ?`,
		characterID,
	).Scan(&existingGuildID)

	if err != nil && err != sql.ErrNoRows {
		if utils.HandleDBError(w, err) {
			return
		}
		utils.WriteError(w, http.StatusInternalServerError, "Error checking guild membership")
		return
	}

	if existingGuildID.Valid {
		utils.WriteError(w, http.StatusConflict, "You are already in a guild")
		return
	}

	var existingOwnerGuildID sql.NullInt64
	err = tx.QueryRowContext(ctx,
		`SELECT id FROM guilds WHERE ownerid = ?`,
		characterID,
	).Scan(&existingOwnerGuildID)

	if err != nil && err != sql.ErrNoRows {
		if utils.HandleDBError(w, err) {
			return
		}
		utils.WriteError(w, http.StatusInternalServerError, "Error checking guild ownership")
		return
	}

	if existingOwnerGuildID.Valid {
		utils.WriteError(w, http.StatusConflict, "You already own a guild")
		return
	}

	var inviteExists bool
	err = tx.QueryRowContext(ctx,
		`SELECT EXISTS(SELECT 1 FROM guild_invites WHERE player_id = ? AND guild_id = ?)`,
		characterID, guildID,
	).Scan(&inviteExists)

	if err != nil {
		if utils.HandleDBError(w, err) {
			return
		}
		utils.WriteError(w, http.StatusInternalServerError, "Error checking invite")
		return
	}

	if !inviteExists {
		utils.WriteError(w, http.StatusNotFound, "You don't have a pending invite for this guild")
		return
	}

	var rankID int
	err = tx.QueryRowContext(ctx,
		`SELECT id FROM guild_ranks WHERE guild_id = ? ORDER BY level ASC LIMIT 1`,
		guildID,
	).Scan(&rankID)

	if err != nil {
		if err == sql.ErrNoRows {
			utils.WriteError(w, http.StatusInternalServerError, "Guild has no ranks")
			return
		}
		if utils.HandleDBError(w, err) {
			return
		}
		utils.WriteError(w, http.StatusInternalServerError, "Error fetching rank")
		return
	}

	_, err = tx.ExecContext(ctx,
		`INSERT INTO guild_membership (player_id, guild_id, rank_id, nick) VALUES (?, ?, ?, '')`,
		characterID, guildID, rankID,
	)

	if err != nil {
		if utils.HandleDBError(w, err) {
			return
		}
		utils.WriteError(w, http.StatusInternalServerError, "Error adding player to guild")
		return
	}

	_, err = tx.ExecContext(ctx,
		`DELETE FROM guild_invites WHERE player_id = ? AND guild_id = ?`,
		characterID, guildID,
	)

	if err != nil {
		if utils.HandleDBError(w, err) {
			return
		}
		utils.WriteError(w, http.StatusInternalServerError, "Error removing invite")
		return
	}

	if err = tx.Commit(); err != nil {
		if utils.HandleDBError(w, err) {
			return
		}
		utils.WriteError(w, http.StatusInternalServerError, "Error finalizing acceptance")
		return
	}

	utils.WriteSuccess(w, http.StatusOK, "Invite accepted successfully", AcceptInviteResponse{
		Message: "You have joined the guild successfully",
	})
}

// GetPendingInvitesHandler returns all pending invites for the authenticated user
func GetPendingInvitesHandler(w http.ResponseWriter, r *http.Request) {
	userID, ok := r.Context().Value(middleware.UserIDKey).(int)
	if !ok {
		utils.WriteError(w, http.StatusUnauthorized, "Authentication required")
		return
	}

	ctx, cancel := utils.NewDBContext()
	defer cancel()

	rows, err := database.DB.QueryContext(ctx,
		`SELECT gi.guild_id, g.name as guild_name, g.level, g.points,
		        p.name as player_name, gi.date
		 FROM guild_invites gi
		 JOIN guilds g ON gi.guild_id = g.id
		 JOIN players p ON gi.player_id = p.id
		 WHERE p.account_id = ?
		 ORDER BY gi.date DESC`,
		userID,
	)

	if err != nil {
		if utils.HandleDBError(w, err) {
			return
		}
		utils.WriteError(w, http.StatusInternalServerError, "Error fetching invites")
		return
	}
	defer rows.Close()

	type PendingInvite struct {
		GuildID   int    `json:"guildId"`
		GuildName string `json:"guildName"`
		GuildLevel int   `json:"guildLevel"`
		GuildPoints int `json:"guildPoints"`
		PlayerName string `json:"playerName"`
		InviteDate int64  `json:"inviteDate"`
	}

	var invites []PendingInvite
	for rows.Next() {
		var invite PendingInvite
		var date int
		if err := rows.Scan(
			&invite.GuildID, &invite.GuildName, &invite.GuildLevel, &invite.GuildPoints,
			&invite.PlayerName, &date,
		); err != nil {
			continue
		}
		invite.InviteDate = int64(date)
		invites = append(invites, invite)
	}

	utils.WriteSuccess(w, http.StatusOK, "Pending invites retrieved successfully", invites)
}

// LeaveGuildRequest represents the request to leave a guild
type LeaveGuildRequest struct {
	GuildName string `json:"guildName"`
}

// LeaveGuildResponse represents the response after leaving a guild
type LeaveGuildResponse struct {
	Message string `json:"message"`
}

// LeaveGuildHandler allows a member to leave a guild
// Requirements:
// - User must be authenticated
// - User must be a member of the guild
// - User cannot be the owner (owner cannot leave their own guild)
func LeaveGuildHandler(w http.ResponseWriter, r *http.Request) {
	userID, ok := r.Context().Value(middleware.UserIDKey).(int)
	if !ok {
		utils.WriteError(w, http.StatusUnauthorized, "Authentication required")
		return
	}

	var req LeaveGuildRequest
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

	req.GuildName = utils.SanitizeString(req.GuildName, 255)
	if req.GuildName == "" {
		utils.WriteError(w, http.StatusBadRequest, "Guild name is required")
		return
	}

	ctx, cancel := utils.NewDBContext()
	defer cancel()

	tx, err := database.DB.BeginTx(ctx, nil)
	if err != nil {
		if utils.HandleDBError(w, err) {
			return
		}
		utils.WriteError(w, http.StatusInternalServerError, "Error starting transaction")
		return
	}
	defer tx.Rollback()

	var guildID int
	var ownerID int
	err = tx.QueryRowContext(ctx,
		`SELECT id, ownerid FROM guilds WHERE LOWER(name) = LOWER(?)`,
		req.GuildName,
	).Scan(&guildID, &ownerID)

	if err != nil {
		if err == sql.ErrNoRows {
			utils.WriteError(w, http.StatusNotFound, "Guild not found")
			return
		}
		if utils.HandleDBError(w, err) {
			return
		}
		utils.WriteError(w, http.StatusInternalServerError, "Error fetching guild")
		return
	}

	var characterID int
	err = tx.QueryRowContext(ctx,
		`SELECT id FROM players WHERE account_id = ? LIMIT 1`,
		userID,
	).Scan(&characterID)

	if err != nil {
		if err == sql.ErrNoRows {
			utils.WriteError(w, http.StatusBadRequest, "You need at least one character to leave a guild")
			return
		}
		if utils.HandleDBError(w, err) {
			return
		}
		utils.WriteError(w, http.StatusInternalServerError, "Error fetching character")
		return
	}

	if characterID == ownerID {
		utils.WriteError(w, http.StatusForbidden, "Guild owner cannot leave the guild. Transfer ownership or delete the guild instead.")
		return
	}

	var isMember bool
	err = tx.QueryRowContext(ctx,
		`SELECT EXISTS(
			SELECT 1 FROM guild_membership
			WHERE player_id = ? AND guild_id = ?
		)`,
		characterID, guildID,
	).Scan(&isMember)

	if err != nil {
		if utils.HandleDBError(w, err) {
			return
		}
		utils.WriteError(w, http.StatusInternalServerError, "Error checking membership")
		return
	}

	if !isMember {
		utils.WriteError(w, http.StatusForbidden, "You are not a member of this guild")
		return
	}

	_, err = tx.ExecContext(ctx,
		`DELETE FROM guild_membership WHERE player_id = ? AND guild_id = ?`,
		characterID, guildID,
	)

	if err != nil {
		if utils.HandleDBError(w, err) {
			return
		}
		utils.WriteError(w, http.StatusInternalServerError, "Error leaving guild")
		return
	}

	if err = tx.Commit(); err != nil {
		if utils.HandleDBError(w, err) {
			return
		}
		utils.WriteError(w, http.StatusInternalServerError, "Error finalizing leave")
		return
	}

	utils.WriteSuccess(w, http.StatusOK, "You have left the guild successfully", LeaveGuildResponse{
		Message: "You have left the guild successfully",
	})
}

// KickPlayerRequest represents the request to kick a player from a guild
type KickPlayerRequest struct {
	GuildName  string `json:"guildName"`
	PlayerName string `json:"playerName"`
}

// KickPlayerResponse represents the response after kicking a player
type KickPlayerResponse struct {
	Message string `json:"message"`
}

// KickPlayerHandler allows a leader or vice-leader to kick a player from a guild
// Requirements:
// - User must be authenticated
// - User must be the guild owner OR a member with rank level >= 2 (Vice Leader or higher)
// - Player to be kicked must be a member of the guild
// - Player to be kicked cannot be the owner
func KickPlayerHandler(w http.ResponseWriter, r *http.Request) {
	userID, ok := r.Context().Value(middleware.UserIDKey).(int)
	if !ok {
		utils.WriteError(w, http.StatusUnauthorized, "Authentication required")
		return
	}

	var req KickPlayerRequest
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

	req.GuildName = utils.SanitizeString(req.GuildName, 255)
	req.PlayerName = utils.SanitizeString(req.PlayerName, 255)
	if req.GuildName == "" || req.PlayerName == "" {
		utils.WriteError(w, http.StatusBadRequest, "Guild name and player name are required")
		return
	}

	ctx, cancel := utils.NewDBContext()
	defer cancel()

	tx, err := database.DB.BeginTx(ctx, nil)
	if err != nil {
		if utils.HandleDBError(w, err) {
			return
		}
		utils.WriteError(w, http.StatusInternalServerError, "Error starting transaction")
		return
	}
	defer tx.Rollback()

	var guildID int
	var ownerID int
	err = tx.QueryRowContext(ctx,
		`SELECT id, ownerid FROM guilds WHERE LOWER(name) = LOWER(?)`,
		req.GuildName,
	).Scan(&guildID, &ownerID)

	if err != nil {
		if err == sql.ErrNoRows {
			utils.WriteError(w, http.StatusNotFound, "Guild not found")
			return
		}
		if utils.HandleDBError(w, err) {
			return
		}
		utils.WriteError(w, http.StatusInternalServerError, "Error fetching guild")
		return
	}

	var userCharacterID int
	err = tx.QueryRowContext(ctx,
		`SELECT id FROM players WHERE account_id = ? LIMIT 1`,
		userID,
	).Scan(&userCharacterID)

	if err != nil {
		if err == sql.ErrNoRows {
			utils.WriteError(w, http.StatusBadRequest, "You need at least one character to kick a player")
			return
		}
		if utils.HandleDBError(w, err) {
			return
		}
		utils.WriteError(w, http.StatusInternalServerError, "Error fetching character")
		return
	}

	isOwner := (userCharacterID == ownerID)

	if !isOwner {
		var rankLevel sql.NullInt64
		err = tx.QueryRowContext(ctx,
			`SELECT COALESCE(gr.level, 0) as rank_level
			 FROM guild_membership gm
			 LEFT JOIN guild_ranks gr ON gm.rank_id = gr.id
			 WHERE gm.guild_id = ? AND gm.player_id = ?
			 LIMIT 1`,
			guildID, userCharacterID,
		).Scan(&rankLevel)

		if err != nil {
			if err == sql.ErrNoRows {
				utils.WriteError(w, http.StatusForbidden, "You must be the guild owner or a vice-leader to kick players")
				return
			}
			if utils.HandleDBError(w, err) {
				return
			}
			utils.WriteError(w, http.StatusInternalServerError, "Error checking membership")
			return
		}

		userRankLevel := 0
		if rankLevel.Valid {
			userRankLevel = int(rankLevel.Int64)
		}
		if userRankLevel < 2 {
			utils.WriteError(w, http.StatusForbidden, "You must be the guild owner or a vice-leader to kick players")
			return
		}
	}

	var playerToKickID int
	err = tx.QueryRowContext(ctx,
		`SELECT id FROM players WHERE LOWER(name) = LOWER(?)`,
		req.PlayerName,
	).Scan(&playerToKickID)

	if err != nil {
		if err == sql.ErrNoRows {
			utils.WriteError(w, http.StatusNotFound, "Player not found")
			return
		}
		if utils.HandleDBError(w, err) {
			return
		}
		utils.WriteError(w, http.StatusInternalServerError, "Error fetching player")
		return
	}

	if playerToKickID == ownerID {
		utils.WriteError(w, http.StatusForbidden, "Cannot kick the guild owner")
		return
	}

	var isMember bool
	err = tx.QueryRowContext(ctx,
		`SELECT EXISTS(
			SELECT 1 FROM guild_membership
			WHERE player_id = ? AND guild_id = ?
		)`,
		playerToKickID, guildID,
	).Scan(&isMember)

	if err != nil {
		if utils.HandleDBError(w, err) {
			return
		}
		utils.WriteError(w, http.StatusInternalServerError, "Error checking membership")
		return
	}

	if !isMember {
		utils.WriteError(w, http.StatusBadRequest, "Player is not a member of this guild")
		return
	}

	_, err = tx.ExecContext(ctx,
		`DELETE FROM guild_membership WHERE player_id = ? AND guild_id = ?`,
		playerToKickID, guildID,
	)

	if err != nil {
		if utils.HandleDBError(w, err) {
			return
		}
		utils.WriteError(w, http.StatusInternalServerError, "Error removing player from guild")
		return
	}

	if err = tx.Commit(); err != nil {
		if utils.HandleDBError(w, err) {
			return
		}
		utils.WriteError(w, http.StatusInternalServerError, "Error finalizing kick")
		return
	}

	utils.WriteSuccess(w, http.StatusOK, "Player kicked successfully", KickPlayerResponse{
		Message: "Player has been kicked from the guild",
	})
}

