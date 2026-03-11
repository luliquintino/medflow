FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/
RUN npm install

COPY . .

RUN npx prisma generate
RUN npm run build
RUN test -f dist/main.js || (echo "ERROR: dist/main.js not found" && ls -la dist/ && exit 1)

RUN npm prune --omit=dev

COPY start.sh ./
RUN chmod +x start.sh

ENV NODE_ENV=production
EXPOSE 3001
CMD ["./start.sh"]
