import { PrismaClient, ShiftType, ShiftStatus, SubscriptionStatus, ShiftTemplateType, Gender } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as bcrypt from 'bcryptjs';
import 'dotenv/config';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Seeding database...\n');

  // ── Clean existing data ─────────────────────────────────────────────────
  await prisma.wearableData.deleteMany();
  await prisma.riskHistory.deleteMany();
  await prisma.shift.deleteMany();
  await prisma.shiftTemplate.deleteMany();
  await prisma.hospital.deleteMany();
  await prisma.financialProfile.deleteMany();
  await prisma.workProfile.deleteMany();
  await prisma.subscription.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.user.deleteMany();

  // ── Seed User 1 — Demo Essencial ────────────────────────────────────────
  const passwordHash = await bcrypt.hash('Demo1234!', 10);

  const ana = await prisma.user.create({
    data: {
      name: 'Ana Lima',
      gender: Gender.FEMALE,
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
    },
  });

  await prisma.financialProfile.create({
    data: {
      userId: ana.id,
      savingsGoal: 2000,
      averageShiftValue: 1400,
      minimumMonthlyGoal: 5800,
      idealMonthlyGoal: 7800,
    },
  });

  await prisma.workProfile.create({
    data: {
      userId: ana.id,
      shiftTypes: [ShiftType.TWELVE_DAY, ShiftType.TWENTY_FOUR],
      maxWeeklyHours: 60,
      preferredRestDays: [0, 6], // Sun and Sat
    },
  });

  // ── Ana's Hospitals ─────────────────────────────────────────────────────
  const anaSantaCasa = await prisma.hospital.create({
    data: {
      userId: ana.id,
      name: 'Hospital Santa Casa',
      city: 'São Paulo',
      state: 'SP',
      paymentDay: 10,
    },
  });

  const anaUPA = await prisma.hospital.create({
    data: {
      userId: ana.id,
      name: 'UPA Central',
      city: 'São Paulo',
      state: 'SP',
      paymentDay: 15,
    },
  });

  const anaProntoSocorro = await prisma.hospital.create({
    data: {
      userId: ana.id,
      name: 'Pronto-Socorro Norte',
      city: 'São Paulo',
      state: 'SP',
      paymentDay: 5,
    },
  });

  // ── Ana's Shift Templates ──────────────────────────────────────────────
  await prisma.shiftTemplate.createMany({
    data: [
      {
        hospitalId: anaSantaCasa.id,
        name: 'Diurno 12h',
        type: ShiftTemplateType.DIURNO_12H,
        durationInHours: 12,
        defaultValue: 1400,
        isNightShift: false,
      },
      {
        hospitalId: anaSantaCasa.id,
        name: 'Noturno 12h',
        type: ShiftTemplateType.NOTURNO_12H,
        durationInHours: 12,
        defaultValue: 1600,
        isNightShift: true,
      },
      {
        hospitalId: anaUPA.id,
        name: 'Plantão 24h',
        type: ShiftTemplateType.PLANTAO_24H,
        durationInHours: 24,
        defaultValue: 2200,
        isNightShift: false,
      },
      {
        hospitalId: anaProntoSocorro.id,
        name: 'Noturno 12h',
        type: ShiftTemplateType.NOTURNO_12H,
        durationInHours: 12,
        defaultValue: 1600,
        isNightShift: true,
      },
    ],
  });

  // ── Ana's Shifts (linked to hospitals) ──────────────────────────────────
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  const anaShifts = [
    { day: 3, type: ShiftType.TWELVE_DAY, hours: 12, value: 1400, location: 'Hospital Santa Casa', hospitalId: anaSantaCasa.id },
    { day: 7, type: ShiftType.TWENTY_FOUR, hours: 24, value: 2200, location: 'UPA Central', hospitalId: anaUPA.id },
    { day: 12, type: ShiftType.TWELVE_DAY, hours: 12, value: 1400, location: 'Hospital Santa Casa', hospitalId: anaSantaCasa.id },
    { day: 16, type: ShiftType.TWELVE_NIGHT, hours: 12, value: 1600, location: 'Pronto-Socorro Norte', hospitalId: anaProntoSocorro.id },
    { day: 20, type: ShiftType.TWELVE_DAY, hours: 12, value: 1400, location: 'Hospital Santa Casa', hospitalId: anaSantaCasa.id },
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
          hospitalId: s.hospitalId,
          status: ShiftStatus.CONFIRMED,
        },
      });
    }
  }

  console.log(`✅ User created: ana@demo.com (Essencial) — 3 hospitals, 4 templates`);

  // ── Seed User 2 — Demo Pro ───────────────────────────────────────────────
  const carlos = await prisma.user.create({
    data: {
      name: 'Carlos Souza',
      gender: Gender.MALE,
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
    },
  });

  await prisma.financialProfile.create({
    data: {
      userId: carlos.id,
      savingsGoal: 3000,
      averageShiftValue: 1800,
      minimumMonthlyGoal: 6500,
      idealMonthlyGoal: 9500,
    },
  });

  await prisma.workProfile.create({
    data: {
      userId: carlos.id,
      shiftTypes: [ShiftType.TWELVE_DAY, ShiftType.TWENTY_FOUR, ShiftType.TWELVE_NIGHT],
      maxWeeklyHours: 72,
      preferredRestDays: [0], // Sun
    },
  });

  // ── Carlos's Hospitals ──────────────────────────────────────────────────
  const carlosRegional = await prisma.hospital.create({
    data: {
      userId: carlos.id,
      name: 'Hospital Regional',
      city: 'Campinas',
      state: 'SP',
      paymentDay: 20,
    },
  });

  const carlosUPA = await prisma.hospital.create({
    data: {
      userId: carlos.id,
      name: 'UPA Sul',
      city: 'Campinas',
      state: 'SP',
      paymentDay: 25,
    },
  });

  const carlosProntoSocorro = await prisma.hospital.create({
    data: {
      userId: carlos.id,
      name: 'Pronto-Socorro Leste',
      city: 'Campinas',
      state: 'SP',
      paymentDay: 10,
    },
  });

  // ── Carlos's Shift Templates ────────────────────────────────────────────
  await prisma.shiftTemplate.createMany({
    data: [
      {
        hospitalId: carlosRegional.id,
        name: 'Noturno 12h',
        type: ShiftTemplateType.NOTURNO_12H,
        durationInHours: 12,
        defaultValue: 2000,
        isNightShift: true,
      },
      {
        hospitalId: carlosRegional.id,
        name: 'Plantão 24h',
        type: ShiftTemplateType.PLANTAO_24H,
        durationInHours: 24,
        defaultValue: 3200,
        isNightShift: false,
      },
      {
        hospitalId: carlosRegional.id,
        name: 'Diurno 12h',
        type: ShiftTemplateType.DIURNO_12H,
        durationInHours: 12,
        defaultValue: 1800,
        isNightShift: false,
      },
      {
        hospitalId: carlosUPA.id,
        name: 'Noturno 12h',
        type: ShiftTemplateType.NOTURNO_12H,
        durationInHours: 12,
        defaultValue: 2000,
        isNightShift: true,
      },
      {
        hospitalId: carlosUPA.id,
        name: 'Diurno 12h',
        type: ShiftTemplateType.DIURNO_12H,
        durationInHours: 12,
        defaultValue: 1800,
        isNightShift: false,
      },
    ],
  });

  // ── Carlos's Shifts (heavy schedule, linked to hospitals) ───────────────
  const carlosShifts = [
    { day: 1, type: ShiftType.TWELVE_NIGHT, hours: 12, value: 2000, location: 'Hospital Regional', hospitalId: carlosRegional.id },
    { day: 2, type: ShiftType.TWELVE_NIGHT, hours: 12, value: 2000, location: 'UPA Sul', hospitalId: carlosUPA.id },
    { day: 3, type: ShiftType.TWELVE_NIGHT, hours: 12, value: 2000, location: 'Pronto-Socorro Leste', hospitalId: carlosProntoSocorro.id },
    { day: 5, type: ShiftType.TWENTY_FOUR, hours: 24, value: 3200, location: 'Hospital Regional', hospitalId: carlosRegional.id },
    { day: 9, type: ShiftType.TWELVE_DAY, hours: 12, value: 1800, location: 'UPA Sul', hospitalId: carlosUPA.id },
    { day: 13, type: ShiftType.TWELVE_DAY, hours: 12, value: 1800, location: 'Hospital Regional', hospitalId: carlosRegional.id },
    { day: 18, type: ShiftType.TWENTY_FOUR, hours: 24, value: 3200, location: 'Hospital Regional', hospitalId: carlosRegional.id },
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
          hospitalId: s.hospitalId,
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

  console.log(`✅ User created: carlos@demo.com (Pro) — 3 hospitals, 5 templates`);

  // ── Seed User 3 — Onboarding pendente ────────────────────────────────────
  const julia = await prisma.user.create({
    data: {
      name: 'Julia Martins',
      gender: Gender.FEMALE,
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
    },
  });

  console.log(`✅ User created: julia@demo.com (Trial, onboarding pendente)`);

  // ── Seed User 4 — Demo Pro user ──────────────────────────────────────────
  const demoProHash = await bcrypt.hash('Demo1234!', 10);

  const luiza = await prisma.user.create({
    data: {
      name: 'Marina Silva',
      gender: Gender.FEMALE,
      email: 'marina@demo.com',
      passwordHash: demoProHash,
      onboardingCompleted: true,
      isEmailVerified: true,
    },
  });

  await prisma.subscription.create({
    data: {
      userId: luiza.id,
      plan: 'PRO',
      status: SubscriptionStatus.ACTIVE,
    },
  });

  await prisma.financialProfile.create({
    data: {
      userId: luiza.id,
      savingsGoal: 2500,
      averageShiftValue: 1500,
      minimumMonthlyGoal: 6200,
      idealMonthlyGoal: 8700,
    },
  });

  await prisma.workProfile.create({
    data: {
      userId: luiza.id,
      shiftTypes: [ShiftType.TWELVE_DAY, ShiftType.TWENTY_FOUR, ShiftType.TWELVE_NIGHT],
      maxWeeklyHours: 60,
      preferredRestDays: [0, 6],
    },
  });

  // ── Luiza's Hospitals ─────────────────────────────────────────────────────
  const luizaCopaDor = await prisma.hospital.create({
    data: {
      userId: luiza.id,
      name: 'Hospital Copa D\'Or',
      city: 'Rio de Janeiro',
      state: 'RJ',
      paymentDay: 10,
    },
  });

  const luizaMiguel = await prisma.hospital.create({
    data: {
      userId: luiza.id,
      name: 'Hospital Miguel Couto',
      city: 'Rio de Janeiro',
      state: 'RJ',
      paymentDay: 15,
    },
  });

  // ── Luiza's Shift Templates ───────────────────────────────────────────────
  await prisma.shiftTemplate.createMany({
    data: [
      {
        hospitalId: luizaCopaDor.id,
        name: 'Diurno 12h',
        type: ShiftTemplateType.DIURNO_12H,
        durationInHours: 12,
        defaultValue: 1500,
        isNightShift: false,
      },
      {
        hospitalId: luizaCopaDor.id,
        name: 'Noturno 12h',
        type: ShiftTemplateType.NOTURNO_12H,
        durationInHours: 12,
        defaultValue: 1800,
        isNightShift: true,
      },
      {
        hospitalId: luizaMiguel.id,
        name: 'Plantão 24h',
        type: ShiftTemplateType.PLANTAO_24H,
        durationInHours: 24,
        defaultValue: 2500,
        isNightShift: false,
      },
    ],
  });

  // ── Luiza's Shifts ────────────────────────────────────────────────────────
  const luizaShifts = [
    { day: 2, type: ShiftType.TWELVE_DAY, hours: 12, value: 1500, location: 'Hospital Copa D\'Or', hospitalId: luizaCopaDor.id },
    { day: 8, type: ShiftType.TWENTY_FOUR, hours: 24, value: 2500, location: 'Hospital Miguel Couto', hospitalId: luizaMiguel.id },
    { day: 14, type: ShiftType.TWELVE_NIGHT, hours: 12, value: 1800, location: 'Hospital Copa D\'Or', hospitalId: luizaCopaDor.id },
  ];

  for (const s of luizaShifts) {
    if (s.day <= now.getDate()) {
      const date = new Date(year, month, s.day, 7, 0, 0);
      await prisma.shift.create({
        data: {
          userId: luiza.id,
          date,
          endDate: new Date(date.getTime() + s.hours * 60 * 60 * 1000),
          type: s.type,
          hours: s.hours,
          value: s.value,
          location: s.location,
          hospitalId: s.hospitalId,
          status: ShiftStatus.CONFIRMED,
        },
      });
    }
  }

  console.log(`✅ User created: marina@demo.com (Pro) — 2 hospitals, 3 templates`);

  console.log('\n✨ Seed completed!\n');
  console.log('Demo credentials:');
  console.log('  ana@demo.com       → Demo1234! — Plano Essencial, 3 hospitais');
  console.log('  carlos@demo.com    → Demo1234! — Plano Pro, 3 hospitais, carga alta');
  console.log('  julia@demo.com     → Demo1234! — Trial, onboarding pendente');
  console.log('  marina@demo.com    → Demo1234! — Plano Pro, 2 hospitais\n');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
