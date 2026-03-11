#!/bin/sh
echo "Running Prisma migrations..."
npx prisma migrate deploy 2>&1
echo "Starting application..."
exec node dist/main.js
