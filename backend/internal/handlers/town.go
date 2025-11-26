package handlers

import (
    "net/http"
    "codexaac-backend/pkg/config"
    "codexaac-backend/pkg/utils"
)

func GetTownsHandler(w http.ResponseWriter, r *http.Request) {
    towns := config.GetTowns()
    utils.WriteJSON(w, http.StatusOK, towns)
}
