FROM mcr.microsoft.com/playwright:v1.40.0-jammy

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src ./src
COPY templates ./templates
COPY assets ./assets
COPY logos-img ./logos-img

RUN npm run build

EXPOSE 9110

ENV PORT=9110
ENV NODE_ENV=production

CMD ["node", "dist/index.js"]
