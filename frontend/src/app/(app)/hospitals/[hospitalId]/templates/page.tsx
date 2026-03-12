"use client";
import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, ArrowLeft, X, Moon, Sun, Clock } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { api, unwrap, getErrorMessage } from "@/lib/api";
import { formatCurrency } from "@/lib/format";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageSpinner } from "@/components/ui/spinner";
import { useConfirm } from "@/hooks/use-confirm";
import { clsx } from "clsx";
import type { Hospital, ShiftTemplate, ShiftTemplateType } from "@/types";
import { TEMPLATE_TYPE_LABELS } from "@/types";

const TEMPLATE_DEFAULTS: Record<string, { duration: number; isNight: boolean }> = {
  DIURNO_12H: { duration: 12, isNight: false },
  NOTURNO_12H: { duration: 12, isNight: true },
  PLANTAO_24H: { duration: 24, isNight: false },
  PLANTAO_24H_INV: { duration: 24, isNight: true },
  PERSONALIZADO: { duration: 12, isNight: false },
};

const schema = z.object({
  name: z.string().optional(),
  type: z.enum(["DIURNO_12H", "NOTURNO_12H", "PLANTAO_24H", "PLANTAO_24H_INV", "PERSONALIZADO"]),
  durationInHours: z.coerce.number().min(1, "Mínimo 1 hora"),
  defaultValue: z.coerce.number().min(0, "Valor deve ser positivo"),
  isNightShift: z.boolean(),
});
type FormData = z.infer<typeof schema>;

