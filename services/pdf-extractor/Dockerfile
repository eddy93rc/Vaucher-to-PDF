# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# Stage 2: Production
FROM node:20-alpine

WORKDIR /app

RUN mkdir -p /tmp/pdf-extractor

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist

EXPOSE 9120

ENV PORT=9120
ENV NODE_ENV=production
ENV UPLOAD_DIR=/tmp/pdf-extractor

CMD ["node", "dist/index.js"]
