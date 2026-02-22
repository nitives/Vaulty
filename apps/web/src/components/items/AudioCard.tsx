import { useState, useRef, useEffect } from "react";
import clsx from "clsx";
import SFIcon from "@bradleyhodges/sfsymbols-react";
import { sfPlayFill, sfPauseFill, sfXmark } from "@bradleyhodges/sfsymbols";
import { useColor } from "color-thief-react";
import { Item } from "./ItemCard";


// Fallback background colors if no cover art is present
const FALLBACK_GRADIENTS = [
  "bg-gradient-to-br from-indigo-500 to-purple-600",
  "bg-gradient-to-br from-blue-400 to-emerald-400",
  "bg-gradient-to-br from-orange-400 to-rose-400",
  "bg-gradient-to-br from-slate-700 to-slate-900",
];

// Simple hash function for string to pick consistent gradient
function getHash(str: string) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash);
}

/** Convert a stored image/audio path to a vaulty-image:// URL */
function toVaultyUrl(storedPath: string | null): string | null {
  if (!storedPath) return null;
  if (storedPath.startsWith("data:")) return storedPath;
  if (storedPath.startsWith("vaulty-image://")) return storedPath;
  // Already a relative path like "images/file.jpg" or "audios/file.mp3"
  if (storedPath.startsWith("images/") || storedPath.startsWith("audios/")) {
    return `vaulty-image://${storedPath}`;
  }
  // Absolute path (legacy) — extract the relative portion after the vaulty data dir
  // e.g. "C:\Users\...\vaulty\images\file.jpg" → "images/file.jpg"
  const normalised = storedPath.replace(/\\/g, "/");
  for (const dir of ["/images/", "/audios/"]) {
    const idx = normalised.lastIndexOf(dir);
    if (idx !== -1) {
      return `vaulty-image://${normalised.slice(idx + 1)}`;
    }
  }
  // Fallback: assume images
  const filename = storedPath.split(/[\\/]/).pop() || storedPath;
  return `vaulty-image://images/${filename}`;
}

// -------------------------------------------------------------
// AudioCard - Main timeline component
// -------------------------------------------------------------

export interface AudioCardProps {
  item: Item;
  audioUrl: string;
}

