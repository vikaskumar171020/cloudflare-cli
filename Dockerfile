# ==============================================================================
# Base Node.js image
# ==============================================================================
FROM node:22-alpine AS base
WORKDIR /app
RUN apk add --no-cache libc6-compat

# ==============================================================================
# Dependencies Stage
# ==============================================================================
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

# ==============================================================================
# Test & Lint Stage (Target for Dockerized CI & Test Runs)
# ==============================================================================
FROM deps AS test
COPY tsconfig.json vitest.config.ts* ./
COPY src/ ./src/
COPY test/ ./test/
ENV NODE_ENV=test
CMD ["npm", "test"]

# ==============================================================================
# Builder Stage
# ==============================================================================
FROM deps AS builder
COPY tsconfig.json ./
COPY src/ ./src/
RUN npm run build

# ==============================================================================
# Production Runtime Stage
# ==============================================================================
FROM base AS runner
ENV NODE_ENV=production

# Install only production dependencies
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy compiled artifacts
COPY --from=builder /app/dist ./dist

# Symlink CLI binary to PATH
RUN npm link

ENTRYPOINT ["cloudflare-cli"]
CMD ["--help"]
