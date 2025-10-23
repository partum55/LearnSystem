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

# Render expects the app to listen on port 10000
EXPOSE 10000
RUN sed -i 's/listen 80;/listen 10000;/' /etc/nginx/conf.d/default.conf
CMD ["nginx", "-g", "daemon off;"]
