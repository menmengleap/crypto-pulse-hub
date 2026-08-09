package handlers

import (
	"net/http"
	"strings"

	"cryptolytic/backend/internal/middleware"
	"cryptolytic/backend/internal/repositories"
)

type WatchlistHandler struct {
	watchlists *repositories.WatchlistRepo
}

func NewWatchlistHandler(watchlists *repositories.WatchlistRepo) *WatchlistHandler {
	return &WatchlistHandler{watchlists: watchlists}
}

func (h *WatchlistHandler) List(w http.ResponseWriter, r *http.Request) {
	userID := middleware.UserID(r.Context())
	lists, err := h.watchlists.ListByUser(r.Context(), userID)
	if err != nil {
		writeServiceError(w, err)
		return
	}
	// Attach items to each watchlist.
	for i := range lists {
		items, err := h.watchlists.ListItems(r.Context(), lists[i].ID)
		if err != nil {
			writeServiceError(w, err)
			return
		}
		lists[i].Items = items
	}
	WriteOK(w, lists, nil)
}

type createWatchlistRequest struct {
	Name string `json:"name" validate:"required,max=120"`
}

func (h *WatchlistHandler) Create(w http.ResponseWriter, r *http.Request) {
	var req createWatchlistRequest
	if err := DecodeJSON(r, &req); err != nil {
		writeBadRequest(w, err)
		return
	}
	list, err := h.watchlists.Create(r.Context(), middleware.UserID(r.Context()), req.Name, false)
	if err != nil {
		writeServiceError(w, err)
		return
	}
	WriteCreated(w, list)
}

type updateWatchlistRequest struct {
	Name string `json:"name" validate:"required,max=120"`
}

func (h *WatchlistHandler) Update(w http.ResponseWriter, r *http.Request) {
	var req updateWatchlistRequest
	if err := DecodeJSON(r, &req); err != nil {
		writeBadRequest(w, err)
		return
	}
	if err := h.watchlists.Update(r.Context(), r.PathValue("id"), middleware.UserID(r.Context()), req.Name); err != nil {
		writeServiceError(w, err)
		return
	}
	WriteOK(w, map[string]string{"id": r.PathValue("id"), "name": req.Name}, nil)
}

func (h *WatchlistHandler) Delete(w http.ResponseWriter, r *http.Request) {
	if err := h.watchlists.Delete(r.Context(), r.PathValue("id"), middleware.UserID(r.Context())); err != nil {
		writeServiceError(w, err)
		return
	}
	WriteJSON(w, http.StatusNoContent, nil)
}

// AddItem POST /api/watchlists/:id/assets
func (h *WatchlistHandler) AddItem(w http.ResponseWriter, r *http.Request) {
	watchlistID := r.PathValue("id")
	if ok, err := h.watchlists.OwnedByUser(r.Context(), watchlistID, middleware.UserID(r.Context())); err != nil || !ok {
		writeServiceError(w, errOrNotFound(err))
		return
	}
	var req struct {
		Symbol string `json:"symbol" validate:"required,uppercase"`
	}
	if err := DecodeJSON(r, &req); err != nil {
		writeBadRequest(w, err)
		return
	}
	item, err := h.watchlists.AddItem(r.Context(), watchlistID, strings.ToUpper(req.Symbol), 0)
	if err != nil {
		writeServiceError(w, err)
		return
	}
	WriteCreated(w, item)
}

// RemoveItem DELETE /api/watchlists/:id/assets/:symbol
func (h *WatchlistHandler) RemoveItem(w http.ResponseWriter, r *http.Request) {
	watchlistID := r.PathValue("id")
	if ok, err := h.watchlists.OwnedByUser(r.Context(), watchlistID, middleware.UserID(r.Context())); err != nil || !ok {
		writeServiceError(w, errOrNotFound(err))
		return
	}
	symbol := strings.ToUpper(r.PathValue("symbol"))
	if err := h.watchlists.RemoveItem(r.Context(), watchlistID, symbol); err != nil {
		writeServiceError(w, err)
		return
	}
	WriteJSON(w, http.StatusNoContent, nil)
}

func errOrNotFound(err error) error {
	if err != nil {
		return err
	}
	return repositories.ErrNotFound
}
