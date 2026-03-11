"use client";

import { useLocale } from "next-intl";

export function useFormat() {
  const locale = useLocale();

  return {
    formatCurrency: (value: number) =>
      new Intl.NumberFormat(locale, {
        style: "currency",
        currency: "BRL",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(value),

    formatCurrencyDecimal: (value: number) =>
      new Intl.NumberFormat(locale, {
        style: "currency",
        currency: "BRL",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(value),

    formatDate: (dateStr: string, opts?: Intl.DateTimeFormatOptions) =>
      new Date(dateStr).toLocaleDateString(
        locale,
        opts ?? { day: "2-digit", month: "short", year: "numeric" }
      ),

    formatMonth: (dateStr: string) =>
      new Date(dateStr).toLocaleDateString(locale, {
        month: "long",
        year: "numeric",
      }),

    locale,
  };
}
