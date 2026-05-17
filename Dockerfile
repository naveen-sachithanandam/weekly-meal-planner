# Stage 1 — deps
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# Stage 2 — builder
FROM node:20-alpine AS builder
WORKDIR /app
# Placeholders for `next build` (config is validated at collect page data).
# Runtime values come from docker-compose / .env.local.
ENV HOME_TIMEZONE=UTC
ENV OLLAMA_HOST=http://localhost:11434
ENV OLLAMA_MODEL=llama3
ENV DATABASE_URL=file:/tmp/build.db
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build

# Stage 3 — runner
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
EXPOSE 3000
CMD ["node", "server.js"]
