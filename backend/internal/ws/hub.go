// Package ws provides a WebSocket hub that streams market snapshots to
// connected clients. It is intentionally small: the provider interface keeps
// it ready to switch from the mock generator to a real exchange feed later.
package ws

import (
	"context"
	"encoding/json"
	"net/http"
	"sync"
	"time"

	"github.com/gorilla/websocket"

	"cryptolytic/backend/internal/marketdata"
)

const (
	writeWait      = 10 * time.Second
	pongWait       = 60 * time.Second
	pingPeriod     = 50 * time.Second
	broadcastEvery = 2 * time.Second
)

// Hub manages all connected clients and broadcasts snapshots.
type Hub struct {
	provider marketdata.MarketDataProvider

	mu      sync.Mutex
	clients map[*Client]bool

	upgrader websocket.Upgrader
}

// NewHub creates a hub backed by the given provider.
func NewHub(provider marketdata.MarketDataProvider) *Hub {
	return &Hub{
		provider: provider,
		clients:  map[*Client]bool{},
		upgrader: websocket.Upgrader{
			ReadBufferSize:  1024,
			WriteBufferSize: 1024,
			CheckOrigin: func(r *http.Request) bool {
				return true // read-only public market stream
			},
		},
	}
}

// Client is a single connected websocket.
type Client struct {
	hub  *Hub
	conn *websocket.Conn
	send chan []byte
}

// ServeWS upgrades an HTTP request to a websocket and runs it.
func (h *Hub) ServeWS(w http.ResponseWriter, r *http.Request) {
	conn, err := h.upgrader.Upgrade(w, r, nil)
	if err != nil {
		return
	}
	client := &Client{hub: h, conn: conn, send: make(chan []byte, 64)}
	h.register(client)
	go client.writePump()
	client.readPump() // blocks until the client disconnects
	h.unregister(client)
}

func (h *Hub) register(c *Client) {
	h.mu.Lock()
	defer h.mu.Unlock()
	h.clients[c] = true
}

func (h *Hub) unregister(c *Client) {
	h.mu.Lock()
	defer h.mu.Unlock()
	if _, ok := h.clients[c]; ok {
		delete(h.clients, c)
		close(c.send)
	}
}

// Run broadcasts snapshots on an interval until the context is cancelled.
func (h *Hub) Run(ctx context.Context) {
	ticker := time.NewTicker(broadcastEvery)
	defer ticker.Stop()
	for {
		select {
		case <-ctx.Done():
			h.closeAll()
			return
		case <-ticker.C:
			h.broadcastSnapshots()
		}
	}
}

func (h *Hub) broadcastSnapshots() {
	snapshots, err := h.provider.Snapshots()
	if err != nil {
		return
	}
	payload, err := json.Marshal(map[string]any{
		"type": "market_snapshot",
		"at":   time.Now().UTC(),
		"data": snapshots,
	})
	if err != nil {
		return
	}

	h.mu.Lock()
	defer h.mu.Unlock()
	for c := range h.clients {
		select {
		case c.send <- payload:
		default: // slow client: skip this frame
		}
	}
}

func (h *Hub) closeAll() {
	h.mu.Lock()
	defer h.mu.Unlock()
	for c := range h.clients {
		close(c.send)
		_ = c.conn.Close()
	}
	h.clients = map[*Client]bool{}
}

// readPump consumes inbound messages (only pongs matter) until disconnect.
func (c *Client) readPump() {
	defer func() {
		_ = c.conn.Close()
	}()
	c.conn.SetReadLimit(1024)
	_ = c.conn.SetReadDeadline(time.Now().Add(pongWait))
	c.conn.SetPongHandler(func(string) error {
		return c.conn.SetReadDeadline(time.Now().Add(pongWait))
	})
	for {
		if _, _, err := c.conn.ReadMessage(); err != nil {
			return
		}
	}
}

func (c *Client) writePump() {
	ticker := time.NewTicker(pingPeriod)
	defer func() {
		ticker.Stop()
		_ = c.conn.Close()
	}()
	for {
		select {
		case msg, ok := <-c.send:
			_ = c.conn.SetWriteDeadline(time.Now().Add(writeWait))
			if !ok {
				_ = c.conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}
			if err := c.conn.WriteMessage(websocket.TextMessage, msg); err != nil {
				return
			}
		case <-ticker.C:
			_ = c.conn.SetWriteDeadline(time.Now().Add(writeWait))
			if err := c.conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}
