# ── Build stage ────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Install ALL dependencies (including devDeps for compilation)
COPY package*.json ./
RUN npm install

# Copy source
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build with tsc
RUN npx tsc -p tsconfig.build.json

# Verify dist was created
RUN ls -la dist/main.js

# ── Production stage ───────────────────────────────────────────────
FROM node:20-alpine AS production

WORKDIR /app

ENV NODE_ENV=production

# Install only production deps
COPY package*.json ./
RUN npm install --omit=dev

# Copy build artifacts and prisma
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts

# Verify dist exists in production image
RUN ls -la /app/dist/main.js

EXPOSE 3001

# Use sh -c to get better error messages
CMD ["sh", "-c", "echo 'Starting app...' && ls /app/dist/main.js && node /app/dist/main.js"]
