"use client";

import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";

const LOCALES = [
  { code: "pt-BR", label: "PT" },
  { code: "en", label: "EN" },
] as const;

export function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();

  function switchLocale(newLocale: string) {
    if (newLocale === locale) return;
    document.cookie = `NEXT_LOCALE=${newLocale}; path=/; SameSite=Strict; max-age=${365 * 24 * 60 * 60}`;
    router.refresh();
  }

  return (
    <div className="flex items-center rounded-lg bg-[#f0ebe4]/60 p-0.5">
      {LOCALES.map(({ code, label }) => (
        <button
          key={code}
          onClick={() => switchLocale(code)}
          className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
            locale === code
              ? "bg-white text-gray-800 shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
