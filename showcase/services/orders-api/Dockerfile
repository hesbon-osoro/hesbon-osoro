# syntax=docker/dockerfile:1.7
# Multi-arch, cache-friendly build that ships a ~10 MB distroless image
# running as a non-root user with no shell.

ARG GO_VERSION=1.23

FROM --platform=$BUILDPLATFORM golang:${GO_VERSION}-alpine AS build
WORKDIR /src

COPY go.mod ./
RUN --mount=type=cache,target=/go/pkg/mod go mod download

COPY . .
ARG TARGETOS TARGETARCH VERSION=dev
RUN --mount=type=cache,target=/go/pkg/mod \
    --mount=type=cache,target=/root/.cache/go-build \
    CGO_ENABLED=0 GOOS=$TARGETOS GOARCH=$TARGETARCH \
    go build -trimpath -ldflags="-s -w -X main.version=${VERSION}" -o /out/orders-api .

FROM gcr.io/distroless/static-debian12:nonroot
LABEL org.opencontainers.image.source="https://github.com/hesbon-osoro/hesbon-osoro" \
      org.opencontainers.image.description="orders-api showcase service"

COPY --from=build /out/orders-api /orders-api
USER nonroot:nonroot
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD ["/orders-api", "healthcheck"]
ENTRYPOINT ["/orders-api"]
