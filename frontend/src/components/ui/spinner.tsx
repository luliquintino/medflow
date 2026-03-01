import { Loader2 } from "lucide-react";
import { clsx } from "clsx";

export function Spinner({ className }: { className?: string }) {
  return (
    <Loader2 className={clsx("animate-spin text-moss-500", className ?? "w-6 h-6")} />
  );
}

export function PageSpinner() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Spinner className="w-8 h-8" />
    </div>
  );
}
