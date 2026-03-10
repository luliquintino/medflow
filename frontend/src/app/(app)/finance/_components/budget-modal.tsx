"use client";
import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { X } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { api, getErrorMessage } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { FinancialProfile } from "@/types";

// ─── Schema ────────────────────────────────────────────────────────────────

const profileSchema = z.object({
  minimumMonthlyGoal: z.coerce.number().min(0, "Deve ser 0 ou mais"),
  idealMonthlyGoal: z.coerce.number().min(0, "Deve ser 0 ou mais"),
  savingsGoal: z.coerce.number().min(0, "Deve ser 0 ou mais"),
});
type ProfileForm = z.infer<typeof profileSchema>;

// ─── Props ─────────────────────────────────────────────────────────────────

interface BudgetModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: FinancialProfile;
}

export function BudgetModal({ isOpen, onClose, profile }: BudgetModalProps) {
  const qc = useQueryClient();
  const [profileError, setProfileError] = useState("");

  // ─── Profile form ──────────────────────────────────────────────────────

  const profileForm = useForm<ProfileForm>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(profileSchema) as any,
    defaultValues: {
      minimumMonthlyGoal: profile.minimumMonthlyGoal,
      idealMonthlyGoal: profile.idealMonthlyGoal,
      savingsGoal: profile.savingsGoal,
    },
  });

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      profileForm.reset({
        minimumMonthlyGoal: profile.minimumMonthlyGoal,
        idealMonthlyGoal: profile.idealMonthlyGoal,
        savingsGoal: profile.savingsGoal,
      });
      setProfileError("");
    }
  }, [isOpen, profile]);

  // ─── Profile mutation ──────────────────────────────────────────────────

  const updateProfileMutation = useMutation({
    mutationFn: (data: ProfileForm) => api.patch("/finance/profile", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["finance"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      qc.invalidateQueries({ queryKey: ["finance-insights"] });
      setProfileError("");
      toast.success("Metas salvas com sucesso");
    },
    onError: (err) => setProfileError(getErrorMessage(err)),
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-cream-50 rounded-3xl shadow-float w-full max-w-lg max-h-[90vh] overflow-y-auto mx-4">
        {/* Header */}
        <div className="sticky top-0 bg-cream-50 rounded-t-3xl px-6 pt-6 pb-4 border-b border-cream-200 flex items-center justify-between z-10">
          <h2 className="text-lg font-bold text-gray-800">Meu Orçamento</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-cream-200 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        <div className="p-6">
          <form
            onSubmit={profileForm.handleSubmit((data) =>
              updateProfileMutation.mutate(data)
            )}
            className="space-y-4"
          >
            <h3 className="text-sm font-semibold text-gray-700">
              Metas financeiras
            </h3>

            <Input
              label="Meta mensal mínima (R$)"
              type="number"
              step="0.01"
              {...profileForm.register("minimumMonthlyGoal")}
              error={profileForm.formState.errors.minimumMonthlyGoal?.message}
            />

            <Input
              label="Meta mensal ideal (R$)"
              type="number"
              step="0.01"
              {...profileForm.register("idealMonthlyGoal")}
              error={profileForm.formState.errors.idealMonthlyGoal?.message}
            />

            <Input
              label="Meta de poupança mensal (R$)"
              type="number"
              step="0.01"
              {...profileForm.register("savingsGoal")}
              error={profileForm.formState.errors.savingsGoal?.message}
            />

            {profileError && (
              <p className="text-xs text-red-500">{profileError}</p>
            )}

            <Button
              type="submit"
              size="sm"
              loading={updateProfileMutation.isPending}
              className="w-full"
            >
              Salvar metas
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
