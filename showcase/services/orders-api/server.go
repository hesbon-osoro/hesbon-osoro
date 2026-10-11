package main

import (
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"strings"
	"sync/atomic"
	"time"
)

const maxBodyBytes = 1 << 20

type server struct {
	store   Store
	log     *slog.Logger
	metrics *metrics
	ready   atomic.Bool
	mux     *http.ServeMux
}

func newServer(store Store, logger *slog.Logger) *server {
	s := &server{store: store, log: logger, metrics: newMetrics(), mux: http.NewServeMux()}
	s.ready.Store(true)

	s.mux.HandleFunc("GET /healthz", func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusOK)
	})
	s.mux.HandleFunc("GET /readyz", s.readyz)
	s.mux.Handle("GET /metrics", s.metrics)
	s.mux.Handle("POST /v1/orders", s.instrument("/v1/orders", s.createOrder))
	s.mux.Handle("GET /v1/orders/{id}", s.instrument("/v1/orders/{id}", s.getOrder))
	return s
}

func (s *server) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	s.mux.ServeHTTP(w, r)
}

func (s *server) readyz(w http.ResponseWriter, _ *http.Request) {
	if !s.ready.Load() {
		http.Error(w, "draining", http.StatusServiceUnavailable)
		return
	}
	w.WriteHeader(http.StatusOK)
}

type createOrderRequest struct {
	CustomerID string `json:"customer_id"`
	Items      []Item `json:"items"`
}

func (req createOrderRequest) validate() error {
	if strings.TrimSpace(req.CustomerID) == "" {
		return errors.New("customer_id is required")
	}
	if len(req.Items) == 0 {
		return errors.New("at least one item is required")
	}
	for i, it := range req.Items {
		switch {
		case strings.TrimSpace(it.SKU) == "":
			return fmt.Errorf("items[%d].sku is required", i)
		case it.Quantity <= 0:
			return fmt.Errorf("items[%d].quantity must be positive", i)
		case it.PriceCents < 0:
			return fmt.Errorf("items[%d].price_cents must not be negative", i)
		}
	}
	return nil
}

func (s *server) createOrder(w http.ResponseWriter, r *http.Request) {
	var req createOrderRequest
	dec := json.NewDecoder(http.MaxBytesReader(w, r.Body, maxBodyBytes))
	dec.DisallowUnknownFields()
	if err := dec.Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON body: "+err.Error())
		return
	}
	if err := req.validate(); err != nil {
		writeError(w, http.StatusUnprocessableEntity, err.Error())
		return
	}

	order := Order{
		ID:         newID(),
		CustomerID: req.CustomerID,
		Items:      req.Items,
		CreatedAt:  time.Now().UTC(),
	}
	for _, it := range req.Items {
		order.TotalCents += int64(it.Quantity) * it.PriceCents
	}

	saved, created, err := s.store.Create(r.Context(), r.Header.Get("Idempotency-Key"), order)
	if err != nil {
		s.log.ErrorContext(r.Context(), "create order", "err", err)
		writeError(w, http.StatusInternalServerError, "internal error")
		return
	}

	status := http.StatusCreated
	if !created {
		status = http.StatusOK // replayed request: same response, no duplicate order
	}
	w.Header().Set("Location", "/v1/orders/"+saved.ID)
	writeJSON(w, status, saved)
}

func (s *server) getOrder(w http.ResponseWriter, r *http.Request) {
	order, err := s.store.Get(r.Context(), r.PathValue("id"))
	switch {
	case errors.Is(err, ErrNotFound):
		writeError(w, http.StatusNotFound, err.Error())
	case err != nil:
		s.log.ErrorContext(r.Context(), "get order", "err", err)
		writeError(w, http.StatusInternalServerError, "internal error")
	default:
		writeJSON(w, http.StatusOK, order)
	}
}

// instrument adds request IDs, panic recovery, access logs and RED metrics.
// route is the pattern, not the raw path, to keep metric cardinality bounded.
func (s *server) instrument(route string, h http.HandlerFunc) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		rec := &statusRecorder{ResponseWriter: w, status: http.StatusOK}

		reqID := r.Header.Get("X-Request-ID")
		if reqID == "" {
			reqID = newID()
		}
		rec.Header().Set("X-Request-ID", reqID)

		defer func() {
			if p := recover(); p != nil {
				s.log.ErrorContext(r.Context(), "panic recovered", "panic", p, "request_id", reqID)
				if !rec.wroteHeader {
					writeError(rec, http.StatusInternalServerError, "internal error")
				}
				rec.status = http.StatusInternalServerError
			}
			elapsed := time.Since(start)
			s.metrics.observe(r.Method, route, rec.status, elapsed)
			s.log.LogAttrs(r.Context(), slog.LevelInfo, "request",
				slog.String("request_id", reqID),
				slog.String("method", r.Method),
				slog.String("route", route),
				slog.Int("status", rec.status),
				slog.Float64("duration_ms", float64(elapsed.Microseconds())/1000),
			)
		}()

		h(rec, r)
	})
}

type statusRecorder struct {
	http.ResponseWriter
	status      int
	wroteHeader bool
}

func (r *statusRecorder) WriteHeader(code int) {
	if !r.wroteHeader {
		r.status = code
		r.wroteHeader = true
	}
	r.ResponseWriter.WriteHeader(code)
}

func (r *statusRecorder) Write(b []byte) (int, error) {
	r.wroteHeader = true
	return r.ResponseWriter.Write(b)
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

func writeError(w http.ResponseWriter, status int, msg string) {
	writeJSON(w, status, map[string]string{"error": msg})
}
