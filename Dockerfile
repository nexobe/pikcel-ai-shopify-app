# DigitalOcean optimized Dockerfile for PikcelAI Shopify App
# Node.js 20+ LTS with Alpine Linux for minimal size

FROM node:20-alpine AS base

# Install OpenSSL and other required dependencies
RUN apk add --no-cache openssl libc6-compat

WORKDIR /app

# Dependencies installation stage
FROM base AS deps

# Copy package files
COPY package.json package-lock.json* ./

# Install dependencies (including devDependencies for build)
RUN npm ci && npm cache clean --force

# Build stage
FROM base AS builder

WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Remove dev dependencies and CLI packages
RUN npm prune --production
RUN npm remove @shopify/cli || true

# Production stage
FROM base AS runner

WORKDIR /app

ENV NODE_ENV=production

# DigitalOcean App Platform uses port 8080
ENV PORT=8080
EXPOSE 8080

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 shopify

# Copy necessary files from builder
COPY --from=builder --chown=shopify:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=shopify:nodejs /app/build ./build
COPY --from=builder --chown=shopify:nodejs /app/package.json ./package.json
COPY --from=builder --chown=shopify:nodejs /app/prisma ./prisma

# Switch to non-root user
USER shopify

# Health check endpoint
HEALTHCHECK --interval=30s --timeout=3s --start-period=60s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8080/healthz', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start the application
CMD ["npm", "run", "docker-start"]
