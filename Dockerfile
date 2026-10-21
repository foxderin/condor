# Condor, containerised. Upstream ships no Dockerfile — `make install` runs on a
# host (uv sync, npm build, downloads Chrome). This image does the same three
# steps at build time so the runtime container needs no toolchain.
#
# Deliberate omissions:
#   * Chrome/kaleido is NOT installed. It only renders chart *images* for
#     Telegram reports (condor/setup_chrome.py says so itself: "the dashboard,
#     the trading loops and the update flow all work without it"). In local mode
#     there is no Telegram, so it would be ~150 MB of dead weight.
#   * The update flow (`make refresh-codex`) is unavailable: it rewrites the app
#     tree, which is image content here, not a volume.

FROM node:22-bookworm-slim AS frontend
WORKDIR /build
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build -- --outDir dist --emptyOutDir

FROM ghcr.io/astral-sh/uv:python3.12-bookworm-slim AS runtime
ENV PYTHONUNBUFFERED=1 \
    UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    PATH="/app/.venv/bin:$PATH"

WORKDIR /app
# Dependency layer first: it only invalidates when the lockfile moves.
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev --no-install-project

COPY . .
COPY --from=frontend /build/dist ./frontend/dist
RUN uv sync --frozen --no-dev

# Condor writes here; declare them so a `docker run` without -v still works and
# so the ownership is right when a named volume is mounted over them.
RUN mkdir -p /app/data /app/.condor /app/reports
VOLUME ["/app/data", "/app/.condor", "/app/reports"]

EXPOSE 8088
CMD ["python", "main.py"]
