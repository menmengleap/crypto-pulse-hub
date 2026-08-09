package handlers

import (
	"net/http"
	"strconv"

	"cryptolytic/backend/internal/repositories"
)

type NewsHandler struct {
	news *repositories.NewsRepo
}

func NewNewsHandler(news *repositories.NewsRepo) *NewsHandler {
	return &NewsHandler{news: news}
}

// List GET /api/news?category=DeFi&symbol=BTC&search=etf&page=1&limit=20&sort=newest
func (h *NewsHandler) List(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	page, _ := strconv.Atoi(q.Get("page"))
	limit, _ := strconv.Atoi(q.Get("limit"))

	items, total, err := h.news.List(r.Context(), repositories.NewsFilter{
		Category: q.Get("category"),
		Symbol:   q.Get("symbol"),
		Search:   q.Get("search"),
		Sort:     q.Get("sort"),
		Page:     page,
		Limit:    limit,
	})
	if err != nil {
		writeServiceError(w, err)
		return
	}
	meta := map[string]any{
		"total": total,
		"page":  pageOrDefault(page),
		"limit": limitOrDefault(limit),
	}
	WriteOK(w, items, meta)
}

func (h *NewsHandler) Get(w http.ResponseWriter, r *http.Request) {
	item, err := h.news.GetByID(r.Context(), r.PathValue("id"))
	if err != nil {
		writeServiceError(w, err)
		return
	}
	WriteOK(w, item, nil)
}

func (h *NewsHandler) Categories(w http.ResponseWriter, r *http.Request) {
	cats, err := h.news.Categories(r.Context())
	if err != nil {
		writeServiceError(w, err)
		return
	}
	WriteOK(w, cats, nil)
}

func (h *NewsHandler) Trending(w http.ResponseWriter, r *http.Request) {
	items, err := h.news.Trending(r.Context(), 6)
	if err != nil {
		writeServiceError(w, err)
		return
	}
	WriteOK(w, items, nil)
}

func pageOrDefault(p int) int {
	if p < 1 {
		return 1
	}
	return p
}

func limitOrDefault(l int) int {
	if l < 1 {
		return 20
	}
	return l
}
