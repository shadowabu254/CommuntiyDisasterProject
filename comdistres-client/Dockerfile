# Stage 1 — build the React app
FROM node:20-alpine AS build
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm ci
COPY . .
# Build with environment variables at build time if required
RUN npm run build

# Stage 2 — serve with nginx
FROM nginx:stable-alpine AS prod
COPY --from=build /usr/src/app/build /usr/share/nginx/html
# Remove default nginx config and copy our optimized config (optional)
# COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
