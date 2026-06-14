# POTA board — tiny static + (future) /api proxy server
FROM node:20-alpine

WORKDIR /app

# Install only production deps first (better layer caching)
COPY package.json ./
RUN npm install --omit=dev && npm cache clean --force

# App source
COPY src ./src
COPY public ./public

ENV PORT=8075
EXPOSE 8075

# Lightweight healthcheck against the liveness probe
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8075/healthz >/dev/null 2>&1 || exit 1

CMD ["node", "src/server.js"]
