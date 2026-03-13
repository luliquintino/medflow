"use client";
import { Calendar, List } from "lucide-react";
import { clsx } from "clsx";
import { useTranslations } from "next-intl";

interface ViewToggleProps {
  view: "calendar" | "list";
  onChange: (view: "calendar" | "list") => void;
}

export function ViewToggle({ view, onChange }: ViewToggleProps) {
  const t = useTranslations("calendar");

  return (
    <div className="flex items-center bg-cream-100 rounded-xl p-0.5">
      <button
        onClick={() => onChange("calendar")}
        className={clsx(
          "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
          view === "calendar"
            ? "bg-white text-moss-700 shadow-sm"
            : "text-gray-500 hover:text-gray-700"
        )}
      >
        <Calendar className="w-3.5 h-3.5" />
        {t("viewCalendar")}
      </button>
      <button
        onClick={() => onChange("list")}
        className={clsx(
          "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
          view === "list"
            ? "bg-white text-moss-700 shadow-sm"
            : "text-gray-500 hover:text-gray-700"
        )}
      >
        <List className="w-3.5 h-3.5" />
        {t("viewList")}
      </button>
    </div>
  );
}
