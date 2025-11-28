package handlers

import (
	"database/sql"
	"net/http"
	"sort"
	"strconv"
	"strings"
	"time"

	"codexaac-backend/internal/database"
	"codexaac-backend/pkg/utils"
)

type Banishment struct {
	ID           int    `json:"id,omitempty"`
	Type         string `json:"type"`
	AccountID    *int   `json:"accountId,omitempty"`
	AccountName  string `json:"accountName"`
	Reason       string `json:"reason"`
	BannedAt     int64  `json:"bannedAt"`
	ExpiresAt    int64  `json:"expiresAt"`
	BannedBy     int    `json:"bannedBy"`
	BannedByName string `json:"bannedByName"`
	IsActive     bool   `json:"isActive"`
}

func GetBanishmentsHandler(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := utils.NewDBContext()
	defer cancel()

	pageStr := r.URL.Query().Get("page")
	limitStr := r.URL.Query().Get("limit")
	search := strings.TrimSpace(r.URL.Query().Get("search"))
	banType := strings.TrimSpace(strings.ToLower(r.URL.Query().Get("type")))

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

	var allBanishments []Banishment
	fetchAll := banType == ""

	if banType == "" || banType == "account" {
		query := `
			SELECT 
				ab.account_id,
				COALESCE((SELECT pb.name FROM players pb WHERE pb.account_id = ab.account_id AND pb.deletion = 0 ORDER BY pb.level DESC, pb.name ASC LIMIT 1), a.name) as player_name,
				ab.reason,
				ab.banned_at,
				ab.expires_at,
				ab.banned_by,
				p.name as banned_by_name
			FROM account_bans ab
			INNER JOIN accounts a ON ab.account_id = a.id
			LEFT JOIN players p ON ab.banned_by = p.id
			WHERE 1=1
		`
		args := []interface{}{}

		if search != "" {
			query += " AND (a.name LIKE ? OR EXISTS (SELECT 1 FROM players pb WHERE pb.account_id = ab.account_id AND pb.deletion = 0 AND pb.name LIKE ?))"
			args = append(args, "%"+search+"%", "%"+search+"%")
		}

		if !fetchAll {
			query += " ORDER BY ab.banned_at DESC LIMIT ? OFFSET ?"
			args = append(args, limit, offset)
		} else {
			query += " ORDER BY ab.banned_at DESC"
		}

		rows, err := database.DB.QueryContext(ctx, query, args...)
		if err == nil {
			defer rows.Close()
			for rows.Next() {
				var ban Banishment
				var accountID int
				var playerName sql.NullString
				var bannedByName sql.NullString

				if err := rows.Scan(
					&accountID,
					&playerName,
					&ban.Reason,
					&ban.BannedAt,
					&ban.ExpiresAt,
					&ban.BannedBy,
					&bannedByName,
				); err == nil {
					ban.ID = accountID
					ban.Type = "account"
					ban.AccountID = &accountID
					ban.AccountName = "Unknown"
					if playerName.Valid && playerName.String != "" {
						ban.AccountName = playerName.String
					}
					ban.BannedByName = "Unknown"
					if bannedByName.Valid {
						ban.BannedByName = bannedByName.String
					}
					ban.IsActive = ban.ExpiresAt > 0 && ban.ExpiresAt > (time.Now().Unix())
					allBanishments = append(allBanishments, ban)
				}
			}
		}
	}

	if banType == "" || banType == "history" {
		query := `
			SELECT 
				abh.id,
				abh.account_id,
				COALESCE((SELECT pb.name FROM players pb WHERE pb.account_id = abh.account_id AND pb.deletion = 0 ORDER BY pb.level DESC, pb.name ASC LIMIT 1), a.name) as player_name,
				abh.reason,
				abh.banned_at,
				abh.expired_at,
				abh.banned_by,
				p.name as banned_by_name
			FROM account_ban_history abh
			INNER JOIN accounts a ON abh.account_id = a.id
			LEFT JOIN players p ON abh.banned_by = p.id
			WHERE 1=1
		`
		args := []interface{}{}

		if search != "" {
			query += " AND (a.name LIKE ? OR EXISTS (SELECT 1 FROM players pb WHERE pb.account_id = abh.account_id AND pb.deletion = 0 AND pb.name LIKE ?))"
			args = append(args, "%"+search+"%", "%"+search+"%")
		}

		if !fetchAll {
			query += " ORDER BY abh.banned_at DESC LIMIT ? OFFSET ?"
			args = append(args, limit, offset)
		} else {
			query += " ORDER BY abh.banned_at DESC"
		}

		rows, err := database.DB.QueryContext(ctx, query, args...)
		if err == nil {
			defer rows.Close()
			for rows.Next() {
				var ban Banishment
				var accountID int
				var playerName sql.NullString
				var bannedByName sql.NullString

				if err := rows.Scan(
					&ban.ID,
					&accountID,
					&playerName,
					&ban.Reason,
					&ban.BannedAt,
					&ban.ExpiresAt,
					&ban.BannedBy,
					&bannedByName,
				); err == nil {
					ban.Type = "account_history"
					ban.AccountID = &accountID
					ban.AccountName = "Unknown"
					if playerName.Valid && playerName.String != "" {
						ban.AccountName = playerName.String
					}
					ban.BannedByName = "Unknown"
					if bannedByName.Valid {
						ban.BannedByName = bannedByName.String
					}
					ban.IsActive = false
					allBanishments = append(allBanishments, ban)
				}
			}
		}
	}

	if banType == "" || banType == "ip" {
		query := `
			SELECT 
				ib.ip,
				COALESCE((SELECT pb.name FROM players pb WHERE pb.lastip = ib.ip AND pb.deletion = 0 ORDER BY pb.level DESC, pb.name ASC LIMIT 1), 'IP Ban') as player_name,
				ib.reason,
				ib.banned_at,
				ib.expires_at,
				ib.banned_by,
				p.name as banned_by_name
			FROM ip_bans ib
			LEFT JOIN players p ON ib.banned_by = p.id
			WHERE 1=1
		`
		args := []interface{}{}

		if search != "" {
			query += " AND EXISTS (SELECT 1 FROM players pb WHERE pb.lastip = ib.ip AND pb.deletion = 0 AND pb.name LIKE ?)"
			args = append(args, "%"+search+"%")
		}

		if !fetchAll {
			query += " ORDER BY ib.banned_at DESC LIMIT ? OFFSET ?"
			args = append(args, limit, offset)
		} else {
			query += " ORDER BY ib.banned_at DESC"
		}

		rows, err := database.DB.QueryContext(ctx, query, args...)
		if err == nil {
			defer rows.Close()
			for rows.Next() {
				var ban Banishment
				var ipInt int
				var playerName sql.NullString
				var bannedByName sql.NullString

				if err := rows.Scan(
					&ipInt,
					&playerName,
					&ban.Reason,
					&ban.BannedAt,
					&ban.ExpiresAt,
					&ban.BannedBy,
					&bannedByName,
				); err == nil {
					ban.ID = ipInt
					ban.Type = "ip"
					ban.AccountName = "IP Ban"
					if playerName.Valid && playerName.String != "" && playerName.String != "IP Ban" {
						ban.AccountName = playerName.String
					}
					ban.BannedByName = "Unknown"
					if bannedByName.Valid {
						ban.BannedByName = bannedByName.String
					}
					ban.IsActive = ban.ExpiresAt > 0 && ban.ExpiresAt > (time.Now().Unix())
					allBanishments = append(allBanishments, ban)
				}
			}
		}
	}

	sort.Slice(allBanishments, func(i, j int) bool {
		return allBanishments[i].BannedAt > allBanishments[j].BannedAt
	})

	if fetchAll {
		totalBeforePagination := len(allBanishments)
		start := offset
		end := offset + limit
		if start > totalBeforePagination {
			allBanishments = []Banishment{}
		} else {
			if end > totalBeforePagination {
				end = totalBeforePagination
			}
			allBanishments = allBanishments[start:end]
		}
	}

	var totalCount int
	countQuery := ""
	countArgs := []interface{}{}

	if banType == "" {
		countQuery = `
			SELECT (
				(SELECT COUNT(*) FROM account_bans WHERE 1=1) +
				(SELECT COUNT(*) FROM account_ban_history WHERE 1=1) +
				(SELECT COUNT(*) FROM ip_bans WHERE 1=1)
			) as total
		`
		if search != "" {
			countQuery = `
				SELECT (
					(SELECT COUNT(*) FROM account_bans ab INNER JOIN accounts a ON ab.account_id = a.id WHERE a.name LIKE ? OR EXISTS (SELECT 1 FROM players pb WHERE pb.account_id = ab.account_id AND pb.deletion = 0 AND pb.name LIKE ?)) +
					(SELECT COUNT(*) FROM account_ban_history abh INNER JOIN accounts a ON abh.account_id = a.id WHERE a.name LIKE ? OR EXISTS (SELECT 1 FROM players pb WHERE pb.account_id = abh.account_id AND pb.deletion = 0 AND pb.name LIKE ?)) +
					(SELECT COUNT(*) FROM ip_bans ib WHERE EXISTS (SELECT 1 FROM players pb WHERE pb.lastip = ib.ip AND pb.deletion = 0 AND pb.name LIKE ?))
				) as total
			`
			countArgs = []interface{}{"%" + search + "%", "%" + search + "%", "%" + search + "%", "%" + search + "%", "%" + search + "%"}
		}
	} else if banType == "account" {
		countQuery = "SELECT COUNT(*) FROM account_bans ab INNER JOIN accounts a ON ab.account_id = a.id WHERE 1=1"
		if search != "" {
			countQuery += " AND (a.name LIKE ? OR EXISTS (SELECT 1 FROM players pb WHERE pb.account_id = ab.account_id AND pb.deletion = 0 AND pb.name LIKE ?))"
			countArgs = []interface{}{"%" + search + "%", "%" + search + "%"}
		}
	} else if banType == "history" {
		countQuery = "SELECT COUNT(*) FROM account_ban_history abh INNER JOIN accounts a ON abh.account_id = a.id WHERE 1=1"
		if search != "" {
			countQuery += " AND (a.name LIKE ? OR EXISTS (SELECT 1 FROM players pb WHERE pb.account_id = abh.account_id AND pb.deletion = 0 AND pb.name LIKE ?))"
			countArgs = []interface{}{"%" + search + "%", "%" + search + "%"}
		}
	} else if banType == "ip" {
		countQuery = "SELECT COUNT(*) FROM ip_bans ib WHERE 1=1"
		if search != "" {
			countQuery += " AND EXISTS (SELECT 1 FROM players pb WHERE pb.lastip = ib.ip AND pb.deletion = 0 AND pb.name LIKE ?)"
			countArgs = []interface{}{"%" + search + "%"}
		}
	}

	if countQuery != "" {
		if len(countArgs) > 0 {
			_ = database.DB.QueryRowContext(ctx, countQuery, countArgs...).Scan(&totalCount)
		} else {
			_ = database.DB.QueryRowContext(ctx, countQuery).Scan(&totalCount)
		}
	} else {
		totalCount = len(allBanishments)
	}

	response := map[string]interface{}{
		"banishments": allBanishments,
		"pagination": map[string]interface{}{
			"page":       page,
			"limit":      limit,
			"total":      totalCount,
			"totalPages": (totalCount + limit - 1) / limit,
		},
	}

	utils.WriteSuccess(w, http.StatusOK, "Banishments retrieved successfully", response)
}
