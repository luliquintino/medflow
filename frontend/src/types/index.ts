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
  energyCost24hInvertido: number;
  maxNightShifts: number;
}

// ─── Shifts ──────────────────────────────────────────────────────────────────

export type ShiftType = "TWELVE_DAY" | "TWELVE_NIGHT" | "TWENTY_FOUR" | "TWENTY_FOUR_INVERTED";
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

export type ShiftTemplateType = "DIURNO_12H" | "NOTURNO_12H" | "PLANTAO_24H" | "PLANTAO_24H_INV" | "PERSONALIZADO";

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
  DIURNO_12H: "12h Diurno",
  NOTURNO_12H: "12h Noturno",
  PLANTAO_24H: "24h",
  PLANTAO_24H_INV: "24h Invertido",
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
  riskLevel: FlowScore;
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
  TWELVE_DAY: "12h Diurno",
  TWELVE_NIGHT: "12h Noturno",
  TWENTY_FOUR: "24h",
  TWENTY_FOUR_INVERTED: "24h Invertido",
};

export const SHIFT_TYPE_HOURS: Record<ShiftType, number> = {
  TWELVE_DAY: 12,
  TWELVE_NIGHT: 12,
  TWENTY_FOUR: 24,
  TWENTY_FOUR_INVERTED: 24,
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

// ─── Risk / FlowScore ────────────────────────────────────────────────────────

export type FlowScore = "PILAR_SUSTENTAVEL" | "PILAR_CARGA_ELEVADA" | "PILAR_RISCO_FADIGA" | "PILAR_ALTO_RISCO";

/** @deprecated Use FlowScore instead */
export type RiskLevel = FlowScore;

export interface RiskRule {
  id: string;
  triggered: boolean;
  level: FlowScore;
  message: string;
}

export interface EvidenceCitation {
  factor: string;
  citation: string;
  summary: string;
}

export interface RiskResult {
  level: FlowScore;
  score: number;
  triggeredRules: string[];
  recommendation: string;
  rules: RiskRule[];
  exhaustionScore: number;
  sustainabilityIndex: number;
  shiftExhaustionBreakdown: ShiftExhaustion[];
  workload: WorkloadSummary;
  insights: string[];
  evidence: EvidenceCitation[];
}

export interface WorkloadMetrics {
  hours7d: number;
  hours14d: number;
  hours28d: number;
  avgWeeklyHours28d: number;
  nightShifts7d: number;
  longShifts7d: number;
  consecutiveShifts: number;
  fatigueScore7d: number;
  fatigueScore14d: number;
  fatigueScore28d: number;
}

export interface RecoveryDebt {
  hoursSinceLastShift: number | null;
  restQuality: "GOOD" | "PARTIAL" | "POOR";
  recoveryDebtHours: number;
  isRecovered: boolean;
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

// ─── Scenario Simulation ─────────────────────────────────────────────────────

export interface MonthBreakdown {
  month: string;
  year: number;
  monthIndex: number;
  currentRevenue: number;
  addedRevenue: number;
  totalRevenue: number;
  shiftsCount: number;
  hoursWorked: number;
  minimumGoalProgress: number;
  idealGoalProgress: number;
  minimumGoalGap: number;
  idealGoalGap: number;
  suggestedExtraShifts: number;
}

export interface ScenarioResult {
  monthlyBreakdown: MonthBreakdown[];
  summary: {
    totalAddedRevenue: number;
    avgMonthlyIncome: number;
    monthsToMinGoal: number | null;
    monthsToIdealGoal: number | null;
  };
}

// ─── Hospital ROI ────────────────────────────────────────────────────────────

export interface HospitalRoi {
  hospitalId: string;
  hospitalName: string;
  totalRevenue: number;
  totalHours: number;
  revenuePerHour: number;
  avgShiftValue: number;
  shiftCount: number;
  reliabilityScore: number;
  hospitalScore: number;
  hospitalTier: "ouro" | "prata" | "bronze";
  insight: string;
}

// ─── Benchmarking ────────────────────────────────────────────────────────────

export interface PeriodSnapshot {
  revenue: number;
  hours: number;
  shiftsCount: number;
  revenuePerHour: number;
}

export type Trend = "rising" | "stable" | "falling";

export interface BenchmarkingData {
  currentMonth: PeriodSnapshot;
  previousMonth: PeriodSnapshot;
  threeMonthAvg: PeriodSnapshot;
  sixMonthAvg: PeriodSnapshot;
  vsLastMonth: { revenue: number; hours: number; revenuePerHour: number };
  vsThreeMonthAvg: { revenue: number; hours: number; revenuePerHour: number };
  vsMinimumGoal: { gap: number; progress: number; onTrack: boolean };
  vsIdealGoal: { gap: number; progress: number; onTrack: boolean };
  trends: { revenuePerHour: Trend; workload: Trend; goalAttainment: Trend };
}

// ─── Strategic Insights ──────────────────────────────────────────────────────

export interface StrategicInsight {
  type: "opportunity" | "warning" | "achievement" | "strategy";
  priority: number;
  title: string;
  description: string;
  metric?: { value: number; unit: string; trend: Trend };
}

// ─── API ─────────────────────────────────────────────────────────────────────

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  timestamp: string;
}
