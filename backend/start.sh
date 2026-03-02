#!/bin/sh
echo "Running Prisma db push..."
npx prisma db push --skip-generate 2>&1
echo "Starting application..."
exec node dist/main.js
