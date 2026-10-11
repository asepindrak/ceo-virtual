# ==============================================================================
# VIGENT P2P RELAY HUB - DOKPLOY DOCKERFILE
# Ultra-lightweight Node.js Alpine container (~15MB RAM footprint)
# ==============================================================================

FROM node:20-alpine

# Set non-root working directory
WORKDIR /app

# Set production environment
ENV NODE_ENV=production
ENV PORT=3000

# Copy application code
COPY package.json ./
COPY server.js ./

# Expose standard container port
EXPOSE 3000

# Dokploy & Docker Healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget -qO- http://localhost:3000/health || exit 1

# Start the lightweight rendezvous server
CMD ["node", "server.js"]
