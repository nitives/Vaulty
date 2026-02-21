import { useState, useRef, useEffect } from "react";
import clsx from "clsx";
import SFIcon from "@bradleyhodges/sfsymbols-react";
import { sfPlayFill, sfPauseFill } from "@bradleyhodges/sfsymbols";
import { Item } from "../ItemCard";

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
  const coverArt = meta.image || null; // expecting base64 data url from jsmediatags

  // consistent fallback gradient
  const fallbackClass =
    FALLBACK_GRADIENTS[getHash(title) % FALLBACK_GRADIENTS.length];

  const albumYearText = [album, year].filter(Boolean).join(" • ");

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
    <div className="mt-3 flex w-full max-w-sm flex-col overflow-hidden rounded-2xl border border-black/5 bg-white/50 shadow-sm backdrop-blur-md dark:border-white/10 dark:bg-neutral-800/50">
      {/* Hidden Audio Element */}
      <audio ref={audioRef} src={audioUrl} preload="metadata" />

      {/* Top Section: Art + Meta */}
      <div className="flex flex-row p-3">
        {/* Cover Art */}
        <div className="relative select-none h-24 w-24 shrink-0 overflow-hidden rounded-xl shadow-md">
          {coverArt ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={
                coverArt.startsWith("data:")
                  ? coverArt
                  : `vaulty-image://images/${coverArt.split(/[\\/]/).pop()}`
              }
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

        {/* Metadata */}
        <div className="ml-4 flex flex-col justify-center overflow-hidden py-1">
          <div className="truncate text-lg font-bold tracking-tight text-neutral-900 dark:text-neutral-50">
            {title}
          </div>
          <div className="truncate text-sm font-medium text-[var(--accent-600)] dark:text-[var(--accent-400)]">
            {artist}
          </div>
          {albumYearText && (
            <div className="mt-1 truncate text-xs text-neutral-500 dark:text-neutral-400">
              {albumYearText}
            </div>
          )}
        </div>
      </div>

      {/* Bottom Section: Controls */}
      <div className="flex gap-1 bg-black/5 px-4 py-3 dark:bg-white/5">
        <div className="flex items-center gap-3">
          <button
            onClick={togglePlay}
            className="flex cursor-pointer h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--accent-500)] text-white shadow-md transition-transform hover:scale-105 active:scale-95"
            aria-label={isPlaying ? "Pause" : "Play"}
          >
            <SFIcon icon={isPlaying ? sfPauseFill : sfPlayFill} size={12} />
          </button>
        </div>
        <div className="flex flex-col justify-between flex-1 select-none">
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
            className="h-1.5 mt-1 cursor-pointer appearance-none rounded-full bg-black/10 bg-no-repeat accent-[var(--accent-500)] bg-[image:linear-gradient(to_right,var(--accent-500),var(--accent-500))] dark:bg-white/10"
          />
          <div className="flex justify-between text-[10px] font-medium text-neutral-400 dark:text-neutral-500">
            <span>{formatTime(audioRef.current?.currentTime || 0)}</span>
            <span>{formatTime(duration)}</span>
          </div>
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
}

export function AudioPreview({ metadata, filename }: AudioPreviewProps) {
  const title = metadata.title || filename;
  const artist = metadata.artist || "Unknown Artist";

  const fallbackClass =
    FALLBACK_GRADIENTS[getHash(title) % FALLBACK_GRADIENTS.length];

  return (
    <div className="flex h-16 w-64 items-center gap-3 rounded-xl border border-black/5 bg-neutral-100 p-2 shadow-sm dark:border-white/10 dark:bg-neutral-800">
      <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg shadow-sm">
        {metadata.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={metadata.image}
            alt={title}
            className="h-full w-full object-cover"
          />
        ) : (
          <div
            className={clsx(
              "flex h-full w-full items-center justify-center text-white/50",
              fallbackClass,
            )}
          >
            ♪
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1 flex flex-col justify-center">
        <div className="truncate text-sm font-semibold text-neutral-900 dark:text-neutral-100">
          {title}
        </div>
        <div className="truncate text-xs text-neutral-500 dark:text-neutral-400">
          {artist}
        </div>
      </div>
    </div>
  );
}
