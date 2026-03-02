# Single-stage build to avoid COPY issues
FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy source
COPY . .

# Generate Prisma client and build
RUN npx prisma generate
RUN npm run build

# Remove devDependencies after build
RUN npm prune --omit=dev

# Verify dist exists
RUN test -f dist/main.js && echo "dist/main.js exists" || (echo "dist/main.js NOT FOUND" && ls -la dist/ && exit 1)

ENV NODE_ENV=production
EXPOSE 3001

CMD ["node", "dist/main.js"]