export function AudioCard({ item, audioUrl }: AudioCardProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);

  const meta = item.metadata || {};
  const title = meta.title || item.content || "Unknown Track";
  const artist = meta.artist || "Unknown Artist";
  const album = meta.album || "";
  const year = meta.year || "";
  const coverArt = meta.image || null;

  const coverUrl = toVaultyUrl(coverArt);

  const { data: extractedColor } = useColor(coverUrl || "", "hex", {
    crossOrigin: "anonymous",
  });

  // Adjust the sampled color based on theme:
  // Dark mode: darken to 40% for the plus-lighter text blend
  // Light mode: lighten to a soft pastel tint (blend 70% toward white)
  const isDark =
    typeof document !== "undefined" &&
    document.documentElement.classList.contains("dark");

  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16),
        }
      : null;
  };

  let bgColor = isDark ? "#262626" : "#f0f0f0";
  if (extractedColor) {
    const rgb = hexToRgb(extractedColor);
    if (rgb) {
      if (isDark) {
        bgColor = `rgb(${Math.floor(rgb.r * 0.4)}, ${Math.floor(rgb.g * 0.4)}, ${Math.floor(rgb.b * 0.4)})`;
      } else {
        // Blend toward white: mix 30% of the color with 70% white
        bgColor = `rgb(${Math.floor(rgb.r * 0.3 + 255 * 0.7)}, ${Math.floor(rgb.g * 0.3 + 255 * 0.7)}, ${Math.floor(rgb.b * 0.3 + 255 * 0.7)})`;
      }
    }
  }

  const fallbackClass =
    FALLBACK_GRADIENTS[getHash(title) % FALLBACK_GRADIENTS.length];
  const albumYearText = [album, year].filter(Boolean).join(" - ");

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (audio.readyState >= 1) {
      if (audio.duration && isFinite(audio.duration)) {
        setDuration(audio.duration);
      }
    }

    const onTimeUpdate = () => {
      setProgress((audio.currentTime / audio.duration) * 100 || 0);
    };
    const onLoadedMetadata = () => {
      if (audio.duration && isFinite(audio.duration)) {
        setDuration(audio.duration);
      }
    };
    const onEnded = () => {
      setIsPlaying(false);
      setProgress(0);
    };

    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("loadedmetadata", onLoadedMetadata);
    audio.addEventListener("durationchange", onLoadedMetadata);
    audio.addEventListener("ended", onEnded);

    return () => {
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("loadedmetadata", onLoadedMetadata);
      audio.removeEventListener("durationchange", onLoadedMetadata);
      audio.removeEventListener("ended", onEnded);
    };
  }, []);

  const togglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (audioRef.current) {
      if (!duration || !isFinite(duration)) {
        if (audioRef.current.duration && isFinite(audioRef.current.duration)) {
          setDuration(audioRef.current.duration);
        }
      }

      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    if (audioRef.current && duration && isFinite(duration)) {
      const newTime = (Number(e.target.value) / 100) * duration;
      if (isFinite(newTime)) {
        audioRef.current.currentTime = newTime;
        setProgress(Number(e.target.value));
      }
    }
  };

  function formatTime(seconds: number) {
    if (!seconds || !isFinite(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  }

  return (
    <div
      className="mt-3 p-[18px] vibrant-border compact:p-[14px] rounded-4xl compact:rounded-3xl flex w-full max-w-sm flex-col overflow-hidden transition-colors duration-500 ease-in-out"
      style={{
        backgroundColor: bgColor,
      }}
    >
      {/* Hidden Audio Element */}
      <audio ref={audioRef} src={audioUrl} preload="metadata" />

      <div className="flex flex-col gap-[9px]">
        <div className="flex flex-row gap-[9px] items-center">
          {/* Cover Art */}
          <div className="relative select-none size-24 compact:size-16 rounded-[14px] compact:rounded-[10px] shrink-0 overflow-hidden shadow-md">
            {coverUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={coverUrl}
                alt={title}
                className="h-full w-full object-cover"
              />
            ) : (
              <div
                className={clsx(
                  "flex h-full w-full items-center justify-center font-bold text-white/50 text-3xl",
                  fallbackClass,
                )}
              >
                ♪
              </div>
            )}
          </div>

          {/* Info & Controls */}
          <div
            className="flex flex-col justify-between compact:justify-center compact:gap-2 flex-1 min-w-0 "
            style={{ mixBlendMode: isDark ? "plus-lighter" : "color-burn" }}
          >
            <div className="flex flex-col mb-1 compact:mb-0">
              <div
                className={clsx(
                  "truncate font-bold text-xl compact:text-lg leading-[1.2]",
                  isDark ? "text-neutral-200" : "text-neutral-800",
                )}
              >
                {title}
              </div>
              <div
                className={clsx(
                  "truncate font-medium mt-0.5 text-xs compact:text-[10px]",
                  isDark ? "text-neutral-400" : "text-neutral-700",
                )}
              >
                {artist}
              </div>
              {albumYearText && (
                <div
                  className={clsx(
                    "truncate text-xs compact:hidden",
                    isDark ? "text-neutral-500" : "text-neutral-700",
                  )}
                >
                  {albumYearText}
                </div>
              )}
            </div>

            {/* Normal controls */}
            <div className="flex items-center gap-3 compact:hidden">
              <button
                onClick={togglePlay}
                className={clsx(
                  "flex cursor-pointer size-8 shrink-0 items-center justify-center rounded-full transition-transform active:scale-95",
                  isDark
                    ? "bg-neutral-600 text-neutral-200 hover:bg-neutral-500"
                    : "bg-neutral-400 text-neutral-700 hover:bg-neutral-400",
                )}
              >
                <SFIcon icon={isPlaying ? sfPauseFill : sfPlayFill} size={14} />
              </button>

              <div className="flex flex-col justify-center flex-1 select-none w-full">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={isFinite(progress) ? progress : 0}
                  onChange={handleSeek}
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    backgroundSize: `${isFinite(progress) ? progress : 0}% 100%`,
                  }}
                  className={clsx(
                    "h-1.5 cursor-pointer appearance-none rounded-full bg-no-repeat transition-all",
                    isDark
                      ? "bg-neutral-600 accent-neutral-200 bg-[image:linear-gradient(to_right,rgb(212,212,212),rgb(212,212,212))]"
                      : "bg-neutral-300 accent-neutral-500 bg-[image:linear-gradient(to_right,rgb(115,115,115),rgb(115,115,115))]",
                  )}
                />
              </div>
            </div>

            {/* Compact seek bar — sits under info text */}
            <div className="hidden compact:flex items-center mt-1 select-none w-full">
              <input
                type="range"
                min="0"
                max="100"
                value={isFinite(progress) ? progress : 0}
                onChange={handleSeek}
                onClick={(e) => e.stopPropagation()}
                style={{
                  backgroundSize: `${isFinite(progress) ? progress : 0}% 100%`,
                }}
                className={clsx(
                  "h-1 w-full cursor-pointer appearance-none rounded-full bg-no-repeat transition-all",
                  isDark
                    ? "bg-neutral-600 accent-neutral-200 bg-[image:linear-gradient(to_right,rgb(212,212,212),rgb(212,212,212))]"
                    : "bg-neutral-300 accent-neutral-500 bg-[image:linear-gradient(to_right,rgb(115,115,115),rgb(115,115,115))]",
                )}
              />
            </div>
          </div>

          {/* Compact play button — sits to the right of info */}
          <button
            onClick={togglePlay}
            style={{ mixBlendMode: isDark ? "plus-lighter" : "color-burn" }}
            className={clsx(
              "hidden compact:flex cursor-pointer size-10 shrink-0 items-center justify-center rounded-full transition-transform active:scale-95",
              isDark
                ? "bg-neutral-600 text-neutral-200 hover:bg-neutral-500"
                : "bg-neutral-400/60 text-neutral-600 hover:bg-neutral-400/80",
            )}
          >
            <SFIcon icon={isPlaying ? sfPauseFill : sfPlayFill} size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// AudioPreview - InputBar miniature preview component
