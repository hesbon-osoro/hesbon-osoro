package main

import (
	"cmp"
	"fmt"
	"io"
	"maps"
	"net/http"
	"slices"
	"strconv"
	"strings"
	"sync"
	"time"
)

// Latency buckets in seconds, tuned for an API with a ~250ms p99 SLO.
var latencyBuckets = []float64{0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5}

type routeKey struct {
	method, route string
}

type requestKey struct {
	routeKey
	status int
}

type histogram struct {
	buckets []uint64 // cumulative, aligned with latencyBuckets
	sum     float64
	count   uint64
}

// metrics is a tiny Prometheus text-format exporter. It avoids pulling in
// client_golang so the service stays dependency-free.
type metrics struct {
	mu       sync.Mutex
	requests map[requestKey]uint64
	latency  map[routeKey]*histogram
}

func newMetrics() *metrics {
	return &metrics{
		requests: make(map[requestKey]uint64),
		latency:  make(map[routeKey]*histogram),
	}
}

func (m *metrics) observe(method, route string, status int, d time.Duration) {
	m.mu.Lock()
	defer m.mu.Unlock()

	rk := routeKey{method, route}
	m.requests[requestKey{rk, status}]++

	h := m.latency[rk]
	if h == nil {
		h = &histogram{buckets: make([]uint64, len(latencyBuckets))}
		m.latency[rk] = h
	}
	sec := d.Seconds()
	for i, upper := range latencyBuckets {
		if sec <= upper {
			h.buckets[i]++
		}
	}
	h.sum += sec
	h.count++
}

func compareRoute(a, b routeKey) int {
	return cmp.Or(cmp.Compare(a.route, b.route), cmp.Compare(a.method, b.method))
}

func (m *metrics) ServeHTTP(w http.ResponseWriter, _ *http.Request) {
	m.mu.Lock()
	defer m.mu.Unlock()

	var b strings.Builder
	b.WriteString("# HELP http_requests_total HTTP requests by method, route and status code.\n")
	b.WriteString("# TYPE http_requests_total counter\n")
	reqKeys := slices.Collect(maps.Keys(m.requests))
	slices.SortFunc(reqKeys, func(a, b requestKey) int {
		return cmp.Or(compareRoute(a.routeKey, b.routeKey), cmp.Compare(a.status, b.status))
	})
	for _, k := range reqKeys {
		fmt.Fprintf(&b, "http_requests_total{method=%q,route=%q,status=\"%d\"} %d\n",
			k.method, k.route, k.status, m.requests[k])
	}

	b.WriteString("# HELP http_request_duration_seconds HTTP request latency.\n")
	b.WriteString("# TYPE http_request_duration_seconds histogram\n")
	latKeys := slices.Collect(maps.Keys(m.latency))
	slices.SortFunc(latKeys, compareRoute)
	for _, k := range latKeys {
		h := m.latency[k]
		labels := fmt.Sprintf("method=%q,route=%q", k.method, k.route)
		for i, upper := range latencyBuckets {
			fmt.Fprintf(&b, "http_request_duration_seconds_bucket{%s,le=%q} %d\n",
				labels, strconv.FormatFloat(upper, 'g', -1, 64), h.buckets[i])
		}
		fmt.Fprintf(&b, "http_request_duration_seconds_bucket{%s,le=\"+Inf\"} %d\n", labels, h.count)
		fmt.Fprintf(&b, "http_request_duration_seconds_sum{%s} %g\n", labels, h.sum)
		fmt.Fprintf(&b, "http_request_duration_seconds_count{%s} %d\n", labels, h.count)
	}

	w.Header().Set("Content-Type", "text/plain; version=0.0.4; charset=utf-8")
	_, _ = io.WriteString(w, b.String())
}
