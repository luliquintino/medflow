"use client";
import { useState } from "react";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";

const MONTH_NAMES = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

const MONTH_SHORT = [
  "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
  "Jul", "Ago", "Set", "Out", "Nov", "Dez",
];

interface MonthNavigatorProps {
  month: number;  // 1-12
  year: number;
  onChange: (month: number, year: number) => void;
}

export function MonthNavigator({ month, year, onChange }: MonthNavigatorProps) {
  const [showPicker, setShowPicker] = useState(false);
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();
  const isCurrent = month === currentMonth && year === currentYear;

  // Limits: 12 months back, 6 months forward
  const minDate = new Date(currentYear, currentMonth - 1 - 12, 1);
  const maxDate = new Date(currentYear, currentMonth - 1 + 6, 1);

  function canGoBack() {
    const prev = new Date(year, month - 2, 1);
    return prev >= minDate;
  }

  function canGoForward() {
    const next = new Date(year, month, 1);
    return next <= maxDate;
  }

  function goBack() {
    if (!canGoBack()) return;
    if (month === 1) onChange(12, year - 1);
    else onChange(month - 1, year);
  }

  function goForward() {
    if (!canGoForward()) return;
    if (month === 12) onChange(1, year + 1);
    else onChange(month + 1, year);
  }

  function goToToday() {
    onChange(currentMonth, currentYear);
    setShowPicker(false);
  }

  // Year picker for the month grid
  const [pickerYear, setPickerYear] = useState(year);

  function openPicker() {
    setPickerYear(year);
    setShowPicker(!showPicker);
  }

  function selectMonth(m: number) {
    onChange(m, pickerYear);
    setShowPicker(false);
  }

  function isMonthDisabled(m: number, y: number) {
    const d = new Date(y, m - 1, 1);
    return d < minDate || d > maxDate;
  }

  return (
    <div className="relative">
      <div className="flex items-center gap-3">
        <button
          onClick={goBack}
          disabled={!canGoBack()}
          className="w-9 h-9 rounded-xl border border-cream-300 flex items-center justify-center hover:bg-cream-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft className="w-4 h-4 text-gray-600" />
        </button>

        <button
          onClick={openPicker}
          className="flex items-center gap-2 px-4 py-2 rounded-xl hover:bg-cream-100 transition-colors"
        >
          <Calendar className="w-4 h-4 text-gray-500" />
          <span className="text-sm font-semibold text-gray-800 capitalize">
            {MONTH_NAMES[month - 1]} de {year}
          </span>
          {isCurrent && (
            <span className="w-2 h-2 rounded-full bg-moss-500" />
          )}
        </button>

        <button
          onClick={goForward}
          disabled={!canGoForward()}
          className="w-9 h-9 rounded-xl border border-cream-300 flex items-center justify-center hover:bg-cream-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronRight className="w-4 h-4 text-gray-600" />
        </button>

        {!isCurrent && (
          <button
            onClick={goToToday}
            className="text-xs font-medium text-moss-600 hover:text-moss-700 px-3 py-1.5 rounded-lg hover:bg-moss-50 transition-colors"
          >
            Hoje
          </button>
        )}
      </div>

      {/* Month picker dropdown */}
      {showPicker && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowPicker(false)} />
          <div className="absolute top-12 left-0 z-50 bg-white rounded-2xl shadow-float border border-cream-200 p-4 w-72">
            {/* Year navigation */}
            <div className="flex items-center justify-between mb-3">
              <button
                onClick={() => setPickerYear(pickerYear - 1)}
                disabled={pickerYear <= currentYear - 1}
                className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-cream-100 disabled:opacity-30 transition-colors"
              >
                <ChevronLeft className="w-3.5 h-3.5 text-gray-600" />
              </button>
              <span className="text-sm font-semibold text-gray-700">{pickerYear}</span>
              <button
                onClick={() => setPickerYear(pickerYear + 1)}
                disabled={pickerYear >= currentYear + 1}
                className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-cream-100 disabled:opacity-30 transition-colors"
              >
                <ChevronRight className="w-3.5 h-3.5 text-gray-600" />
              </button>
            </div>

            {/* Month grid */}
            <div className="grid grid-cols-4 gap-1.5">
              {MONTH_SHORT.map((name, i) => {
                const m = i + 1;
                const isSelected = m === month && pickerYear === year;
                const isNow = m === currentMonth && pickerYear === currentYear;
                const disabled = isMonthDisabled(m, pickerYear);

                return (
                  <button
                    key={m}
                    onClick={() => !disabled && selectMonth(m)}
                    disabled={disabled}
                    className={`py-2 rounded-lg text-xs font-medium transition-all ${
                      isSelected
                        ? "bg-moss-600 text-white"
                        : isNow
                        ? "bg-moss-50 text-moss-700 border border-moss-200"
                        : disabled
                        ? "text-gray-300 cursor-not-allowed"
                        : "text-gray-600 hover:bg-cream-100"
                    }`}
                  >
                    {name}
                  </button>
                );
              })}
            </div>

            <button
              onClick={goToToday}
              className="w-full mt-3 py-2 text-xs font-medium text-moss-600 hover:bg-moss-50 rounded-lg transition-colors"
            >
              Ir para mês atual
            </button>
          </div>
        </>
      )}
    </div>
  );
}
