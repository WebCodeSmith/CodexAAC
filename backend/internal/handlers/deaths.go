package handlers

import (
	"net/http"
	"strconv"

	"codexaac-backend/internal/database"
	"codexaac-backend/pkg/utils"
)

type PlayerDeath struct {
	PlayerName string `json:"playerName"`
	Level      int    `json:"level"`
	KilledBy   string `json:"killedBy"`
	IsPlayer   bool   `json:"isPlayer"`
	Time       int64  `json:"time"`
	LookType   int    `json:"lookType"`
	LookHead   int    `json:"lookHead"`
	LookBody   int    `json:"lookBody"`
	LookLegs   int    `json:"lookLegs"`
	LookFeet   int    `json:"lookFeet"`
	LookAddons int    `json:"lookAddons"`
}

type DeathsResponse struct {
	Deaths     []PlayerDeath `json:"deaths"`
	Pagination struct {
		Page       int `json:"page"`
		Limit      int `json:"limit"`
		Total      int `json:"total"`
		TotalPages int `json:"totalPages"`
	} `json:"pagination"`
}

func GetDeathsHandler(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := utils.NewDBContext()
	defer cancel()

	page := 1
	limit := 50

	if pageStr := r.URL.Query().Get("page"); pageStr != "" {
		if p, err := strconv.Atoi(pageStr); err == nil && p > 0 {
			page = p
		}
	}

	if limitStr := r.URL.Query().Get("limit"); limitStr != "" {
		if l, err := strconv.Atoi(limitStr); err == nil && l > 0 && l <= 100 {
			limit = l
		}
	}

	search := r.URL.Query().Get("search")

	var total int
	countQuery := `
		SELECT COUNT(*) 
		FROM player_deaths pd
		INNER JOIN players p ON pd.player_id = p.id
	`
	countArgs := []interface{}{}
	if search != "" {
		countQuery += " WHERE p.name LIKE ?"
		countArgs = append(countArgs, "%"+search+"%")
	}

	if err := database.DB.QueryRowContext(ctx, countQuery, countArgs...).Scan(&total); err != nil {
		utils.WriteError(w, http.StatusInternalServerError, "Error counting deaths")
		return
	}

	totalPages := (total + limit - 1) / limit
	if totalPages == 0 {
		totalPages = 1
	}

	offset := (page - 1) * limit

	query := `
		SELECT 
			p.name,
			pd.level,
			pd.killed_by,
			pd.is_player,
			pd.time,
			COALESCE(NULLIF(p.looktype, 0), 128) as looktype,
			COALESCE(p.lookhead, 0) as lookhead,
			COALESCE(p.lookbody, 0) as lookbody,
			COALESCE(p.looklegs, 0) as looklegs,
			COALESCE(p.lookfeet, 0) as lookfeet,
			COALESCE(p.lookaddons, 0) as lookaddons
		FROM player_deaths pd
		INNER JOIN players p ON pd.player_id = p.id
	`
	args := []interface{}{}
	if search != "" {
		query += " WHERE p.name LIKE ?"
		args = append(args, "%"+search+"%")
	}
	query += " ORDER BY pd.time DESC LIMIT ? OFFSET ?"
	args = append(args, limit, offset)

	rows, err := database.DB.QueryContext(ctx, query, args...)
	if err != nil {
		utils.WriteError(w, http.StatusInternalServerError, "Error fetching deaths")
		return
	}
	defer rows.Close()

	deaths := make([]PlayerDeath, 0, limit)
	for rows.Next() {
		var death PlayerDeath
		if err := rows.Scan(
			&death.PlayerName,
			&death.Level,
			&death.KilledBy,
			&death.IsPlayer,
			&death.Time,
			&death.LookType,
			&death.LookHead,
			&death.LookBody,
			&death.LookLegs,
			&death.LookFeet,
			&death.LookAddons,
		); err != nil {
			continue
		}

		deaths = append(deaths, death)
	}

	if err = rows.Err(); err != nil {
		utils.WriteError(w, http.StatusInternalServerError, "Error processing deaths")
		return
	}

	response := DeathsResponse{
		Deaths: deaths,
		Pagination: struct {
			Page       int `json:"page"`
			Limit      int `json:"limit"`
			Total      int `json:"total"`
			TotalPages int `json:"totalPages"`
		}{
			Page:       page,
			Limit:      limit,
			Total:      total,
			TotalPages: totalPages,
		},
	}

	utils.WriteSuccess(w, http.StatusOK, "Deaths retrieved successfully", response)
}