export default function TemplatesPage() {
  const { hospitalId } = useParams<{ hospitalId: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const { confirm, ConfirmDialogComponent } = useConfirm();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<ShiftTemplate | null>(null);
  const [error, setError] = useState("");

  const { data: hospital, isLoading: loadingHospital } = useQuery({
    queryKey: ["hospitals", hospitalId],
    queryFn: () => api.get(`/hospitals/${hospitalId}`).then((r) => unwrap<Hospital>(r)),
  });

  const { data: templates = [], isLoading: loadingTemplates } = useQuery({
    queryKey: ["hospitals", hospitalId, "templates"],
    queryFn: () =>
      api.get(`/hospitals/${hospitalId}/templates`).then((r) => unwrap<ShiftTemplate[]>(r)),
  });

  const { register, handleSubmit, reset, setValue, watch, formState: { errors, isSubmitting } } =
    useForm<FormData>({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      resolver: zodResolver(schema) as any,
      defaultValues: { type: "DIURNO_12H", durationInHours: 12, isNightShift: false, defaultValue: 0 },
    });

  const selectedType = watch("type") as ShiftTemplateType;

  function onTypeChange(type: ShiftTemplateType) {
    setValue("type", type);
    if (type !== "PERSONALIZADO") {
      const defaults = TEMPLATE_DEFAULTS[type];
      setValue("durationInHours", defaults.duration);
      setValue("isNightShift", defaults.isNight);
    }
  }

  const saveMutation = useMutation({
    mutationFn: (data: FormData) => {
      if (editing) return api.patch(`/hospitals/${hospitalId}/templates/${editing.id}`, data);
      return api.post(`/hospitals/${hospitalId}/templates`, data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["hospitals", hospitalId, "templates"] });
      toast.success(editing ? "Modelo atualizado" : "Modelo adicionado");
      closeForm();
    },
    onError: (e) => setError(getErrorMessage(e)),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/hospitals/${hospitalId}/templates/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["hospitals", hospitalId, "templates"] });
      toast.success("Modelo removido");
    },
  });

  function openEdit(template: ShiftTemplate) {
    setEditing(template);
    reset({
      name: template.name || "",
      type: template.type,
      durationInHours: template.durationInHours,
      defaultValue: template.defaultValue,
      isNightShift: template.isNightShift,
    });
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditing(null);
    reset({ type: "DIURNO_12H", durationInHours: 12, isNightShift: false, defaultValue: 0, name: "" });
    setError("");
  }

  if (loadingHospital || loadingTemplates) return <PageSpinner />;

  return (
    <div className="max-w-3xl space-y-6">
      {ConfirmDialogComponent}
      {/* Header */}
      <div>
        <button
          onClick={() => router.push("/hospitals")}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-moss-700 mb-3 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Voltar
        </button>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-800">
              Modelos de Plantão
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {hospital?.name} · {templates.length} {templates.length === 1 ? "modelo" : "modelos"}
            </p>
          </div>
          <Button onClick={() => setShowForm(true)} icon={<Plus className="w-4 h-4" />}>
            Novo modelo
          </Button>
        </div>
      </div>

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center px-4">
          <div className="bg-cream-50 rounded-3xl shadow-float border border-cream-200 p-8 w-full max-w-md">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-800">
                {editing ? "Editar modelo" : "Novo modelo"}
              </h3>
              <button onClick={closeForm} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit((d) => saveMutation.mutate(d))} className="space-y-4">
              {/* Type selector */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Tipo</label>
                <div className="grid grid-cols-2 gap-2">
                  {(["DIURNO_12H", "NOTURNO_12H", "PLANTAO_24H", "PLANTAO_24H_INV", "PERSONALIZADO"] as ShiftTemplateType[]).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => onTypeChange(t)}
                      className={clsx(
                        "rounded-xl py-2.5 text-xs font-medium border transition-all",
                        selectedType === t
                          ? "bg-moss-600 text-white border-moss-600"
                          : "bg-white border-cream-300 text-gray-600 hover:border-moss-300"
                      )}
                    >
                      {TEMPLATE_TYPE_LABELS[t]}
                    </button>
                  ))}
                </div>
              </div>

              <Input
                label="Nome (opcional)"
                placeholder="Ex: Plantão padrão PS"
                {...register("name")}
              />

              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Duração (horas)"
                  type="number"
                  error={errors.durationInHours?.message}
                  disabled={selectedType !== "PERSONALIZADO"}
                  {...register("durationInHours")}
                />
                <Input
                  label="Valor padrão (R$)"
                  type="number"
                  placeholder="Ex: 1500"
                  error={errors.defaultValue?.message}
                  {...register("defaultValue")}
                />
              </div>

              {/* Night shift toggle */}
              <div className="flex items-center justify-between py-2">
                <span className="text-sm font-medium text-gray-700">Plantão noturno</span>
                <button
                  type="button"
                  onClick={() => setValue("isNightShift", !watch("isNightShift"))}
                  disabled={selectedType !== "PERSONALIZADO"}
                  className={clsx(
                    "w-12 h-7 rounded-full transition-colors flex items-center px-0.5",
                    watch("isNightShift") ? "bg-indigo-500" : "bg-gray-200",
                    selectedType !== "PERSONALIZADO" && "opacity-50"
                  )}
                >
                  <div className={clsx(
                    "w-6 h-6 bg-white rounded-full shadow transition-transform flex items-center justify-center",
                    watch("isNightShift") ? "translate-x-5" : "translate-x-0"
                  )}>
                    {watch("isNightShift") ? <Moon className="w-3 h-3 text-indigo-600" /> : <Sun className="w-3 h-3 text-amber-500" />}
                  </div>
                </button>
              </div>

              {error && <p className="text-sm text-red-500 bg-red-50 rounded-xl px-3 py-2">{error}</p>}

              <div className="flex gap-3 pt-2">
                <Button type="button" variant="secondary" onClick={closeForm} className="flex-1">
                  Cancelar
                </Button>
                <Button type="submit" className="flex-1" loading={isSubmitting || saveMutation.isPending}>
                  {editing ? "Salvar" : "Adicionar"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Templates list */}
      {templates.length === 0 ? (
        <Card className="text-center py-12">
          <p className="text-gray-500 mb-3">Nenhum modelo de plantão cadastrado.</p>
          <Button onClick={() => setShowForm(true)} icon={<Plus className="w-4 h-4" />}>
            Criar primeiro modelo
          </Button>
        </Card>
      ) : (
        <div className="space-y-3">
          {templates.map((template) => (
            <Card key={template.id} padding="sm" className="flex items-center gap-4">
              <div className={clsx(
                "w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 border",
                template.isNightShift
                  ? "bg-indigo-50 border-indigo-100"
                  : "bg-amber-50 border-amber-100"
              )}>
                {template.isNightShift
                  ? <Moon className="w-5 h-5 text-indigo-600" />
                  : <Sun className="w-5 h-5 text-amber-600" />}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="font-semibold text-gray-800 truncate">
                    {template.name || TEMPLATE_TYPE_LABELS[template.type]}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-cream-200 text-gray-600 border border-cream-300">
                    {TEMPLATE_TYPE_LABELS[template.type]}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-sm text-gray-500">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {template.durationInHours}h
                  </span>
                  <span className="font-semibold text-moss-700">
                    {formatCurrency(template.defaultValue)}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1 flex-shrink-0">
                <button onClick={() => openEdit(template)} className="w-8 h-8 rounded-lg hover:bg-cream-200 flex items-center justify-center transition-colors">
                  <Pencil className="w-3.5 h-3.5 text-gray-500" />
                </button>
                <button
                  onClick={async () => {
                    const ok = await confirm({
                      title: "Remover modelo",
                      message: "Tem certeza que deseja remover este modelo de plantão?",
                      confirmLabel: "Remover",
                      variant: "danger",
                    });
                    if (ok) deleteMutation.mutate(template.id);
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