// -------------------------------------------------------------

export interface AudioPreviewProps {
  metadata: {
    title?: string;
    artist?: string;
    image?: string;
  };
  filename: string;
  onRemove?: () => void;
}

export function AudioPreview({
  metadata,
  filename,
  onRemove,
}: AudioPreviewProps) {
  const title = metadata.title || filename;
  const artist = metadata.artist || "Unknown Artist";

  const coverUrl = toVaultyUrl(metadata.image || null);
  const isDark =
    typeof document !== "undefined" &&
    document.documentElement.classList.contains("dark");

  const { data: extractedColor } = useColor(coverUrl || "", "hex", {
    crossOrigin: "anonymous",
  });

  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16),
        }
      : null;
  };

  let bgColor = "#262626";
  if (extractedColor) {
    const rgb = hexToRgb(extractedColor);
    if (rgb) {
      bgColor = `rgb(${Math.floor(rgb.r * 0.4)}, ${Math.floor(rgb.g * 0.4)}, ${Math.floor(rgb.b * 0.4)})`;
    }
  }

  const fallbackClass =
    FALLBACK_GRADIENTS[getHash(title) % FALLBACK_GRADIENTS.length];

  return (
    <div className="relative group/audio">
      <div
        className="flex items-center p-3 rounded-3xl gap-3 transition-colors duration-500 ease-in-out w-64"
        style={{
          backgroundColor: bgColor,
        }}
      >
        <div className="relative shrink-0 size-12 rounded-[10px] overflow-hidden shadow-sm select-none">
          {coverUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={coverUrl}
              alt={title}
              className="h-full w-full object-cover"
            />
          ) : (
            <div
              className={clsx(
                "flex h-full w-full items-center justify-center text-white/50 bg-neutral-800",
                fallbackClass,
              )}
            >
              ♪
            </div>
          )}
        </div>
        <div
          className="min-w-0 flex-1 flex flex-col justify-center"
          style={{ mixBlendMode: isDark ? "plus-lighter" : "color-dodge" }}
        >
          <div
            className={clsx(
              "truncate font-bold",
              isDark ? "text-neutral-200" : "text-neutral-500",
            )}
            style={{ fontSize: "16px" }}
          >
            {title}
          </div>
          <div
            className={clsx(
              "truncate font-medium",
              isDark ? "text-neutral-400" : "text-neutral-500",
            )}
            style={{ fontSize: "12px" }}
          >
            {artist}
          </div>
        </div>
      </div>
      {onRemove && (
        <button
          onClick={onRemove}
          className={clsx(
            "cursor-pointer",
            "absolute -top-2 -right-2 transition-all",
            "opacity-0 group-hover/audio:opacity-100",
            "flex items-center justify-center",
            "rounded-full p-1 size-6",
            isDark
              ? "bg-neutral-600 hover:bg-neutral-500 text-neutral-300 hover:text-neutral-100"
              : "bg-neutral-300 hover:bg-neutral-400 text-neutral-500 hover:text-neutral-700",
            "backdrop-blur-md",
            "shadow-sm",
          )}
          aria-label="Remove audio"
        >
          <SFIcon icon={sfXmark} size={10} weight={3} />
        </button>
      )}
    </div>
  );
}
