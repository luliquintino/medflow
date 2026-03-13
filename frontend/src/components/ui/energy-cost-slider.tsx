"use client";

interface EnergyCostSliderProps {
  label: string;
  value: number;
  defaultValue: number;
  onChange: (v: number) => void;
  defaultLabel: string;
  scaleLow: string;
  scaleHigh: string;
}

export function EnergyCostSlider({
  label,
  value,
  defaultValue,
  onChange,
  defaultLabel,
  scaleLow,
  scaleHigh,
}: EnergyCostSliderProps) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="text-sm font-medium text-gray-700">{label}</label>
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-gray-800">{value.toFixed(1)}</span>
          {value !== defaultValue && (
            <span className="text-xs text-gray-400">{defaultLabel}</span>
          )}
        </div>
      </div>
      <input
        type="range"
        min="0.5"
        max="5.0"
        step="0.1"
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-2 bg-cream-200 rounded-full appearance-none cursor-pointer accent-moss-600"
      />
      <div className="flex justify-between text-xs text-gray-400 mt-1">
        <span>{scaleLow}</span>
        <span>{scaleHigh}</span>
      </div>
    </div>
  );
}
