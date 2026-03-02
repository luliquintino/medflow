FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

RUN npx prisma generate

# Debug: show what nest build does
RUN echo "=== Files before build ===" && ls -la src/main.ts && cat nest-cli.json && cat tsconfig.build.json
RUN npm run build 2>&1 || true
RUN echo "=== Files after build ===" && ls -la dist/ 2>/dev/null || echo "dist/ does not exist!"
RUN echo "=== Trying tsc directly ===" && npx tsc --version && npx tsc -p tsconfig.build.json --listEmittedFiles 2>&1 || true
RUN echo "=== dist after tsc ===" && ls -la dist/ 2>/dev/null || echo "Still no dist!"

RUN npm prune --omit=dev

ENV NODE_ENV=production
EXPOSE 3001
CMD ["node", "dist/main.js"]
