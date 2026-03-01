/**
 * WearableAdapter
 * Abstract layer for future wearable integrations.
 * Currently returns mock data.
 *
 * Future integrations:
 * - Apple Health (HealthKit via iOS app)
 * - Garmin Connect API
 * - Oura Ring API
 * - Whoop API
 */

export interface HRVData {
  value: number;        // milliseconds
  recordedAt: Date;
  source: string;
}

export interface SleepData {
  totalHours: number;
  score: number;        // 0–100
  deepSleepHours: number;
  remSleepHours: number;
  awakenings: number;
  recordedAt: Date;
  source: string;
}

export interface RecoveryData {
  score: number;        // 0–100
  restingHR: number;
  stressLevel: number;  // 0–100
  recordedAt: Date;
  source: string;
}

export abstract class WearableAdapter {
  abstract getHRV(userId: string): Promise<HRVData>;
  abstract getSleepData(userId: string): Promise<SleepData>;
  abstract getRecoveryScore(userId: string): Promise<RecoveryData>;
}

// ─── Mock Adapter (default for non-Pro or unconnected) ────────────────────

export class MockWearableAdapter extends WearableAdapter {
  async getHRV(_userId: string): Promise<HRVData> {
    return {
      value: 45 + Math.random() * 30, // 45–75ms typical range
      recordedAt: new Date(),
      source: 'mock',
    };
  }

  async getSleepData(_userId: string): Promise<SleepData> {
    return {
      totalHours: 6 + Math.random() * 2,
      score: 60 + Math.round(Math.random() * 35),
      deepSleepHours: 1 + Math.random(),
      remSleepHours: 1.5 + Math.random(),
      awakenings: Math.floor(Math.random() * 5),
      recordedAt: new Date(),
      source: 'mock',
    };
  }

  async getRecoveryScore(_userId: string): Promise<RecoveryData> {
    return {
      score: 50 + Math.round(Math.random() * 45),
      restingHR: 55 + Math.round(Math.random() * 20),
      stressLevel: 20 + Math.round(Math.random() * 60),
      recordedAt: new Date(),
      source: 'mock',
    };
  }
}

// ─── Factory ──────────────────────────────────────────────────────────────

export type WearableProvider = 'mock' | 'apple_health' | 'garmin' | 'oura' | 'whoop';

export function createWearableAdapter(provider: WearableProvider): WearableAdapter {
  switch (provider) {
    case 'apple_health':
    case 'garmin':
    case 'oura':
    case 'whoop':
      // TODO: return real adapters when implemented
      return new MockWearableAdapter();
    case 'mock':
    default:
      return new MockWearableAdapter();
  }
}
