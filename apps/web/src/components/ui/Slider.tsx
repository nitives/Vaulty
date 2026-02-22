import React from "react";

interface SliderProps {
  value: number;
  min?: number;
  max?: number;
  stops?: number;
  onChange: (value: number) => void;
  ariaLabel?: string;
}

export const Slider: React.FC<SliderProps> = ({
  value,
  min = 0,
  max = 10,
  stops = 10,
  onChange,
  ariaLabel = "Slider",
}) => {
  // Calculate stop positions
  const stopsArr = Array.from({ length: stops + 1 }, (_, i) => i);

  return (
    <div className="relative flex items-center h-8 w-full max-w-xs">
      {/* Track */}
      <div className="absolute left-0 right-0 h-8 flex items-center">
        <div className="w-[calc(100%+0.5rem)] h-4 rounded-full bg-black/10 dark:bg-white/5 -mx-1" />
        {/* Stops */}
        <div className="absolute left-0 right-0 top-0 h-8 flex items-center justify-between">
          {stopsArr.map((stop) => (
            <div
              key={stop}
              className="w-2 h-2 rounded-full bg-black/15 dark:bg-white/15"
              style={{
                opacity: stop === value ? 1 : 0.5,
                boxShadow:
                  stop === value ? "0 0 0 2px var(--accent-600)" : "none",
                backgroundColor: stop === value ? "var(--accent-600)" : "",
              }}
            />
          ))}
        </div>
      </div>
      {/* Thumb */}
      <input
        type="range"
        min={min}
        max={max}
        step={1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label={ariaLabel}
        className="w-full scale-x-105 h-8 bg-transparent cursor-pointer appearance-none focus:outline-none z-10"
        style={{ position: "relative" }}
      />
      <style jsx>{`
        input[type="range"]::-webkit-slider-runnable-track {
          background: transparent;
          opacity: 0;
        }
      `}</style>
    </div>
  );
};
