# ==============================================================================
# VIGENT P2P RELAY HUB - DOKPLOY DOCKERFILE
# Ultra-lightweight Node.js Alpine container (~15MB RAM footprint)
# ==============================================================================

FROM node:20-alpine

# Set working directory
WORKDIR /app

# Set production environment
ENV NODE_ENV=production
ENV PORT=3000

# Copy application code
COPY package.json ./
COPY server.js ./

# Expose standard container ports
EXPOSE 3000

# Dokploy & Docker Healthcheck (Using 127.0.0.1 directly to avoid Alpine IPv6 resolution issues)
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

# Start the lightweight rendezvous server
CMD ["node", "server.js"]
