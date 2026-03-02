#!/bin/sh
echo "Running Prisma db push..."
npx prisma db push --accept-data-loss 2>&1
echo "Starting application..."
exec node dist/main.js
