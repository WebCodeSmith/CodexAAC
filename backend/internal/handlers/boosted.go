package handlers

import (
	"database/sql"
	"net/http"

	"codexaac-backend/internal/database"
	"codexaac-backend/pkg/utils"
)

type BoostedBoss struct {
	BoostName  string `json:"boostName"`
	RaceID     string `json:"raceId"`
	LookType   int    `json:"lookType"`
	LookHead   int    `json:"lookHead"`
	LookBody   int    `json:"lookBody"`
	LookLegs   int    `json:"lookLegs"`
	LookFeet   int    `json:"lookFeet"`
	LookAddons int    `json:"lookAddons"`
	LookMount  *int   `json:"lookMount,omitempty"`
}

type BoostedCreature struct {
	BoostName  string `json:"boostName"`
	RaceID     string `json:"raceId"`
	LookType   int    `json:"lookType"`
	LookHead   int    `json:"lookHead"`
	LookBody   int    `json:"lookBody"`
	LookLegs   int    `json:"lookLegs"`
	LookFeet   int    `json:"lookFeet"`
	LookAddons int    `json:"lookAddons"`
	LookMount  *int   `json:"lookMount,omitempty"`
}

type BoostedResponse struct {
	Boss     *BoostedBoss     `json:"boss,omitempty"`
	Creature *BoostedCreature `json:"creature,omitempty"`
}

func GetBoostedHandler(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := utils.NewDBContext()
	defer cancel()

	type bossResult struct {
		boss BoostedBoss
		err  error
	}

	type creatureResult struct {
		creature BoostedCreature
		err      error
	}

	bossChan := make(chan bossResult, 1)
	creatureChan := make(chan creatureResult, 1)

	go func() {
		var boss BoostedBoss
		bossQuery := `
			SELECT boostname, raceid, looktype, lookhead, lookbody, looklegs, lookfeet, lookaddons, lookmount
			FROM boosted_boss
			ORDER BY date DESC
			LIMIT 1
		`

		var bossMount sql.NullInt64
		var bossBoostName sql.NullString
		err := database.DB.QueryRowContext(ctx, bossQuery).Scan(
			&bossBoostName, &boss.RaceID, &boss.LookType,
			&boss.LookHead, &boss.LookBody, &boss.LookLegs,
			&boss.LookFeet, &boss.LookAddons, &bossMount,
		)

		if err == nil {
			if bossBoostName.Valid {
				boss.BoostName = bossBoostName.String
			}
			if bossMount.Valid {
				mountVal := int(bossMount.Int64)
				boss.LookMount = &mountVal
			}
		} else if err != sql.ErrNoRows {
			bossChan <- bossResult{err: err}
			return
		}

		bossChan <- bossResult{boss: boss}
	}()

	go func() {
		var creature BoostedCreature
		creatureQuery := `
			SELECT boostname, raceid, looktype, lookhead, lookbody, looklegs, lookfeet, lookaddons, lookmount
			FROM boosted_creature
			ORDER BY date DESC
			LIMIT 1
		`

		var creatureMount sql.NullInt64
		var creatureBoostName sql.NullString
		err := database.DB.QueryRowContext(ctx, creatureQuery).Scan(
			&creatureBoostName, &creature.RaceID, &creature.LookType,
			&creature.LookHead, &creature.LookBody, &creature.LookLegs,
			&creature.LookFeet, &creature.LookAddons, &creatureMount,
		)

		if err == nil {
			if creatureBoostName.Valid {
				creature.BoostName = creatureBoostName.String
			}
			if creatureMount.Valid {
				mountVal := int(creatureMount.Int64)
				creature.LookMount = &mountVal
			}
		} else if err != sql.ErrNoRows {
			creatureChan <- creatureResult{err: err}
			return
		}

		creatureChan <- creatureResult{creature: creature}
	}()

	bossRes := <-bossChan
	creatureRes := <-creatureChan

	if bossRes.err != nil {
		utils.WriteError(w, http.StatusInternalServerError, "Error fetching boosted boss")
		return
	}

	if creatureRes.err != nil {
		utils.WriteError(w, http.StatusInternalServerError, "Error fetching boosted creature")
		return
	}

	response := BoostedResponse{}
	if bossRes.boss.BoostName != "" {
		response.Boss = &bossRes.boss
	}
	if creatureRes.creature.BoostName != "" {
		response.Creature = &creatureRes.creature
	}

	utils.WriteJSON(w, http.StatusOK, response)
}

