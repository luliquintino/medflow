import { PrismaClient, ShiftType, ShiftStatus, SubscriptionStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...\n');

  // ── Clean existing data ─────────────────────────────────────────────────
  await prisma.wearableData.deleteMany();
  await prisma.riskHistory.deleteMany();
  await prisma.shift.deleteMany();
  await prisma.installment.deleteMany();
  await prisma.financialProfile.deleteMany();
  await prisma.workProfile.deleteMany();
  await prisma.subscription.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.user.deleteMany();

  // ── Seed User 1 — Demo Essencial ────────────────────────────────────────
  const passwordHash = await bcrypt.hash('Demo1234!', 10);

  const ana = await prisma.user.create({
    data: {
      name: 'Dra. Ana Lima',
      email: 'ana@demo.com',
      passwordHash,
      onboardingCompleted: true,
      isEmailVerified: true,
    },
  });

  await prisma.subscription.create({
    data: {
      userId: ana.id,
      plan: 'ESSENTIAL',
      status: SubscriptionStatus.ACTIVE,
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  });

  const anaFP = await prisma.financialProfile.create({
    data: {
      userId: ana.id,
      fixedMonthlyCosts: 4500,
      savingsGoal: 2000,
      averageShiftValue: 1400,
      minimumMonthlyGoal: 5800,  // 4500 + 1300 installments
      idealMonthlyGoal: 7800,    // 5800 + 2000 savings
    },
  });

  await prisma.installment.createMany({
    data: [
      {
        financialProfileId: anaFP.id,
        description: 'Financiamento carro',
        monthlyValue: 900,
        remainingMonths: 24,
        totalValue: 21600,
      },
      {
        financialProfileId: anaFP.id,
        description: 'Especialização médica',
        monthlyValue: 400,
        remainingMonths: 12,
        totalValue: 4800,
      },
    ],
  });

  await prisma.workProfile.create({
    data: {
      userId: ana.id,
      shiftTypes: [ShiftType.TWELVE_HOURS, ShiftType.TWENTY_FOUR_HOURS],
      maxWeeklyHours: 60,
      preferredRestDays: [0, 6], // Sun and Sat
    },
  });

  // Create shifts for this month
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  const anaShifts = [
    { day: 3, type: ShiftType.TWELVE_HOURS, hours: 12, value: 1400, location: 'Hospital Santa Casa' },
    { day: 7, type: ShiftType.TWENTY_FOUR_HOURS, hours: 24, value: 2200, location: 'UPA Central' },
    { day: 12, type: ShiftType.TWELVE_HOURS, hours: 12, value: 1400, location: 'Hospital Santa Casa' },
    { day: 16, type: ShiftType.NIGHT, hours: 12, value: 1600, location: 'Pronto-Socorro Norte' },
    { day: 20, type: ShiftType.TWELVE_HOURS, hours: 12, value: 1400, location: 'Hospital Santa Casa' },
  ];

  for (const s of anaShifts) {
    if (s.day <= now.getDate()) {
      const date = new Date(year, month, s.day, 7, 0, 0);
      await prisma.shift.create({
        data: {
          userId: ana.id,
          date,
          endDate: new Date(date.getTime() + s.hours * 60 * 60 * 1000),
          type: s.type,
          hours: s.hours,
          value: s.value,
          location: s.location,
          status: ShiftStatus.CONFIRMED,
        },
      });
    }
  }

  console.log(`✅ User created: ana@demo.com (Essencial)`);

  // ── Seed User 2 — Demo Pro ───────────────────────────────────────────────
  const carlos = await prisma.user.create({
    data: {
      name: 'Dr. Carlos Souza',
      email: 'carlos@demo.com',
      passwordHash,
      onboardingCompleted: true,
      isEmailVerified: true,
    },
  });

  await prisma.subscription.create({
    data: {
      userId: carlos.id,
      plan: 'PRO',
      status: SubscriptionStatus.ACTIVE,
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  });

  const carlosFP = await prisma.financialProfile.create({
    data: {
      userId: carlos.id,
      fixedMonthlyCosts: 6000,
      savingsGoal: 3000,
      averageShiftValue: 1800,
      minimumMonthlyGoal: 6500,
      idealMonthlyGoal: 9500,
    },
  });

  await prisma.installment.createMany({
    data: [
      {
        financialProfileId: carlosFP.id,
        description: 'Apartamento',
        monthlyValue: 500,
        remainingMonths: 180,
        totalValue: 90000,
      },
    ],
  });

  await prisma.workProfile.create({
    data: {
      userId: carlos.id,
      shiftTypes: [ShiftType.TWELVE_HOURS, ShiftType.TWENTY_FOUR_HOURS, ShiftType.NIGHT],
      maxWeeklyHours: 72,
      preferredRestDays: [0], // Sun
    },
  });

  // Carlos has heavy schedule to show HIGH risk
  const carlosShifts = [
    { day: 1, type: ShiftType.NIGHT, hours: 12, value: 2000, location: 'Hospital Regional' },
    { day: 2, type: ShiftType.NIGHT, hours: 12, value: 2000, location: 'UPA Sul' },
    { day: 3, type: ShiftType.NIGHT, hours: 12, value: 2000, location: 'Pronto-Socorro Leste' },
    { day: 5, type: ShiftType.TWENTY_FOUR_HOURS, hours: 24, value: 3200, location: 'Hospital Regional' },
    { day: 9, type: ShiftType.TWELVE_HOURS, hours: 12, value: 1800, location: 'UPA Sul' },
    { day: 13, type: ShiftType.TWELVE_HOURS, hours: 12, value: 1800, location: 'Hospital Regional' },
    { day: 18, type: ShiftType.TWENTY_FOUR_HOURS, hours: 24, value: 3200, location: 'Hospital Regional' },
  ];

  for (const s of carlosShifts) {
    if (s.day <= now.getDate()) {
      const date = new Date(year, month, s.day, 19, 0, 0);
      await prisma.shift.create({
        data: {
          userId: carlos.id,
          date,
          endDate: new Date(date.getTime() + s.hours * 60 * 60 * 1000),
          type: s.type,
          hours: s.hours,
          value: s.value,
          location: s.location,
          status: ShiftStatus.CONFIRMED,
        },
      });
    }
  }

  // Wearable data for Pro user
  await prisma.wearableData.create({
    data: {
      userId: carlos.id,
      source: 'mock',
      recordedAt: new Date(),
      hrv: 38,
      sleepScore: 55,
      sleepHours: 5.5,
      recoveryScore: 42,
      restingHR: 72,
      stressLevel: 75,
    },
  });

  console.log(`✅ User created: carlos@demo.com (Pro)`);

  // ── Seed User 3 — Onboarding pendente ────────────────────────────────────
  const julia = await prisma.user.create({
    data: {
      name: 'Dra. Julia Martins',
      email: 'julia@demo.com',
      passwordHash,
      onboardingCompleted: false,
      isEmailVerified: true,
    },
  });

  await prisma.subscription.create({
    data: {
      userId: julia.id,
      plan: 'ESSENTIAL',
      status: SubscriptionStatus.TRIALING,
      trialEndAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    },
  });

  console.log(`✅ User created: julia@demo.com (Trial, onboarding pendente)`);

  console.log('\n✨ Seed completed!\n');
  console.log('Demo credentials (password: Demo1234!):');
  console.log('  ana@demo.com    → Plano Essencial, mês em andamento');
  console.log('  carlos@demo.com → Plano Pro, carga alta');
  console.log('  julia@demo.com  → Trial, onboarding pendente\n');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
