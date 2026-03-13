"use client";
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { api, unwrap } from "@/lib/api";
import { PageSpinner } from "@/components/ui/spinner";
import { Card } from "@/components/ui/card";
import { HistoryFilters } from "./_components/history-filters";
import { HistorySummary } from "./_components/history-summary";
import { HistoryTimeline } from "./_components/history-timeline";
import type { Shift, Hospital } from "@/types";

interface HistoryResponse {
  shifts: Shift[];
  monthlySummary: Array<{
    month: number;
    year: number;
    totalHours: number;
    totalRevenue: number;
    shiftCount: number;
  }>;
}

export default function ShiftHistoryPage() {
  const t = useTranslations("shiftHistory");

  const [month, setMonth] = useState("");
  const [year, setYear] = useState("");
  const [hospitalId, setHospitalId] = useState("");
  const [type, setType] = useState("");

  // Build query params
  const queryParams = useMemo(() => {
    const params = new URLSearchParams();
    if (month) params.set("month", month);
    if (year) params.set("year", year);
    if (hospitalId) params.set("hospitalId", hospitalId);
    if (type) params.set("type", type);
    return params.toString();
  }, [month, year, hospitalId, type]);

  const { data, isLoading } = useQuery({
    queryKey: ["shift-history", queryParams],
    queryFn: () => api.get(`/shifts/history?${queryParams}`).then((r) => unwrap<HistoryResponse>(r)),
  });

  const { data: hospitals = [] } = useQuery({
    queryKey: ["hospitals"],
    queryFn: () => api.get("/hospitals").then((r) => unwrap<Hospital[]>(r)),
  });

  // Generate available years (current year back to 5 years)
  const currentYear = new Date().getFullYear();
  const availableYears = Array.from({ length: 6 }, (_, i) => currentYear - i);

  if (isLoading) return <PageSpinner />;

  const shifts = data?.shifts || [];
  const monthlySummary = data?.monthlySummary || [];

  return (
    <div className="max-w-3xl space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-gray-800">{t("title")}</h2>
        <p className="text-sm text-gray-500 mt-0.5">{t("subtitle")}</p>
      </div>

      {/* Filters */}
      <HistoryFilters
        month={month}
        year={year}
        hospitalId={hospitalId}
        type={type}
        onMonthChange={setMonth}
        onYearChange={setYear}
        onHospitalChange={setHospitalId}
        onTypeChange={setType}
        hospitals={hospitals}
        availableYears={availableYears}
      />

      {/* Summary */}
      {monthlySummary.length > 0 && (
        <HistorySummary monthlySummary={monthlySummary} />
      )}

      {/* Timeline */}
      {shifts.length === 0 ? (
        <Card className="text-center py-12">
          <p className="text-gray-500">{t("emptyState")}</p>
        </Card>
      ) : (
        <HistoryTimeline shifts={shifts} />
      )}
    </div>
  );
}
