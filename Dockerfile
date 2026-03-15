# Watchtower: Proxmox VM Management
# Multi-stage: build frontend, then run backend serving API + static UI

# ---- Frontend build ----
FROM node:20-alpine AS frontend-build
WORKDIR /build/frontend

COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci --ignore-scripts
COPY frontend/ ./
RUN npm run build

# ---- Production ----
FROM node:20-alpine
WORKDIR /app

# Backend
COPY backend-server/package.json backend-server/package-lock.json ./backend-server/
WORKDIR /app/backend-server
RUN npm ci --omit=dev --ignore-scripts
COPY backend-server/ ./

# Frontend static build (server.js serves from ../frontend/dist)
RUN mkdir -p /app/frontend
COPY --from=frontend-build /build/frontend/dist /app/frontend/dist

WORKDIR /app/backend-server
EXPOSE 8080
ENV NODE_ENV=production
ENTRYPOINT ["node", "server.js"]
