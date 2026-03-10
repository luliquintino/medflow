// ─── Auth ────────────────────────────────────────────────────────────────────

export type Gender = "MALE" | "FEMALE" | "NON_BINARY" | "PREFER_NOT_TO_SAY";

export interface User {
  id: string;
  name: string;
  gender?: Gender;
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

export interface FinancialProfile {
  id: string;
  savingsGoal: number;
  averageShiftValue: number;
  minimumMonthlyGoal: number;
  idealMonthlyGoal: number;
}

export interface WorkProfile {
  id: string;
  shiftTypes: ShiftType[];
  maxWeeklyHours?: number;
  preferredRestDays: number[];
  energyCostDiurno: number;
  energyCostNoturno: number;
  energyCost24h: number;
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
  realized?: boolean | null;
  hospitalId?: string;
  hospital?: { id: string; name: string };
  createdAt: string;
}

// ─── Hospitals ──────────────────────────────────────────────────────────────

export interface Hospital {
  id: string;
  name: string;
  city?: string;
  state?: string;
  notes?: string;
  paymentDay?: number;
  templates?: ShiftTemplate[];
  _count?: { templates: number; shifts: number };
  createdAt: string;
}

// ─── Shift Templates ────────────────────────────────────────────────────────

export type ShiftTemplateType = "DIURNO_12H" | "NOTURNO_12H" | "PLANTAO_24H" | "PERSONALIZADO";

export interface ShiftTemplate {
  id: string;
  hospitalId: string;
  name?: string;
  type: ShiftTemplateType;
  durationInHours: number;
  defaultValue: number;
  isNightShift: boolean;
  createdAt: string;
}

export const TEMPLATE_TYPE_LABELS: Record<ShiftTemplateType, string> = {
  DIURNO_12H: "Diurno 12h",
  NOTURNO_12H: "Noturno 12h",
  PLANTAO_24H: "Plantão 24h",
  PERSONALIZADO: "Personalizado",
};

// ─── Optimization ───────────────────────────────────────────────────────────

export interface OptimizationScenarioShift {
  templateId: string;
  hospitalName: string;
  suggestedDate: string;
  durationInHours: number;
  value: number;
  isNightShift: boolean;
}

export interface OptimizationScenario {
  description: string;
  shifts: OptimizationScenarioShift[];
  totalShifts: number;
  totalHours: number;
  totalIncome: number;
  totalExhaustion: number;
  sustainabilityIndex: number;
  riskLevel: RiskLevel;
  optimizationScore: number;
}

export interface OptimizationResult {
  financialGap: number;
  currentRevenue: number;
  targetRevenue: number;
  gapPercentage: number;
  isGoalAlreadyMet: boolean;
  suggestedScenarios: OptimizationScenario[];
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

export interface MonthContext {
  month: number;
  year: number;
  isPast: boolean;
  isCurrent: boolean;
  isFuture: boolean;
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
  simulatedShiftsCount: number;
  unrealizedShiftsCount: number;
  confirmedRevenue: number;
  simulatedRevenue: number;
  unrealizedRevenue: number;
  shifts: Shift[];
  monthContext: MonthContext;
  projections: {
    threeMonths: MonthProjection[];
    sixMonths: MonthProjection[];
  };
  profile: FinancialProfile;
}

export interface FinanceInsight {
  type: "positive" | "warning" | "info" | "action";
  icon: string;
  title: string;
  description: string;
  priority: number;
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

export interface ShiftExhaustion {
  type: string;
  baseCost: number;
  penalties: number;
  totalCost: number;
}

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
  totalExhaustionScore: number;
  averageExhaustionPerShift: number;
  sustainabilityIndex: number;
  shiftExhaustionBreakdown: ShiftExhaustion[];
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
  exhaustionScore: number;
  sustainabilityIndex: number;
  shiftExhaustionBreakdown: ShiftExhaustion[];
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

// ─── Analytics ──────────────────────────────────────────────────────────────

export interface MonthlyIncome {
  label: string;
  year: number;
  month: number;
  revenue: number;
  shiftCount: number;
  totalHours: number;
}

export interface MonthGrowth {
  label: string;
  growthPercent: number;
}

export interface HospitalRank {
  hospitalId: string;
  hospitalName: string;
  totalRevenue: number;
  avgPerShift: number;
  shiftCount: number;
  totalHours: number;
  revenueShare: number;
}

export interface ShiftTypeIncome {
  type: string;
  typeLabel: string;
  totalRevenue: number;
  shiftCount: number;
  totalHours: number;
  avgPerShift: number;
  avgPerHour: number;
}

export interface AnalyticsSummary {
  totalRevenue: number;
  totalShifts: number;
  totalHours: number;
  avgPerShift: number;
  avgPerHour: number;
  bestHospital: string | null;
  overallGrowthPercent: number | null;
}

export interface AnalyticsData {
  monthlyIncome: MonthlyIncome[];
  monthOverMonthGrowth: MonthGrowth[];
  hospitalRanking: HospitalRank[];
  incomeByShiftType: ShiftTypeIncome[];
  summary: AnalyticsSummary;
}

// ─── API ─────────────────────────────────────────────────────────────────────

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  timestamp: string;
}
