"use client";
import { useTranslations } from "next-intl";
import type { Hospital, ShiftType } from "@/types";
import { SHIFT_TYPE_LABELS } from "@/types";

interface HistoryFiltersProps {
  month: string;
  year: string;
  hospitalId: string;
  type: string;
  onMonthChange: (v: string) => void;
  onYearChange: (v: string) => void;
  onHospitalChange: (v: string) => void;
  onTypeChange: (v: string) => void;
  hospitals: Hospital[];
  availableYears: number[];
}

const MONTHS = [
  { value: "1", label: "Jan" }, { value: "2", label: "Fev" },
  { value: "3", label: "Mar" }, { value: "4", label: "Abr" },
  { value: "5", label: "Mai" }, { value: "6", label: "Jun" },
  { value: "7", label: "Jul" }, { value: "8", label: "Ago" },
  { value: "9", label: "Set" }, { value: "10", label: "Out" },
  { value: "11", label: "Nov" }, { value: "12", label: "Dez" },
];

export function HistoryFilters({
  month, year, hospitalId, type,
  onMonthChange, onYearChange, onHospitalChange, onTypeChange,
  hospitals, availableYears,
}: HistoryFiltersProps) {
  const t = useTranslations("shiftHistory");

  const selectClass = "rounded-xl border border-cream-300 bg-white px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-moss-300 focus:border-moss-400";

  return (
    <div className="flex flex-wrap gap-2">
      {/* Month */}
      <select value={month} onChange={(e) => onMonthChange(e.target.value)} className={selectClass}>
        <option value="">{t("allMonths")}</option>
        {MONTHS.map((m) => (
          <option key={m.value} value={m.value}>{m.label}</option>
        ))}
      </select>

      {/* Year */}
      <select value={year} onChange={(e) => onYearChange(e.target.value)} className={selectClass}>
        <option value="">{t("allYears")}</option>
        {availableYears.map((y) => (
          <option key={y} value={String(y)}>{y}</option>
        ))}
      </select>

      {/* Hospital */}
      {hospitals.length > 0 && (
        <select value={hospitalId} onChange={(e) => onHospitalChange(e.target.value)} className={selectClass}>
          <option value="">{t("allHospitals")}</option>
          {hospitals.map((h) => (
            <option key={h.id} value={h.id}>{h.name}</option>
          ))}
        </select>
      )}

      {/* Shift type */}
      <select value={type} onChange={(e) => onTypeChange(e.target.value)} className={selectClass}>
        <option value="">{t("allTypes")}</option>
        {(Object.keys(SHIFT_TYPE_LABELS) as ShiftType[]).map((tp) => (
          <option key={tp} value={tp}>{SHIFT_TYPE_LABELS[tp]}</option>
        ))}
      </select>

      {/* Clear */}
      {(month || year || hospitalId || type) && (
        <button
          onClick={() => { onMonthChange(""); onYearChange(""); onHospitalChange(""); onTypeChange(""); }}
          className="text-xs text-moss-600 hover:text-moss-800 px-2 py-2"
        >
          {t("clearFilters")}
        </button>
      )}
    </div>
  );
}
