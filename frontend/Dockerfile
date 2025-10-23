# Stage 1 — build React
FROM node:18-alpine AS build

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Stage 2 — serve static files with nginx
FROM nginx:alpine

COPY --from=build /app/build /usr/share/nginx/html

# Use custom nginx config with SPA fallback
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 10000
CMD ["nginx", "-g", "daemon off;"]
