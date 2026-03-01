"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, MapPin, Clock, DollarSign, X, Check } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { api, unwrap, getErrorMessage } from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/format";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageSpinner } from "@/components/ui/spinner";
import { clsx } from "clsx";
import type { Shift, ShiftType, ShiftStatus } from "@/types";
import { SHIFT_TYPE_LABELS, SHIFT_TYPE_HOURS } from "@/types";

const schema = z.object({
  date: z.string().min(1, "Data obrigatória"),
  type: z.enum(["TWELVE_HOURS", "TWENTY_FOUR_HOURS", "NIGHT"]),
  value: z.coerce.number().min(0),
  location: z.string().min(1, "Local obrigatório"),
  notes: z.string().optional(),
  status: z.enum(["CONFIRMED", "SIMULATED"]).default("CONFIRMED"),
});
type FormData = z.infer<typeof schema>;

const SHIFT_COLORS: Record<ShiftType, string> = {
  TWELVE_HOURS:     "bg-blue-100 text-blue-700 border-blue-200",
  TWENTY_FOUR_HOURS:"bg-purple-100 text-purple-700 border-purple-200",
  NIGHT:            "bg-indigo-100 text-indigo-700 border-indigo-200",
};

export default function ShiftsPage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Shift | null>(null);
  const [error, setError] = useState("");

  const { data: shifts = [], isLoading } = useQuery({
    queryKey: ["shifts"],
    queryFn: () => api.get("/shifts").then((r) => unwrap<Shift[]>(r)),
  });

  const { register, handleSubmit, reset, setValue, watch, formState: { errors, isSubmitting } } =
    useForm<FormData>({
      resolver: zodResolver(schema) as any,
      defaultValues: { type: "TWELVE_HOURS", status: "CONFIRMED" },
    });

  const shiftType = watch("type") as ShiftType;

  const createMutation = useMutation({
    mutationFn: (data: FormData) => {
      const hours = SHIFT_TYPE_HOURS[data.type];
      const payload = { ...data, hours };
      if (editing) return api.patch(`/shifts/${editing.id}`, payload);
      return api.post("/shifts", payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["shifts"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      setShowForm(false);
      setEditing(null);
      reset();
    },
    onError: (e) => setError(getErrorMessage(e)),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/shifts/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["shifts"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });

  function openEdit(shift: Shift) {
    setEditing(shift);
    reset({
      date: shift.date.slice(0, 16),
      type: shift.type,
      value: shift.value,
      location: shift.location,
      notes: shift.notes || "",
      status: shift.status as any,
    });
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditing(null);
    reset();
    setError("");
  }

  const confirmed = shifts.filter((s) => s.status === "CONFIRMED");
  const simulated = shifts.filter((s) => s.status === "SIMULATED");

  if (isLoading) return <PageSpinner />;

  return (
    <div className="max-w-3xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Meus Plantões</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {confirmed.length} confirmados · {simulated.length} simulados
          </p>
        </div>
        <Button onClick={() => setShowForm(true)} icon={<Plus className="w-4 h-4" />}>
          Novo plantão
        </Button>
      </div>

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center px-4">
          <div className="bg-cream-50 rounded-3xl shadow-float border border-cream-200 p-8 w-full max-w-md">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-800">
                {editing ? "Editar plantão" : "Novo plantão"}
              </h3>
              <button onClick={closeForm} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit((d: any) => createMutation.mutate(d as FormData))} className="space-y-4">
              {/* Type */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Tipo</label>
                <div className="grid grid-cols-3 gap-2">
                  {(["TWELVE_HOURS", "TWENTY_FOUR_HOURS", "NIGHT"] as ShiftType[]).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setValue("type", t)}
                      className={clsx(
                        "rounded-xl py-2.5 text-xs font-medium border transition-all",
                        shiftType === t
                          ? "bg-moss-600 text-white border-moss-600"
                          : "bg-white border-cream-300 text-gray-600 hover:border-moss-300"
                      )}
                    >
                      {SHIFT_TYPE_LABELS[t]}
                    </button>
                  ))}
                </div>
              </div>

              <Input
                label="Data e hora"
                type="datetime-local"
                error={errors.date?.message}
                {...register("date")}
              />
              <Input
                label="Valor (R$)"
                type="number"
                placeholder="Ex: 1500"
                error={errors.value?.message}
                {...register("value")}
              />
              <Input
                label="Local"
                placeholder="Hospital / UPA / Pronto-Socorro"
                error={errors.location?.message}
                {...register("location")}
              />
              <Input
                label="Observações (opcional)"
                placeholder="Alguma anotação..."
                {...register("notes")}
              />

              {/* Status */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Status</label>
                <div className="flex gap-2">
                  {["CONFIRMED", "SIMULATED"].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setValue("status", s as any)}
                      className={clsx(
                        "flex-1 py-2 rounded-xl text-sm font-medium border transition-all",
                        watch("status") === s
                          ? "bg-moss-600 text-white border-moss-600"
                          : "bg-white border-cream-300 text-gray-600"
                      )}
                    >
                      {s === "CONFIRMED" ? "Confirmado" : "Simulado"}
                    </button>
                  ))}
                </div>
              </div>

              {error && <p className="text-sm text-red-500 bg-red-50 rounded-xl px-3 py-2">{error}</p>}

              <div className="flex gap-3 pt-2">
                <Button type="button" variant="secondary" onClick={closeForm} className="flex-1">
                  Cancelar
                </Button>
                <Button type="submit" className="flex-1" loading={isSubmitting || createMutation.isPending}>
                  {editing ? "Salvar" : "Adicionar"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Shifts list */}
      {shifts.length === 0 ? (
        <Card className="text-center py-12">
          <p className="text-gray-500 mb-3">Você ainda não tem plantões cadastrados.</p>
          <Button onClick={() => setShowForm(true)} icon={<Plus className="w-4 h-4" />}>
            Adicionar primeiro plantão
          </Button>
        </Card>
      ) : (
        <div className="space-y-3">
          {[...confirmed, ...simulated].sort((a, b) =>
            new Date(b.date).getTime() - new Date(a.date).getTime()
          ).map((shift) => (
            <ShiftCard
              key={shift.id}
              shift={shift}
              onEdit={() => openEdit(shift)}
              onDelete={() => {
                if (confirm("Remover este plantão?")) deleteMutation.mutate(shift.id);
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ShiftCard({ shift, onEdit, onDelete }: {
  shift: Shift; onEdit: () => void; onDelete: () => void;
}) {
  return (
    <Card padding="sm" className="flex items-center gap-4">
      <div className="w-12 h-12 rounded-xl bg-moss-50 flex flex-col items-center justify-center flex-shrink-0 border border-moss-100">
        <span className="text-xs font-bold text-moss-700">
          {new Date(shift.date).getDate()}
        </span>
        <span className="text-xs text-moss-500">
          {new Date(shift.date).toLocaleString("pt-BR", { month: "short" })}
        </span>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className={clsx("text-xs px-2 py-0.5 rounded-full border font-medium", SHIFT_COLORS[shift.type])}>
            {SHIFT_TYPE_LABELS[shift.type]}
          </span>
          {shift.status === "SIMULATED" && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 border border-gray-200">
              Simulado
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 text-sm text-gray-600 flex-wrap">
          <span className="flex items-center gap-1">
            <MapPin className="w-3 h-3 text-gray-400" />
            <span className="truncate max-w-[140px]">{shift.location}</span>
          </span>
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3 text-gray-400" />
            {shift.hours}h
          </span>
          <span className="flex items-center gap-1 text-moss-700 font-semibold">
            <DollarSign className="w-3 h-3" />
            {formatCurrency(shift.value)}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-1 flex-shrink-0">
        <button onClick={onEdit} className="w-8 h-8 rounded-lg hover:bg-cream-200 flex items-center justify-center transition-colors">
          <Pencil className="w-3.5 h-3.5 text-gray-500" />
        </button>
        <button onClick={onDelete} className="w-8 h-8 rounded-lg hover:bg-red-50 flex items-center justify-center transition-colors">
          <Trash2 className="w-3.5 h-3.5 text-red-400" />
        </button>
      </div>
    </Card>
  );
}
