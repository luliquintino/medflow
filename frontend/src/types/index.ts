// ─── Auth ────────────────────────────────────────────────────────────────────

export interface User {
  id: string;
  name: string;
  email: string;
  crm?: string;
  avatarUrl?: string;
  onboardingCompleted: boolean;
  createdAt: string;
  financialProfile?: FinancialProfile;
  workProfile?: WorkProfile;
  subscription?: Subscription;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

// ─── Financial ───────────────────────────────────────────────────────────────

export interface Installment {
  id: string;
  description: string;
  monthlyValue: number;
  remainingMonths: number;
  totalValue: number;
}

export interface FinancialProfile {
  id: string;
  fixedMonthlyCosts: number;
  savingsGoal: number;
  averageShiftValue: number;
  minimumMonthlyGoal: number;
  idealMonthlyGoal: number;
  installments: Installment[];
}

export interface WorkProfile {
  id: string;
  shiftTypes: ShiftType[];
  maxWeeklyHours?: number;
  preferredRestDays: number[];
}

// ─── Shifts ──────────────────────────────────────────────────────────────────

export type ShiftType = "TWELVE_HOURS" | "TWENTY_FOUR_HOURS" | "NIGHT";
export type ShiftStatus = "CONFIRMED" | "SIMULATED" | "CANCELLED";

export interface Shift {
  id: string;
  date: string;
  endDate: string;
  type: ShiftType;
  hours: number;
  value: number;
  location: string;
  notes?: string;
  status: ShiftStatus;
  createdAt: string;
}

export const SHIFT_TYPE_LABELS: Record<ShiftType, string> = {
  TWELVE_HOURS: "12 horas",
  TWENTY_FOUR_HOURS: "24 horas",
  NIGHT: "Noturno",
};

export const SHIFT_TYPE_HOURS: Record<ShiftType, number> = {
  TWELVE_HOURS: 12,
  TWENTY_FOUR_HOURS: 24,
  NIGHT: 12,
};

// ─── Finance ─────────────────────────────────────────────────────────────────

export interface MonthProjection {
  month: number;
  label: string;
  projectedRevenue: number;
  projectedShifts: number;
  goalMet: boolean;
}

export interface FinanceSummary {
  minimumMonthlyGoal: number;
  idealMonthlyGoal: number;
  minimumShiftsRequired: number;
  idealShiftsRequired: number;
  currentRevenue: number;
  revenueToMinimum: number;
  revenueToIdeal: number;
  progressToMinimum: number;
  progressToIdeal: number;
  isMinimumReached: boolean;
  isIdealReached: boolean;
  confirmedShiftsCount: number;
  projections: {
    threeMonths: MonthProjection[];
    sixMonths: MonthProjection[];
  };
  profile: FinancialProfile & { installmentMonthlyTotal: number };
}

export interface SimulationResult {
  beforeRevenue: number;
  afterRevenue: number;
  revenueGain: number;
  progressToMinimumBefore: number;
  progressToMinimumAfter: number;
  progressToIdealBefore: number;
  progressToIdealAfter: number;
  minimumReachedBefore: boolean;
  minimumReachedAfter: boolean;
  idealReachedBefore: boolean;
  idealReachedAfter: boolean;
  impactPercentage: number;
}

// ─── Workload ────────────────────────────────────────────────────────────────

export interface WorkloadSummary {
  totalHoursThisWeek: number;
  totalHoursThisMonth: number;
  hoursInLast5Days: number;
  consecutiveShifts: number;
  consecutiveNightShifts: number;
  shiftsThisMonth: number;
  shiftsThisWeek: number;
  revenueThisMonth: number;
  averageHoursPerShift: number;
  lastShiftEnd: string | null;
  nextRestDayRecommended: boolean;
}

// ─── Risk ────────────────────────────────────────────────────────────────────

export type RiskLevel = "SAFE" | "MODERATE" | "HIGH";

export interface RiskRule {
  id: string;
  triggered: boolean;
  level: RiskLevel;
  message: string;
}

export interface RiskResult {
  level: RiskLevel;
  score: number;
  triggeredRules: string[];
  recommendation: string;
  rules: RiskRule[];
  workload: WorkloadSummary;
}

// ─── Dashboard ───────────────────────────────────────────────────────────────

export interface DashboardData {
  finance: FinanceSummary | null;
  workload: WorkloadSummary | null;
  risk: RiskResult | null;
  generatedAt: string;
}

// ─── Subscription ────────────────────────────────────────────────────────────

export type SubscriptionPlan = "ESSENTIAL" | "PRO";
export type SubscriptionStatus = "ACTIVE" | "INACTIVE";

export interface Subscription {
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
}

// ─── API ─────────────────────────────────────────────────────────────────────

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  timestamp: string;
}
