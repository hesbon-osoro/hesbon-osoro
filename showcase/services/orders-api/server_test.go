package main

import (
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
)

func newTestServer(t *testing.T) *server {
	t.Helper()
	return newServer(newMemoryStore(), slog.New(slog.NewTextHandler(io.Discard, nil)))
}

func do(t *testing.T, h http.Handler, method, path, body string, headers map[string]string) *httptest.ResponseRecorder {
	t.Helper()
	req := httptest.NewRequest(method, path, strings.NewReader(body))
	for k, v := range headers {
		req.Header.Set(k, v)
	}
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)
	return rec
}

const validOrder = `{"customer_id":"c-42","items":[{"sku":"KB-01","quantity":2,"price_cents":4999},{"sku":"MS-02","quantity":1,"price_cents":2500}]}`

func TestCreateAndGetOrder(t *testing.T) {
	srv := newTestServer(t)

	rec := do(t, srv, http.MethodPost, "/v1/orders", validOrder, nil)
	if rec.Code != http.StatusCreated {
		t.Fatalf("create: got %d, want 201: %s", rec.Code, rec.Body)
	}
	var created Order
	if err := json.NewDecoder(rec.Body).Decode(&created); err != nil {
		t.Fatal(err)
	}
	if created.TotalCents != 2*4999+2500 {
		t.Errorf("total = %d, want %d", created.TotalCents, 2*4999+2500)
	}
	if loc := rec.Header().Get("Location"); loc != "/v1/orders/"+created.ID {
		t.Errorf("Location = %q", loc)
	}
	if rec.Header().Get("X-Request-ID") == "" {
		t.Error("missing X-Request-ID")
	}

	rec = do(t, srv, http.MethodGet, "/v1/orders/"+created.ID, "", nil)
	if rec.Code != http.StatusOK {
		t.Fatalf("get: got %d, want 200", rec.Code)
	}
}

func TestCreateOrderIsIdempotent(t *testing.T) {
	srv := newTestServer(t)
	headers := map[string]string{"Idempotency-Key": "checkout-123"}

	first := do(t, srv, http.MethodPost, "/v1/orders", validOrder, headers)
	second := do(t, srv, http.MethodPost, "/v1/orders", validOrder, headers)

	if first.Code != http.StatusCreated || second.Code != http.StatusOK {
		t.Fatalf("status codes = %d, %d; want 201, 200", first.Code, second.Code)
	}
	if first.Header().Get("Location") != second.Header().Get("Location") {
		t.Error("replayed request created a second order")
	}
}

func TestCreateOrderValidation(t *testing.T) {
	tests := map[string]struct {
		body string
		want int
	}{
		"malformed json":   {`{"customer_id":`, http.StatusBadRequest},
		"unknown field":    {`{"customer_id":"c","items":[],"coupon":"FREE"}`, http.StatusBadRequest},
		"missing customer": {`{"items":[{"sku":"a","quantity":1,"price_cents":1}]}`, http.StatusUnprocessableEntity},
		"no items":         {`{"customer_id":"c","items":[]}`, http.StatusUnprocessableEntity},
		"zero quantity":    {`{"customer_id":"c","items":[{"sku":"a","quantity":0,"price_cents":1}]}`, http.StatusUnprocessableEntity},
		"negative price":   {`{"customer_id":"c","items":[{"sku":"a","quantity":1,"price_cents":-1}]}`, http.StatusUnprocessableEntity},
	}
	srv := newTestServer(t)
	for name, tc := range tests {
		t.Run(name, func(t *testing.T) {
			rec := do(t, srv, http.MethodPost, "/v1/orders", tc.body, nil)
			if rec.Code != tc.want {
				t.Errorf("got %d, want %d: %s", rec.Code, tc.want, rec.Body)
			}
		})
	}
}

func TestGetUnknownOrder(t *testing.T) {
	rec := do(t, newTestServer(t), http.MethodGet, "/v1/orders/does-not-exist", "", nil)
	if rec.Code != http.StatusNotFound {
		t.Fatalf("got %d, want 404", rec.Code)
	}
}

func TestReadinessFlipsWhileDraining(t *testing.T) {
	srv := newTestServer(t)
	if rec := do(t, srv, http.MethodGet, "/readyz", "", nil); rec.Code != http.StatusOK {
		t.Fatalf("ready: got %d", rec.Code)
	}
	srv.ready.Store(false)
	if rec := do(t, srv, http.MethodGet, "/readyz", "", nil); rec.Code != http.StatusServiceUnavailable {
		t.Fatalf("draining: got %d, want 503", rec.Code)
	}
	if rec := do(t, srv, http.MethodGet, "/healthz", "", nil); rec.Code != http.StatusOK {
		t.Fatalf("liveness must stay green while draining, got %d", rec.Code)
	}
}

func TestMetricsExposition(t *testing.T) {
	srv := newTestServer(t)
	do(t, srv, http.MethodPost, "/v1/orders", validOrder, nil)
	do(t, srv, http.MethodGet, "/v1/orders/missing", "", nil)

	body := do(t, srv, http.MethodGet, "/metrics", "", nil).Body.String()
	for _, want := range []string{
		`http_requests_total{method="POST",route="/v1/orders",status="201"} 1`,
		`http_requests_total{method="GET",route="/v1/orders/{id}",status="404"} 1`,
		`http_request_duration_seconds_bucket{method="POST",route="/v1/orders",le="+Inf"} 1`,
		`http_request_duration_seconds_count{method="GET",route="/v1/orders/{id}"} 1`,
	} {
		if !strings.Contains(body, want) {
			t.Errorf("metrics missing %q\n%s", want, body)
		}
	}
}

func TestPanicIsRecovered(t *testing.T) {
	srv := newTestServer(t)
	h := srv.instrument("/boom", func(http.ResponseWriter, *http.Request) { panic("boom") })
	rec := do(t, h, http.MethodGet, "/boom", "", nil)
	if rec.Code != http.StatusInternalServerError {
		t.Fatalf("got %d, want 500", rec.Code)
	}
}

func TestLoadConfig(t *testing.T) {
	env := map[string]string{"ADDR": ":9090", "DRAIN_DELAY": "2s"}
	cfg, err := loadConfig(func(k string) string { return env[k] })
	if err != nil {
		t.Fatal(err)
	}
	if cfg.Addr != ":9090" || cfg.DrainDelay != 2*time.Second || cfg.ShutdownTimeout != 20*time.Second {
		t.Errorf("unexpected config %+v", cfg)
	}

	env["SHUTDOWN_TIMEOUT"] = "soon"
	if _, err := loadConfig(func(k string) string { return env[k] }); err == nil {
		t.Error("expected error for invalid duration")
	}
}
