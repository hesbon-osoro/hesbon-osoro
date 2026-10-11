package main

import (
	"fmt"
	"time"
)

type config struct {
	Addr            string
	ShutdownTimeout time.Duration
	DrainDelay      time.Duration
}

// loadConfig reads twelve-factor style settings. getenv is injected so tests
// don't have to mutate the process environment.
func loadConfig(getenv func(string) string) (config, error) {
	cfg := config{
		Addr:            ":8080",
		ShutdownTimeout: 20 * time.Second,
		DrainDelay:      5 * time.Second,
	}
	if v := getenv("ADDR"); v != "" {
		cfg.Addr = v
	}

	durations := []struct {
		name string
		dst  *time.Duration
	}{
		{"SHUTDOWN_TIMEOUT", &cfg.ShutdownTimeout},
		{"DRAIN_DELAY", &cfg.DrainDelay},
	}
	for _, d := range durations {
		v := getenv(d.name)
		if v == "" {
			continue
		}
		parsed, err := time.ParseDuration(v)
		if err != nil {
			return config{}, fmt.Errorf("%s: %w", d.name, err)
		}
		if parsed < 0 {
			return config{}, fmt.Errorf("%s must not be negative", d.name)
		}
		*d.dst = parsed
	}
	return cfg, nil
}
