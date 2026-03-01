import { clsx } from "clsx";

interface ProgressBarProps {
  value: number; // 0-100
  color?: "moss" | "amber" | "red" | "blue";
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  label?: string;
  className?: string;
}

export function ProgressBar({
  value,
  color = "moss",
  size = "md",
  showLabel = false,
  label,
  className,
}: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, value));

  const colors = {
    moss: "bg-moss-500",
    amber: "bg-amber-500",
    red: "bg-red-500",
    blue: "bg-blue-500",
  };

  const heights = {
    sm: "h-1.5",
    md: "h-2.5",
    lg: "h-4",
  };

  return (
    <div className={clsx("w-full", className)}>
      {(showLabel || label) && (
        <div className="flex justify-between items-center mb-1.5">
          <span className="text-xs text-gray-500">{label}</span>
          <span className="text-xs font-semibold text-gray-700">
            {Math.round(clamped)}%
          </span>
        </div>
      )}
      <div className={clsx("w-full bg-cream-200 rounded-full overflow-hidden", heights[size])}>
        <div
          className={clsx(
            "h-full rounded-full transition-all duration-700 ease-out",
            colors[color]
          )}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}
