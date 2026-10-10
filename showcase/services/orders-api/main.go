// Command orders-api is a small, production-shaped HTTP service: structured
// logging, Prometheus metrics, idempotent writes, and a graceful shutdown that
// cooperates with Kubernetes rolling updates.
package main

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"net"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"
)

// version is injected at build time with -ldflags "-X main.version=...".
var version = "dev"

func main() {
	// Distroless images have no shell or curl, so the binary probes itself.
	if len(os.Args) > 1 && os.Args[1] == "healthcheck" {
		os.Exit(healthcheck(os.Getenv("ADDR")))
	}

	logger := slog.New(slog.NewJSONHandler(os.Stdout, nil)).With("service", "orders-api", "version", version)

	cfg, err := loadConfig(os.Getenv)
	if err != nil {
		logger.Error("invalid configuration", "err", err)
		os.Exit(2)
	}

	if err := run(context.Background(), cfg, logger); err != nil {
		logger.Error("server stopped with error", "err", err)
		os.Exit(1)
	}
}

func run(ctx context.Context, cfg config, logger *slog.Logger) error {
	ctx, stop := signal.NotifyContext(ctx, os.Interrupt, syscall.SIGTERM)
	defer stop()

	app := newServer(newMemoryStore(), logger)
	srv := &http.Server{
		Addr:              cfg.Addr,
		Handler:           app,
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       15 * time.Second,
		WriteTimeout:      15 * time.Second,
		IdleTimeout:       60 * time.Second,
	}

	errCh := make(chan error, 1)
	go func() {
		logger.Info("listening", "addr", cfg.Addr)
		if err := srv.ListenAndServe(); !errors.Is(err, http.ErrServerClosed) {
			errCh <- err
		}
		close(errCh)
	}()

	select {
	case err := <-errCh:
		return err
	case <-ctx.Done():
	}

	// Fail readiness first and give the endpoints controller time to remove
	// this pod from Service endpoints before we stop accepting connections.
	logger.Info("shutdown signal received, draining", "drain_delay", cfg.DrainDelay)
	app.ready.Store(false)
	time.Sleep(cfg.DrainDelay)

	shutdownCtx, cancel := context.WithTimeout(context.Background(), cfg.ShutdownTimeout)
	defer cancel()
	if err := srv.Shutdown(shutdownCtx); err != nil {
		return fmt.Errorf("graceful shutdown: %w", err)
	}
	logger.Info("shutdown complete")
	return nil
}

func healthcheck(addr string) int {
	_, port, err := net.SplitHostPort(addr)
	if err != nil || port == "" {
		port = "8080"
	}
	client := http.Client{Timeout: 2 * time.Second}
	resp, err := client.Get("http://127.0.0.1:" + port + "/healthz")
	if err != nil {
		return 1
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return 1
	}
	return 0
}
