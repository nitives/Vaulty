"use client";

import { useState } from "react";
import { useColor } from "color-thief-react";
import { useResolvedMediaUrl } from "@/hooks/useResolvedMediaUrl";
import { safeExternalHref } from "@/lib/urls";
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
  const [failedImagePath, setFailedImagePath] = useState<string | null>(null);
  const rawImagePath = item.metadata?.image?.trim() || "";
  const imageUrl = useResolvedMediaUrl(rawImagePath);
  const showImage = Boolean(imageUrl) && failedImagePath !== rawImagePath;

  const { data: extractedColor } = useColor(showImage ? imageUrl : "", "hex", {
    crossOrigin: "anonymous",
  });

  const isDark =
    typeof document !== "undefined" &&
    document.documentElement.classList.contains("dark");

  const title = item.metadata?.title?.trim() || item.content;
  const description =
    item.metadata?.description?.trim() || "No description available.";
  const href = safeExternalHref(item.content);
  const cardContent = (
    <>
      {showImage && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imageUrl}
          className="max-h-72 w-full object-cover"
          alt={title}
          onError={() => setFailedImagePath(rawImagePath)}
        />
      )}
      <div
        style={{ backgroundColor: getBackgroundColor(isDark, extractedColor) }}
        className="p-4 transition-colors duration-300"
      >
        <h2
          style={{
            color: isDark ? "rgba(255, 255, 255, 1)" : "rgba(0, 0, 0, 0.9)",
          }}
          className="compact:text-base text-lg font-bold tracking-tight"
        >
          {title}
        </h2>
        <p
          style={{
            color: isDark ? "rgba(100, 100, 100, 1)" : "rgba(130, 130, 130, 1)",
            mixBlendMode: isDark ? "plus-lighter" : "multiply",
          }}
          className="compact:text-xs text-sm mix-blend-plus-lighter"
        >
          {description}
        </p>
      </div>
    </>
  );

  if (!href) {
    return (
      <div className="flex flex-col rounded-sm overflow-hidden max-w-lg">
        {cardContent}
      </div>
    );
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex flex-col rounded-sm overflow-hidden max-w-lg"
    >
      {cardContent}
    </a>
  );
};
