# ── Builder stage ─────────────────────────────────────────────────────────────
FROM rust:1.83-slim-bookworm AS builder

RUN apt-get update && \
    apt-get install -y --no-install-recommends pkg-config libssl-dev && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy workspace Cargo.toml and lockfile
COPY Cargo.toml Cargo.lock ./

# Copy the packages and apps needed for the build
COPY packages/eval-core ./packages/eval-core
COPY apps/server ./apps/server

# Build the release binary
RUN cargo build --release --bin flagforge-server

# ── Runtime stage ─────────────────────────────────────────────────────────────
FROM debian:bookworm-slim

RUN apt-get update && \
    apt-get install -y --no-install-recommends ca-certificates libssl3 && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY --from=builder /app/target/release/flagforge-server .

EXPOSE 8080

CMD ["./flagforge-server"]
