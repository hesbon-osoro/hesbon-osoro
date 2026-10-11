package main

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"sync"
	"time"
)

type Item struct {
	SKU        string `json:"sku"`
	Quantity   int    `json:"quantity"`
	PriceCents int64  `json:"price_cents"`
}

type Order struct {
	ID         string    `json:"id"`
	CustomerID string    `json:"customer_id"`
	Items      []Item    `json:"items"`
	TotalCents int64     `json:"total_cents"`
	CreatedAt  time.Time `json:"created_at"`
}

var ErrNotFound = errors.New("order not found")

// Store is the persistence boundary. The in-memory implementation keeps the
// demo dependency-free; a Postgres implementation would satisfy the same
// interface.
type Store interface {
	// Create saves o unless idempotencyKey was already used, in which case it
	// returns the original order and created=false.
	Create(ctx context.Context, idempotencyKey string, o Order) (saved Order, created bool, err error)
	Get(ctx context.Context, id string) (Order, error)
}

type memoryStore struct {
	mu          sync.RWMutex
	orders      map[string]Order
	idempotency map[string]string
}

func newMemoryStore() *memoryStore {
	return &memoryStore{
		orders:      make(map[string]Order),
		idempotency: make(map[string]string),
	}
}

func (s *memoryStore) Create(_ context.Context, key string, o Order) (Order, bool, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	if key != "" {
		if id, ok := s.idempotency[key]; ok {
			return s.orders[id], false, nil
		}
		s.idempotency[key] = o.ID
	}
	s.orders[o.ID] = o
	return o, true, nil
}

func (s *memoryStore) Get(_ context.Context, id string) (Order, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	o, ok := s.orders[id]
	if !ok {
		return Order{}, ErrNotFound
	}
	return o, nil
}

func newID() string {
	var b [16]byte
	if _, err := rand.Read(b[:]); err != nil {
		panic(err) // crypto/rand never fails on supported platforms
	}
	return hex.EncodeToString(b[:])
}
