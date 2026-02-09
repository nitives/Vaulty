"use client";

import clsx from "clsx";
import type { AccentColor } from "@/lib/settings";
import { sfCircleFill } from "@bradleyhodges/sfsymbols";
import SFIcon from "@bradleyhodges/sfsymbols-react";

interface AccentColorPickerProps {
  value: AccentColor;
  onChange: (color: AccentColor) => void;
}

interface ColorOption {
  id: AccentColor;
  label: string;
  // Colors for the button display
  colors: string | string[]; // Single color or gradient array for multicolor
}

const colorOptions: ColorOption[] = [
  {
    id: "multicolor",
    label: "Multicolor",
    // Rainbow gradient colors matching macOS
    colors: ["#ff5f57", "#febc2e", "#28c840", "#007aff", "#bf5af2", "#ff2d55"],
  },
  { id: "blue", label: "Blue", colors: "#007aff" },
  { id: "purple", label: "Purple", colors: "#bf5af2" },
  { id: "pink", label: "Pink", colors: "#ff2d55" },
  { id: "red", label: "Red", colors: "#ff3b30" },
  { id: "orange", label: "Orange", colors: "#ff9500" },
  { id: "yellow", label: "Yellow", colors: "#ffcc00" },
  { id: "green", label: "Green", colors: "#28cd41" },
  { id: "graphite", label: "Graphite", colors: "#8e8e93" },
];

export function AccentColorPicker({ value, onChange }: AccentColorPickerProps) {
  return (
    <div className="flex items-center gap-2">
      {colorOptions.map((option) => {
        const isSelected = value === option.id;
        const isMulticolor = Array.isArray(option.colors);

        // Build the background style
        const bgStyle: React.CSSProperties = isMulticolor
          ? {
              background: `conic-gradient(from 0deg, ${(option.colors as string[]).join(", ")})`,
            }
          : { backgroundColor: option.colors as string };

        return (
          <button
            key={option.id}
            onClick={() => onChange(option.id)}
            className={clsx(
              "relative flex items-center justify-center",
              "size-6 rounded-full cursor-pointer",
              "transition-transform hover:scale-110",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-neutral-400",
            )}
            style={bgStyle}
            aria-label={option.label}
            aria-pressed={isSelected}
            title={option.label}
          >
            {/* Checkmark for selected state */}
            {isSelected && (
              <SFIcon icon={sfCircleFill} size={8} className="text-white" />
            )}
          </button>
        );
      })}
    </div>
  );
}
