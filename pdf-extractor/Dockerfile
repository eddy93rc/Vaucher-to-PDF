FROM node:20-alpine

WORKDIR /app

# Directorio para PDFs temporales
RUN mkdir -p /tmp/pdf-extractor

COPY package*.json ./
RUN npm ci --omit=dev

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

EXPOSE 9120

ENV PORT=9120
ENV NODE_ENV=production
ENV UPLOAD_DIR=/tmp/pdf-extractor

CMD ["node", "dist/index.js"]
