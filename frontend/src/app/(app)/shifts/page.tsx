"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { api, unwrap } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageSpinner } from "@/components/ui/spinner";
import { ShiftCard } from "@/components/shifts/shift-card";
import { ShiftFormModal } from "@/components/shifts/shift-form-modal";
import { useConfirm } from "@/hooks/use-confirm";
import type { Shift } from "@/types";

export default function ShiftsPage() {
  const t = useTranslations("shifts");
  const qc = useQueryClient();
  const { confirm, ConfirmDialogComponent } = useConfirm();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Shift | null>(null);

  const { data: shifts = [], isLoading } = useQuery({
    queryKey: ["shifts"],
    queryFn: () => api.get("/shifts").then((r) => unwrap<Shift[]>(r)),
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

  const confirmed = shifts.filter((s) => s.status === "CONFIRMED" && s.realized !== false);
  const unrealized = shifts.filter((s) => s.status === "CONFIRMED" && s.realized === false);
  const simulated = shifts.filter((s) => s.status === "SIMULATED");

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
        <Button onClick={() => setShowForm(true)} icon={<Plus className="w-4 h-4" />}>
          {t("newShift")}
        </Button>
      </div>

      {/* Form modal */}
      <ShiftFormModal
        isOpen={showForm}
        onClose={() => { setShowForm(false); setEditing(null); }}
        editingShift={editing}
        onSuccess={() => { setShowForm(false); setEditing(null); }}
      />

      {/* Shifts list */}
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
    </div>
  );
}
