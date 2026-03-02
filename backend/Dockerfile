FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

RUN npx prisma generate
RUN npm run build
RUN test -f dist/main.js || (echo "ERROR: dist/main.js not found" && ls -la dist/ && exit 1)

RUN npm prune --omit=dev

ENV NODE_ENV=production
EXPOSE 3001
CMD ["node", "dist/main.js"]
