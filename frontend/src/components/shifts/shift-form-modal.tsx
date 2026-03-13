"use client";
import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { X, BarChart3, AlertTriangle } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { clsx } from "clsx";
import { track } from "@vercel/analytics";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { api, unwrap, getErrorMessage } from "@/lib/api";
import { formatCurrency } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Shift, ShiftType, Hospital, ShiftTemplate, ShiftTemplateType } from "@/types";
import { SHIFT_TYPE_LABELS, SHIFT_TYPE_HOURS, TEMPLATE_TYPE_LABELS } from "@/types";

const TEMPLATE_TO_SHIFT_TYPE: Record<ShiftTemplateType, ShiftType> = {
  DIURNO_12H: "TWELVE_DAY",
  NOTURNO_12H: "TWELVE_NIGHT",
  PLANTAO_24H: "TWENTY_FOUR",
  PLANTAO_24H_INV: "TWENTY_FOUR_INVERTED",
  PERSONALIZADO: "TWELVE_DAY",
};

interface ShiftFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingShift?: Shift | null;
  defaultDate?: string;
  onSuccess?: () => void;
}

export function ShiftFormModal({ isOpen, onClose, editingShift, defaultDate, onSuccess }: ShiftFormModalProps) {
  const t = useTranslations("shiftForm");
  const tv = useTranslations("validation");
  const qc = useQueryClient();
  const [error, setError] = useState("");
  const [selectedHospitalId, setSelectedHospitalId] = useState("");
  const [templates, setTemplates] = useState<ShiftTemplate[]>([]);

  const schema = useMemo(
    () =>
      z.object({
        date: z.string().min(1, tv("dateRequired")),
        type: z.enum(["TWELVE_DAY", "TWELVE_NIGHT", "TWENTY_FOUR", "TWENTY_FOUR_INVERTED"]),
        value: z.coerce.number().min(0),
        location: z.string().min(1, tv("locationRequired")),
        notes: z.string().optional(),
        status: z.enum(["CONFIRMED", "SIMULATED"]).default("CONFIRMED"),
        hospitalId: z.string().optional(),
      }),
    [tv]
  );
  type FormData = z.infer<typeof schema>;

  const { data: hospitals = [] } = useQuery({
    queryKey: ["hospitals"],
    queryFn: () => api.get("/hospitals").then((r) => unwrap<Hospital[]>(r)),
    enabled: isOpen,
  });

  const { register, handleSubmit, reset, setValue, watch, formState: { errors, isSubmitting } } =
    useForm<FormData>({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      resolver: zodResolver(schema) as any,
      defaultValues: { type: "TWELVE_DAY", status: "CONFIRMED" },
    });

  const shiftType = watch("type") as ShiftType;
  const watchDate = watch("date");

  // Conflict check state
  const [conflicts, setConflicts] = useState<{
    overlaps: Array<{ location: string; date: string; endDate: string }>;
    restWarnings: Array<{ type: string; gapHours: number; adjacentShiftLocation: string }>;
  } | null>(null);
  const conflictTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced conflict check when date + type change
  const checkConflicts = useCallback(async (date: string, type: ShiftType) => {
    if (!date) { setConflicts(null); return; }
    const hours = SHIFT_TYPE_HOURS[type];
    try {
      const res = await api.post("/shifts/check-conflicts", {
        date: new Date(date).toISOString(),
        hours,
        ...(editingShift ? { excludeShiftId: editingShift.id } : {}),
      });
      const data = unwrap<{
        overlaps: Array<{ location: string; date: string; endDate: string }>;
        restWarnings: Array<{ type: string; gapHours: number; adjacentShiftLocation: string }>;
      }>(res);
      setConflicts(data);
    } catch {
      setConflicts(null);
    }
  }, [editingShift]);

  useEffect(() => {
    if (!isOpen || !watchDate) { setConflicts(null); return; }
    if (conflictTimerRef.current) clearTimeout(conflictTimerRef.current);
    conflictTimerRef.current = setTimeout(() => {
      checkConflicts(watchDate, shiftType);
    }, 500);
    return () => { if (conflictTimerRef.current) clearTimeout(conflictTimerRef.current); };
  }, [watchDate, shiftType, isOpen, checkConflicts]);

  // Pre-fill when editing or when defaultDate changes
  useEffect(() => {
    if (!isOpen) return;
    if (editingShift) {
      setSelectedHospitalId(editingShift.hospitalId || "");
      reset({
        date: editingShift.date.slice(0, 16),
        type: editingShift.type,
        value: editingShift.value,
        location: editingShift.location,
        notes: editingShift.notes || "",
        status: editingShift.status as FormData["status"],
        hospitalId: editingShift.hospitalId || undefined,
      });
      if (editingShift.hospitalId) {
        api.get(`/hospitals/${editingShift.hospitalId}/templates`)
          .then((r) => setTemplates(unwrap<ShiftTemplate[]>(r)))
          .catch(() => setTemplates([]));
      }
    } else {
      reset({
        date: defaultDate || "",
        type: "TWELVE_DAY",
        value: 0,
        location: "",
        notes: "",
        status: "CONFIRMED",
        hospitalId: undefined,
      });
      setSelectedHospitalId("");
      setTemplates([]);
    }
  }, [isOpen, editingShift, defaultDate, reset]);

  async function onHospitalChange(hospitalId: string) {
    setSelectedHospitalId(hospitalId);
    setValue("hospitalId", hospitalId || undefined);
    if (hospitalId) {
      const hospital = hospitals.find((h) => h.id === hospitalId);
      if (hospital) setValue("location", hospital.name);
      try {
        const tpls = await api.get(`/hospitals/${hospitalId}/templates`).then((r) => unwrap<ShiftTemplate[]>(r));
        setTemplates(tpls);
      } catch { setTemplates([]); }
    } else {
      setTemplates([]);
    }
  }

  function onTemplateSelect(template: ShiftTemplate) {
    setValue("type", TEMPLATE_TO_SHIFT_TYPE[template.type]);
    setValue("value", template.defaultValue);
  }

  const saveMutation = useMutation({
    mutationFn: (data: FormData) => {
      const hours = SHIFT_TYPE_HOURS[data.type];
      const payload = { ...data, hours };
      if (editingShift) return api.patch(`/shifts/${editingShift.id}`, payload);
      return api.post("/shifts", payload);
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["shifts"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      qc.invalidateQueries({ queryKey: ["finance"] });
      qc.invalidateQueries({ queryKey: ["finance-insights"] });
      if (!editingShift) track("shift_created", { type: variables.type, status: variables.status });
      onSuccess?.();
      handleClose();
    },
    onError: (e) => setError(getErrorMessage(e)),
  });

  function handleClose() {
    setSelectedHospitalId("");
    setTemplates([]);
    setError("");
    onClose();
  }

  const dialogRef = useRef<HTMLDivElement>(null);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") handleClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Focus trap
  useEffect(() => {
    if (!isOpen || !dialogRef.current) return;
    const dialog = dialogRef.current;
    const focusableSelector = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
    const firstFocusable = dialog.querySelector<HTMLElement>(focusableSelector);
    firstFocusable?.focus();

    function trapFocus(e: KeyboardEvent) {
      if (e.key !== "Tab") return;
      const focusables = dialog.querySelectorAll<HTMLElement>(focusableSelector);
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last.focus(); }
      } else {
        if (document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    }
    dialog.addEventListener("keydown", trapFocus);
    return () => dialog.removeEventListener("keydown", trapFocus);
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center px-4"
      onClick={handleClose}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="shift-form-title"
        className="bg-cream-50 rounded-3xl shadow-float border border-cream-200 p-8 w-full max-w-md max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h3 id="shift-form-title" className="text-lg font-semibold text-gray-800">
            {editingShift ? t("titleEdit") : t("titleNew")}
          </h3>
          <button onClick={handleClose} className="text-gray-400 hover:text-gray-600" aria-label="Fechar">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit((d) => saveMutation.mutate(d))} className="space-y-4">
          {/* Hospital selector */}
          {hospitals.length > 0 && (
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">{t("hospitalLabel")}</label>
              <select
                value={selectedHospitalId}
                onChange={(e) => onHospitalChange(e.target.value)}
                className="w-full rounded-xl border border-cream-300 bg-white px-3 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-moss-300 focus:border-moss-400"
              >
                <option value="">{t("hospitalPlaceholder")}</option>
                {hospitals.map((h) => (
                  <option key={h.id} value={h.id}>{h.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Template quick-select */}
          {templates.length > 0 && (
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">{t("templateLabel")}</label>
              <div className="grid grid-cols-2 gap-2">
                {templates.map((tpl) => (
                  <button
                    key={tpl.id}
                    type="button"
                    onClick={() => onTemplateSelect(tpl)}
                    className="rounded-xl py-2 px-3 text-xs font-medium border border-cream-300 bg-white text-gray-600 hover:border-moss-300 hover:bg-moss-50 transition-all text-left"
                  >
                    <p className="font-semibold">{tpl.name || TEMPLATE_TYPE_LABELS[tpl.type]}</p>
                    <p className="text-gray-400 mt-0.5">{tpl.durationInHours}h · {formatCurrency(tpl.defaultValue)}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Type */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">{t("typeLabel")}</label>
            <div className="grid grid-cols-2 gap-2">
              {(["TWELVE_DAY", "TWELVE_NIGHT", "TWENTY_FOUR", "TWENTY_FOUR_INVERTED"] as ShiftType[]).map((tp) => (
                <button
                  key={tp}
                  type="button"
                  onClick={() => setValue("type", tp)}
                  className={clsx(
                    "rounded-xl py-2.5 text-xs font-medium border transition-all",
                    shiftType === tp
                      ? "bg-moss-600 text-white border-moss-600"
                      : "bg-white border-cream-300 text-gray-600 hover:border-moss-300"
                  )}
                >
                  {SHIFT_TYPE_LABELS[tp]}
                </button>
              ))}
            </div>
          </div>

          <Input label={t("dateLabel")} type="datetime-local" error={errors.date?.message} {...register("date")} />

          {/* Conflict warnings */}
          {conflicts && (conflicts.overlaps.length > 0 || conflicts.restWarnings.length > 0) && (
            <div className="space-y-1.5">
              {conflicts.overlaps.map((o, i) => (
                <div key={`overlap-${i}`} className="flex items-start gap-2 rounded-xl bg-amber-50 border border-amber-200 px-3 py-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-700">
                    {t("conflictOverlap", { location: o.location })}
                  </p>
                </div>
              ))}
              {conflicts.restWarnings.map((w, i) => (
                <div key={`rest-${i}`} className="flex items-start gap-2 rounded-xl bg-amber-50 border border-amber-200 px-3 py-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-700">
                    {t("conflictRest", { hours: String(w.gapHours), location: w.adjacentShiftLocation })}
                  </p>
                </div>
              ))}
            </div>
          )}

          <Input label={t("valueLabel")} type="number" placeholder={t("valuePlaceholder")} error={errors.value?.message} {...register("value")} />
          <Input label={t("locationLabel")} placeholder={t("locationPlaceholder")} error={errors.location?.message} {...register("location")} />
          <Input label={t("notesLabel")} placeholder={t("notesPlaceholder")} {...register("notes")} />

          {error && <p className="text-sm text-red-500 bg-red-50 rounded-xl px-3 py-2">{error}</p>}

          {/* Simulation CTA */}
          <Link
            href="/simulate"
            onClick={handleClose}
            className="flex items-center gap-3 rounded-2xl border border-moss-200 bg-moss-50/60 px-4 py-3 transition-all hover:bg-moss-100 hover:border-moss-300 group"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-moss-600 text-white">
              <BarChart3 className="h-4 w-4" />
            </div>
            <p className="text-sm text-gray-600 leading-snug group-hover:text-gray-800">
              {t("simulationCta")}
            </p>
          </Link>

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={handleClose} className="flex-1">
              {t("cancel")}
            </Button>
            <Button type="submit" className="flex-1" loading={isSubmitting || saveMutation.isPending}>
              {editingShift ? t("save") : t("add")}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
