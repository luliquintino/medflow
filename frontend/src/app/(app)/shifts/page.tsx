"use client";
import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { format } from "date-fns";
import { api, unwrap } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageSpinner } from "@/components/ui/spinner";
import { ShiftCard } from "@/components/shifts/shift-card";
import { ShiftFormModal } from "@/components/shifts/shift-form-modal";
import { ShiftCalendar } from "@/components/shifts/calendar/shift-calendar";
import { CalendarDayPanel } from "@/components/shifts/calendar/calendar-day-panel";
import { ViewToggle } from "@/components/shifts/view-toggle";
import { useConfirm } from "@/hooks/use-confirm";
import { getMonthRange, groupShiftsByDay } from "@/lib/calendar";
import type { Shift } from "@/types";

export default function ShiftsPage() {
  const t = useTranslations("shifts");
  const qc = useQueryClient();
  const { confirm, ConfirmDialogComponent } = useConfirm();

  // View state
  const [view, setView] = useState<"calendar" | "list">("calendar");
  const [currentMonth, setCurrentMonth] = useState(() => new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Shift | null>(null);
  const [defaultDate, setDefaultDate] = useState<string>("");

  // Query: when calendar view, scope to month range; list view gets all
  const monthRange = useMemo(() => getMonthRange(currentMonth), [currentMonth]);
  const queryParams = view === "calendar" ? `?from=${monthRange.from}&to=${monthRange.to}` : "";

  const { data: shifts = [], isLoading } = useQuery({
    queryKey: ["shifts", view === "calendar" ? monthRange : "all"],
    queryFn: () => api.get(`/shifts${queryParams}`).then((r) => unwrap<Shift[]>(r)),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/shifts/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["shifts"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      qc.invalidateQueries({ queryKey: ["finance"] });
      qc.invalidateQueries({ queryKey: ["finance-insights"] });
      toast.success(t("toastDeleted"));
    },
  });

  const realizeMutation = useMutation({
    mutationFn: ({ id, realized }: { id: string; realized: boolean }) =>
      api.patch(`/shifts/${id}`, { realized }),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["shifts"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      qc.invalidateQueries({ queryKey: ["finance"] });
      qc.invalidateQueries({ queryKey: ["finance-insights"] });
      toast.success(variables.realized ? t("toastRealized") : t("toastUnrealized"));
    },
  });

  // List view helpers
  const confirmed = shifts.filter((s) => s.status === "CONFIRMED" && s.realized !== false);
  const unrealized = shifts.filter((s) => s.status === "CONFIRMED" && s.realized === false);
  const simulated = shifts.filter((s) => s.status === "SIMULATED");

  // Day panel helpers
  const shiftsByDay = useMemo(() => groupShiftsByDay(shifts), [shifts]);
  const selectedDayShifts = selectedDay
    ? shiftsByDay.get(format(selectedDay, "yyyy-MM-dd")) || []
    : [];

  function handleDayClick(date: Date) {
    setSelectedDay(date);
  }

  function handleAddShiftFromCalendar(date: Date) {
    // Pre-fill date as datetime-local format: YYYY-MM-DDT08:00
    setDefaultDate(`${format(date, "yyyy-MM-dd")}T08:00`);
    setEditing(null);
    setShowForm(true);
    setSelectedDay(null);
  }

  function handleEditShift(shift: Shift) {
    setEditing(shift);
    setDefaultDate("");
    setShowForm(true);
    setSelectedDay(null);
  }

  async function handleDeleteShift(shift: Shift) {
    setSelectedDay(null);
    const ok = await confirm({
      title: t("confirmDeleteTitle"),
      message: t("confirmDeleteMessage"),
      confirmLabel: t("confirmDeleteLabel"),
      variant: "danger",
    });
    if (ok) deleteMutation.mutate(shift.id);
  }

  if (isLoading) return <PageSpinner />;

  return (
    <div className="max-w-3xl space-y-6">
      {ConfirmDialogComponent}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-800">{t("title")}</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {t("summary", { confirmed: confirmed.length, simulated: simulated.length })}
            {unrealized.length > 0 && (
              <span className="text-red-500"> · {t("unrealized", { count: unrealized.length })}</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ViewToggle view={view} onChange={setView} />
          <Button onClick={() => { setDefaultDate(""); setEditing(null); setShowForm(true); }} icon={<Plus className="w-4 h-4" />}>
            {t("newShift")}
          </Button>
        </div>
      </div>

      {/* Form modal */}
      <ShiftFormModal
        isOpen={showForm}
        onClose={() => { setShowForm(false); setEditing(null); setDefaultDate(""); }}
        editingShift={editing}
        defaultDate={defaultDate}
        onSuccess={() => { setShowForm(false); setEditing(null); setDefaultDate(""); }}
      />

      {/* Calendar View */}
      {view === "calendar" && (
        <>
          <ShiftCalendar
            shifts={shifts}
            currentMonth={currentMonth}
            onMonthChange={setCurrentMonth}
            onDayClick={handleDayClick}
            selectedDay={selectedDay}
          />

          {selectedDay && (
            <CalendarDayPanel
              date={selectedDay}
              shifts={selectedDayShifts}
              onClose={() => setSelectedDay(null)}
              onAddShift={handleAddShiftFromCalendar}
              onEditShift={handleEditShift}
              onDeleteShift={handleDeleteShift}
              onRealize={(shiftId, realized) => realizeMutation.mutate({ id: shiftId, realized })}
            />
          )}
        </>
      )}

      {/* List View */}
      {view === "list" && (
        <>
          {shifts.length === 0 ? (
            <Card className="text-center py-12">
              <p className="text-gray-500 mb-3">{t("emptyState")}</p>
              <Button onClick={() => setShowForm(true)} icon={<Plus className="w-4 h-4" />}>
                {t("addFirstShift")}
              </Button>
            </Card>
          ) : (
            <div className="space-y-3">
              {[...confirmed, ...unrealized, ...simulated].sort((a, b) =>
                new Date(b.date).getTime() - new Date(a.date).getTime()
              ).map((shift) => (
                <ShiftCard
                  key={shift.id}
                  shift={shift}
                  onEdit={() => { setEditing(shift); setShowForm(true); }}
                  onDelete={async () => {
                    const ok = await confirm({
                      title: t("confirmDeleteTitle"),
                      message: t("confirmDeleteMessage"),
                      confirmLabel: t("confirmDeleteLabel"),
                      variant: "danger",
                    });
                    if (ok) deleteMutation.mutate(shift.id);
                  }}
                  onRealize={(shiftId, realized) => realizeMutation.mutate({ id: shiftId, realized })}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
