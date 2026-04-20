# Stage 1 — install deps (builder)
FROM node:20-alpine AS deps
WORKDIR /usr/src/app
# Install build dependencies
COPY package*.json ./
RUN npm ci --production=false

# Stage 2 — build (if you had a build step)
FROM node:20-alpine AS build
WORKDIR /usr/src/app
COPY --from=deps /usr/src/app/node_modules ./node_modules
COPY . .
# If you had any compile step, run here (none necessary)
# RUN npm run build

# Stage 3 — production image
FROM node:20-alpine AS prod
WORKDIR /usr/src/app
ENV NODE_ENV=production
# copy only runtime deps and source
COPY --from=build /usr/src/app . 
# remove dev-only files if needed (optional)
RUN npm prune --production

# Expose port and start
EXPOSE 8000
CMD ["node", "server.js"]
