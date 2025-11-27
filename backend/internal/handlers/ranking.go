package handlers

import (
	"net/http"
	"strconv"
	"strings"

	"codexaac-backend/internal/database"
	"codexaac-backend/pkg/config"
	"codexaac-backend/pkg/utils"
)

type RankingPlayer struct {
	Rank      int    `json:"rank"`
	Name      string `json:"name"`
	Vocation  string `json:"vocation"`
	Level     int    `json:"level"`
	Value     int    `json:"value"`
	LookType  int    `json:"lookType"`
	LookHead  int    `json:"lookHead"`
	LookBody  int    `json:"lookBody"`
	LookLegs  int    `json:"lookLegs"`
	LookFeet  int    `json:"lookFeet"`
	LookAddons int   `json:"lookAddons"`
}

type RankingResponse struct {
	Type      string          `json:"type"`
	Vocation  string          `json:"vocation"`
	Pagination struct {
		Page       int `json:"page"`
		Limit      int `json:"limit"`
		Total      int `json:"total"`
		TotalPages int `json:"totalPages"`
	} `json:"pagination"`
	Players   []RankingPlayer `json:"players"`
}

func GetRankingHandler(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := utils.NewDBContext()
	defer cancel()

	rankingType := strings.ToLower(strings.TrimSpace(r.URL.Query().Get("type")))
	if rankingType == "" {
		rankingType = "level"
	}

	if rankingType == "ml" {
		rankingType = "magiclevel"
	}
	if rankingType == "dist" {
		rankingType = "distance"
	}

	vocation := strings.ToLower(strings.TrimSpace(r.URL.Query().Get("vocation")))
	pageStr := r.URL.Query().Get("page")
	limitStr := r.URL.Query().Get("limit")
	search := strings.TrimSpace(r.URL.Query().Get("search"))

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

	var valueField string
	var orderBy string

	switch rankingType {
	case "level":
		valueField = "p.level"
		orderBy = "p.level DESC"
	case "magiclevel":
		valueField = "p.maglevel"
		orderBy = "p.maglevel DESC, p.level DESC"
	case "club":
		valueField = "p.skill_club"
		orderBy = "p.skill_club DESC, p.level DESC"
	case "axe":
		valueField = "p.skill_axe"
		orderBy = "p.skill_axe DESC, p.level DESC"
	case "sword":
		valueField = "p.skill_sword"
		orderBy = "p.skill_sword DESC, p.level DESC"
	case "shielding":
		valueField = "p.skill_shielding"
		orderBy = "p.skill_shielding DESC, p.level DESC"
	case "distance":
		valueField = "p.skill_dist"
		orderBy = "p.skill_dist DESC, p.level DESC"
	case "fist":
		valueField = "p.skill_fist"
		orderBy = "p.skill_fist DESC, p.level DESC"
	case "fishing":
		valueField = "p.skill_fishing"
		orderBy = "p.skill_fishing DESC, p.level DESC"
	default:
		valueField = "p.level"
		orderBy = "p.level DESC"
	}

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
			COALESCE(p.lookaddons, 0) as lookaddons,
			` + valueField + ` as value
		FROM players p
		WHERE p.deletion = 0
	`

	args := make([]interface{}, 0, 4)

	if vocation != "" && vocation != "all" {
		vocationID := config.GetVocationID(vocation)
		if vocationID > 0 {
			query += " AND p.vocation = ?"
			args = append(args, vocationID)
		}
	}

	if search != "" {
		query += " AND p.name LIKE ?"
		args = append(args, "%"+search+"%")
	}

	query += " ORDER BY " + orderBy + ", p.name ASC LIMIT ? OFFSET ?"
	args = append(args, limit, offset)

	rows, err := database.DB.QueryContext(ctx, query, args...)
	if err != nil {
		if utils.HandleDBError(w, err) {
			return
		}
		utils.WriteError(w, http.StatusInternalServerError, "Error fetching ranking")
		return
	}
	defer rows.Close()

	players := make([]RankingPlayer, 0, limit)
	rank := offset + 1
	for rows.Next() {
		var player RankingPlayer
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
			&player.Value,
		); err != nil {
			continue
		}

		player.Rank = rank
		player.Vocation = config.GetVocationName(vocationID)
		players = append(players, player)
		rank++
	}

	countQuery := `
		SELECT COUNT(*)
		FROM players p
		WHERE p.deletion = 0
	`
	countArgs := make([]interface{}, 0, 2)

	if vocation != "" && vocation != "all" {
		vocationID := config.GetVocationID(vocation)
		if vocationID > 0 {
			countQuery += " AND p.vocation = ?"
			countArgs = append(countArgs, vocationID)
		}
	}

	if search != "" {
		countQuery += " AND p.name LIKE ?"
		countArgs = append(countArgs, "%"+search+"%")
	}

	var totalCount int
	err = database.DB.QueryRowContext(ctx, countQuery, countArgs...).Scan(&totalCount)
	if err != nil {
		if utils.HandleDBError(w, err) {
			return
		}
		utils.WriteError(w, http.StatusInternalServerError, "Error counting ranking")
		return
	}

	totalPages := (totalCount + limit - 1) / limit
	if totalPages == 0 {
		totalPages = 1
	}

	response := RankingResponse{
		Type:     rankingType,
		Vocation: vocation,
		Players:  players,
	}
	response.Pagination.Page = page
	response.Pagination.Limit = limit
	response.Pagination.Total = totalCount
	response.Pagination.TotalPages = totalPages

	utils.WriteSuccess(w, http.StatusOK, "Ranking retrieved successfully", response)
}

