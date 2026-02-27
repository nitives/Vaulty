"use client";

import { useState } from "react";
import { useColor } from "color-thief-react";
import { getImageUrl } from "@/lib/media";
import type { Item } from "./ItemCard";

interface LinkWidgetProps {
  item: Item;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) {
    return null;
  }
  return {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
  };
}

function getBackgroundColor(isDark: boolean, color?: string): string {
  if (!color) {
    return isDark ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.05)";
  }

  const rgb = hexToRgb(color);
  if (!rgb) {
    return isDark ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.05)";
  }

  const isDarkMultiplier = 0.8;

  if (isDark) {
    return `rgb(${Math.floor(rgb.r * isDarkMultiplier)}, ${Math.floor(rgb.g * isDarkMultiplier)}, ${Math.floor(rgb.b * isDarkMultiplier)})`;
  }

  const lightMultiplier = 0.3;

  return `rgb(${Math.floor(rgb.r * lightMultiplier + 255 * (1 - lightMultiplier))}, ${Math.floor(rgb.g * lightMultiplier + 255 * (1 - lightMultiplier))}, ${Math.floor(rgb.b * lightMultiplier + 255 * (1 - lightMultiplier))}`;
}

export const LinkWidget = ({ item }: LinkWidgetProps) => {
  const [imageFailed, setImageFailed] = useState(false);
  const rawImagePath = item.metadata?.image?.trim() || "";
  const imageUrl = rawImagePath ? getImageUrl(rawImagePath) : "";
  const showImage = Boolean(imageUrl) && !imageFailed;

  const { data: extractedColor } = useColor(showImage ? imageUrl : "", "hex", {
    crossOrigin: "anonymous",
  });

  const isDark =
    typeof document !== "undefined" &&
    document.documentElement.classList.contains("dark");

  const title = item.metadata?.title?.trim() || item.content;
  const description =
    item.metadata?.description?.trim() || "No description available.";

  return (
    <a
      href={item.content}
      target="_blank"
      rel="noopener noreferrer"
      className="flex flex-col rounded-sm overflow-hidden max-w-lg"
    >
      {showImage && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imageUrl}
          className="max-h-72 w-full object-cover"
          alt={title}
          onError={() => setImageFailed(true)}
        />
      )}
      <div
        style={{ backgroundColor: getBackgroundColor(isDark, extractedColor) }}
        className="p-4 transition-colors duration-300"
      >
        <h2 className="text-lg font-bold text-neutral-900 dark:text-white">
          {title}
        </h2>
        <p className="text-sm mix-blend-plus-lighter text-neutral-600">
          {description}
        </p>
      </div>
    </a>
  );
};
