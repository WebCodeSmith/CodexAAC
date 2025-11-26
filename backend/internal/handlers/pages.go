package handlers

import (
    "database/sql"
    "net/http"
    "strings"

    "codexaac-backend/internal/database"
    "codexaac-backend/pkg/utils"
)

type PageContent struct {
    Content string `json:"content"`
}

func GetRulesHandler(w http.ResponseWriter, r *http.Request) {
    ctx, cancel := utils.NewDBContext()
    defer cancel()

    var content string
    err := database.DB.QueryRowContext(ctx, "SELECT content FROM site_pages WHERE page_key = ?", "rules").Scan(&content)
    if err != nil {
        if err == sql.ErrNoRows {
            utils.WriteSuccess(w, http.StatusOK, "Page content retrieved successfully", PageContent{Content: ""})
            return
        }
        if utils.HandleDBError(w, err) {
            return
        }
        utils.WriteError(w, http.StatusInternalServerError, "Error retrieving page content")
        return
    }

    utils.WriteSuccess(w, http.StatusOK, "Page content retrieved successfully", PageContent{Content: content})
}

func UpdateRulesHandler(w http.ResponseWriter, r *http.Request) {
    var payload PageContent
    if err := utils.DecodeJSON(r, &payload); err != nil {
        if err == utils.ErrInvalidContentType {
            utils.WriteError(w, http.StatusUnsupportedMediaType, "Content-Type must be application/json")
            return
        }
        utils.WriteError(w, http.StatusBadRequest, "Invalid request payload")
        return
    }

    ctx, cancel := utils.NewDBContext()
    defer cancel()

    payload.Content = strings.ReplaceAll(payload.Content, "<script", "&lt;script")
    payload.Content = strings.ReplaceAll(payload.Content, "</script>", "&lt;/script&gt;")

    _, err := database.DB.ExecContext(ctx,
        "INSERT INTO site_pages (page_key, content) VALUES (?, ?) ON DUPLICATE KEY UPDATE content = VALUES(content)",
        "rules", payload.Content,
    )
    if err != nil {
        if utils.HandleDBError(w, err) {
            return
        }
        utils.WriteError(w, http.StatusInternalServerError, "Error saving page content")
        return
    }

    utils.WriteSuccess(w, http.StatusOK, "Page content updated successfully", payload)
}
