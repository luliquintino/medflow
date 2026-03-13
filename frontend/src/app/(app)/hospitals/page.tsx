"use client";
import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, Building2, MapPin, FileText, X, ChevronRight, CalendarDays } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { toast } from "sonner";
import { track } from "@vercel/analytics";
import { useTranslations } from "next-intl";
import { api, unwrap, getErrorMessage } from "@/lib/api";
import { BRAZIL_STATES, fetchCitiesByUF } from "@/lib/brazil-states";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageSpinner } from "@/components/ui/spinner";
import { useConfirm } from "@/hooks/use-confirm";
import type { Hospital } from "@/types";

const selectClass =
  "w-full rounded-xl border border-cream-300 bg-white/70 px-4 py-3 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-moss-400 focus:border-transparent transition-all duration-200";

export default function HospitalsPage() {
  const t = useTranslations("hospitals");
  const tValidation = useTranslations("validation");
  const tCommon = useTranslations("common");

  const schema = useMemo(() => z.object({
    name: z.string().min(2, tValidation("nameMinChars")),
    state: z.string().optional(),
    city: z.string().optional(),
    notes: z.string().optional(),
    paymentDay: z.union([
      z.coerce.number().int().min(1).max(31),
      z.literal("").transform(() => undefined),
    ]).optional(),
  }), [tValidation]);

  type FormData = z.infer<typeof schema>;

  const qc = useQueryClient();
  const { confirm, ConfirmDialogComponent } = useConfirm();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Hospital | null>(null);
  const [error, setError] = useState("");
  const [cities, setCities] = useState<string[]>([]);
  const [loadingCities, setLoadingCities] = useState(false);

  const { data: hospitals = [], isLoading } = useQuery({
    queryKey: ["hospitals"],
    queryFn: () => api.get("/hospitals").then((r) => unwrap<Hospital[]>(r)),
  });

  const { register, handleSubmit, reset, watch, setValue, formState: { errors, isSubmitting } } =
    useForm<FormData>({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      resolver: zodResolver(schema) as any,
    });

  const selectedState = watch("state");

  // Load cities when state changes
  useEffect(() => {
    if (!selectedState) {
      setCities([]);
      return;
    }
    let cancelled = false;
    setLoadingCities(true);
    fetchCitiesByUF(selectedState).then((list) => {
      if (!cancelled) {
        setCities(list);
        setLoadingCities(false);
      }
    });
    return () => { cancelled = true; };
  }, [selectedState]);

  const saveMutation = useMutation({
    mutationFn: (data: FormData) => {
      if (editing) return api.patch(`/hospitals/${editing.id}`, data);
      return api.post("/hospitals", data);
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["hospitals"] });
      if (!editing) track("hospital_created", { state: variables.state ?? "" });
      toast.success(editing ? t("toastUpdated") : t("toastAdded"));
      closeForm();
    },
    onError: (e) => setError(getErrorMessage(e)),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/hospitals/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["hospitals"] });
      toast.success(t("toastDeleted"));
    },
  });

  function openEdit(hospital: Hospital) {
    setEditing(hospital);
    reset({
      name: hospital.name,
      state: hospital.state || "",
      city: hospital.city || "",
      notes: hospital.notes || "",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      paymentDay: hospital.paymentDay ?? ("" as any),
    });
    // Pre-load cities for the existing state, then re-set city value after render
    if (hospital.state) {
      setLoadingCities(true);
      fetchCitiesByUF(hospital.state).then((list) => {
        setCities(list);
        setLoadingCities(false);
        // Wait for React to render the new options before setting city
        requestAnimationFrame(() => {
          if (hospital.city) setValue("city", hospital.city);
        });
      });
    }
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditing(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    reset({ name: "", state: "", city: "", notes: "", paymentDay: "" as any });
    setCities([]);
    setError("");
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
            {t("count", { count: hospitals.length })}
          </p>
        </div>
        <Button onClick={() => setShowForm(true)} icon={<Plus className="w-4 h-4" />}>
          {t("newHospital")}
        </Button>
      </div>

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center px-4">
          <div className="bg-cream-50 rounded-3xl shadow-float border border-cream-200 p-8 w-full max-w-md">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-800">
                {editing ? t("editHospital") : t("newHospital")}
              </h3>
              <button onClick={closeForm} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit((d) => saveMutation.mutate(d))} className="space-y-4">
              <Input
                label={t("nameLabel")}
                placeholder={t("namePlaceholder")}
                error={errors.name?.message}
                {...register("name")}
              />

              {/* Estado */}
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-gray-700">{t("stateLabel")}</label>
                <select
                  {...register("state", {
                    onChange: () => setValue("city", ""),
                  })}
                  className={selectClass}
                >
                  <option value="">{t("statePlaceholder")}</option>
                  {BRAZIL_STATES.map((s) => (
                    <option key={s.uf} value={s.uf}>{s.name}</option>
                  ))}
                </select>
              </div>

              {/* Cidade */}
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-gray-700">{t("cityLabel")}</label>
                <select
                  {...register("city")}
                  disabled={!selectedState || loadingCities}
                  className={selectClass + (!selectedState ? " opacity-50 cursor-not-allowed" : "")}
                >
                  <option value="">
                    {loadingCities
                      ? t("cityLoadingPlaceholder")
                      : !selectedState
                        ? t("cityNoStatePlaceholder")
                        : t("cityPlaceholder")}
                  </option>
                  {cities.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              {/* Dia de pagamento */}
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-gray-700">{t("paymentDayLabel")}</label>
                <select
                  {...register("paymentDay")}
                  className={selectClass}
                >
                  <option value="">{t("paymentDayPlaceholder")}</option>
                  {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                    <option key={d} value={d}>{t("paymentDayOption", { day: d })}</option>
                  ))}
                </select>
                {errors.paymentDay?.message && (
                  <p className="text-xs text-red-500 mt-0.5">{errors.paymentDay.message}</p>
                )}
              </div>

              <Input
                label={t("notesLabel")}
                placeholder={t("notesPlaceholder")}
                {...register("notes")}
              />

              {error && <p className="text-sm text-red-500 bg-red-50 rounded-xl px-3 py-2">{error}</p>}

              <div className="flex gap-3 pt-2">
                <Button type="button" variant="secondary" onClick={closeForm} className="flex-1">
                  {tCommon("cancel")}
                </Button>
                <Button type="submit" className="flex-1" loading={isSubmitting || saveMutation.isPending}>
                  {editing ? tCommon("save") : tCommon("add")}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Hospitals list */}
      {hospitals.length === 0 ? (
        <Card className="text-center py-12">
          <p className="text-gray-500 mb-3">{t("emptyState")}</p>
          <Button onClick={() => setShowForm(true)} icon={<Plus className="w-4 h-4" />}>
            {t("addFirstHospital")}
          </Button>
        </Card>
      ) : (
        <div className="space-y-3">
          {hospitals.map((hospital) => (
            <Card key={hospital.id} padding="sm" className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-moss-50 flex items-center justify-center flex-shrink-0 border border-moss-100">
                <Building2 className="w-5 h-5 text-moss-600" />
              </div>

              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-800 truncate">{hospital.name}</p>
                <div className="flex items-center gap-3 text-sm text-gray-500 mt-0.5">
                  {(hospital.city || hospital.state) && (
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {[hospital.city, hospital.state].filter(Boolean).join(", ")}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <FileText className="w-3 h-3" />
                    {t("modelsCount", { count: hospital._count?.templates ?? 0 })}
                  </span>
                  {hospital.paymentDay && (
                    <span className="flex items-center gap-1">
                      <CalendarDays className="w-3 h-3" />
                      {t("dayLabel", { day: hospital.paymentDay })}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1 flex-shrink-0">
                <Link
                  href={`/hospitals/${hospital.id}/templates`}
                  className="w-8 h-8 rounded-lg hover:bg-cream-200 flex items-center justify-center transition-colors"
                  title={t("shiftTemplates")}
                >
                  <ChevronRight className="w-4 h-4 text-gray-500" />
                </Link>
                <button onClick={() => openEdit(hospital)} className="w-8 h-8 rounded-lg hover:bg-cream-200 flex items-center justify-center transition-colors">
                  <Pencil className="w-3.5 h-3.5 text-gray-500" />
                </button>
                <button
                  onClick={async () => {
                    const ok = await confirm({
                      title: t("confirmDeleteTitle"),
                      message: t("confirmDeleteMessage"),
                      confirmLabel: t("confirmDeleteLabel"),
                      variant: "danger",
                    });
                    if (ok) deleteMutation.mutate(hospital.id);
                  }}
                  className="w-8 h-8 rounded-lg hover:bg-red-50 flex items-center justify-center transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5 text-red-400" />
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
