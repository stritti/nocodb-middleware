# Build stage
FROM node:22-alpine AS builder

WORKDIR /app

# Create non-root user for build
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Make /app writable for nodejs user
RUN chmod -R 775 /app

# Copy package files
COPY --chown=nodejs:nodejs package*.json ./

# Install dependencies as non-root
USER nodejs
RUN npm ci

# Copy source code
COPY --chown=nodejs:nodejs . .

# Build application
RUN npm run build

# Production stage
FROM node:22-alpine

WORKDIR /app

# Create non-root user for production
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Copy package files
COPY --chown=nodejs:nodejs package*.json ./

# Install only production dependencies as non-root
USER nodejs
RUN npm ci --only=production

# Copy built application
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist

# Create logs directory
RUN mkdir -p logs && chown nodejs:nodejs logs

# Healthcheck
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

# Expose port
EXPOSE 3000

# Start application as non-root
USER nodejs
CMD ["node", "dist/main"]
