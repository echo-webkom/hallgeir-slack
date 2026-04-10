FROM denoland/deno:2.5.2 AS builder

WORKDIR /app

# Copy source files first (needed for cache to work)
COPY . .

# Cache dependencies (--reload forces fresh JSR metadata)
RUN deno cache --reload main.ts

# Production stage
FROM denoland/deno:2.5.2

WORKDIR /app

# Copy source files
COPY --from=builder /app .

# Clean corrupted cache and re-cache dependencies
ENV DENO_DIR=/app/.deno-dir
RUN rm -rf $DENO_DIR && deno cache --reload main.ts

# Run as non-root user for security
RUN useradd --create-home --shell /bin/bash appuser && \
    chown -R appuser:appuser /app
USER appuser

CMD ["run", "-A", "main.ts"]
