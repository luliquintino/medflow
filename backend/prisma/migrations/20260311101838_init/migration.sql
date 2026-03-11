Loaded Prisma config from prisma.config.ts.

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "ShiftType" AS ENUM ('TWELVE_HOURS', 'TWENTY_FOUR_HOURS', 'NIGHT');

-- CreateEnum
CREATE TYPE "ShiftStatus" AS ENUM ('CONFIRMED', 'SIMULATED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "RiskLevel" AS ENUM ('SAFE', 'MODERATE', 'HIGH');

-- CreateEnum
CREATE TYPE "SubscriptionPlan" AS ENUM ('ESSENTIAL', 'PRO');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'TRIALING', 'PAST_DUE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ShiftTemplateType" AS ENUM ('DIURNO_12H', 'NOTURNO_12H', 'PLANTAO_24H', 'PERSONALIZADO');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE', 'NON_BINARY', 'PREFER_NOT_TO_SAY');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "gender" "Gender",
    "crm" TEXT,
    "passwordHash" TEXT,
    "googleId" TEXT,
    "avatarUrl" TEXT,
    "isEmailVerified" BOOLEAN NOT NULL DEFAULT false,
    "emailVerifyToken" TEXT,
    "resetPasswordToken" TEXT,
    "resetPasswordExpiry" TIMESTAMP(3),
    "onboardingCompleted" BOOLEAN NOT NULL DEFAULT false,
    "failedLoginAttempts" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" TIMESTAMP(3),
    "lastFailedLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "financial_profiles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "savingsGoal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "averageShiftValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "minimumMonthlyGoal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "idealMonthlyGoal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "financial_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "work_profiles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "shiftTypes" "ShiftType"[],
    "maxWeeklyHours" INTEGER,
    "preferredRestDays" INTEGER[],
    "maxConsecutiveShifts" INTEGER NOT NULL DEFAULT 3,
    "maxConsecutiveNights" INTEGER NOT NULL DEFAULT 2,
    "energyCostDiurno" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "energyCostNoturno" DOUBLE PRECISION NOT NULL DEFAULT 1.5,
    "energyCost24h" DOUBLE PRECISION NOT NULL DEFAULT 2.5,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "work_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shifts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "hospitalId" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "type" "ShiftType" NOT NULL,
    "hours" INTEGER NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "location" TEXT NOT NULL,
    "notes" TEXT,
    "status" "ShiftStatus" NOT NULL DEFAULT 'CONFIRMED',
    "realized" BOOLEAN,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shifts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hospitals" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "city" TEXT,
    "state" TEXT,
    "notes" TEXT,
    "paymentDay" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hospitals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shift_templates" (
    "id" TEXT NOT NULL,
    "hospitalId" TEXT NOT NULL,
    "name" TEXT,
    "type" "ShiftTemplateType" NOT NULL,
    "durationInHours" INTEGER NOT NULL,
    "defaultValue" DOUBLE PRECISION NOT NULL,
    "isNightShift" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shift_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "risk_history" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "riskLevel" "RiskLevel" NOT NULL,
    "riskScore" DOUBLE PRECISION NOT NULL,
    "triggerRules" TEXT[],
    "recommendation" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "hoursIn5Days" DOUBLE PRECISION NOT NULL,
    "hoursInWeek" DOUBLE PRECISION NOT NULL,
    "consecutiveNights" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "risk_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "plan" "SubscriptionPlan" NOT NULL DEFAULT 'ESSENTIAL',
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wearable_data" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL,
    "hrv" DOUBLE PRECISION,
    "sleepScore" DOUBLE PRECISION,
    "sleepHours" DOUBLE PRECISION,
    "recoveryScore" DOUBLE PRECISION,
    "restingHR" DOUBLE PRECISION,
    "stressLevel" DOUBLE PRECISION,
    "rawData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wearable_data_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_googleId_key" ON "users"("googleId");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_key" ON "refresh_tokens"("token");

-- CreateIndex
CREATE UNIQUE INDEX "financial_profiles_userId_key" ON "financial_profiles"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "work_profiles_userId_key" ON "work_profiles"("userId");

-- CreateIndex
CREATE INDEX "shifts_userId_date_idx" ON "shifts"("userId", "date");

-- CreateIndex
CREATE INDEX "hospitals_userId_idx" ON "hospitals"("userId");

-- CreateIndex
CREATE INDEX "shift_templates_hospitalId_idx" ON "shift_templates"("hospitalId");

-- CreateIndex
CREATE INDEX "risk_history_userId_createdAt_idx" ON "risk_history"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_userId_key" ON "subscriptions"("userId");

-- CreateIndex
CREATE INDEX "wearable_data_userId_recordedAt_idx" ON "wearable_data"("userId", "recordedAt");

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_profiles" ADD CONSTRAINT "financial_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_profiles" ADD CONSTRAINT "work_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shifts" ADD CONSTRAINT "shifts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shifts" ADD CONSTRAINT "shifts_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "hospitals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hospitals" ADD CONSTRAINT "hospitals_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shift_templates" ADD CONSTRAINT "shift_templates_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "hospitals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "risk_history" ADD CONSTRAINT "risk_history_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wearable_data" ADD CONSTRAINT "wearable_data_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

