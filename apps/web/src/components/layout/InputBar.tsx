"use client";

import clsx from "clsx";
import { useState, useRef, useCallback, useEffect, KeyboardEvent } from "react";
import { motion, AnimatePresence } from "motion/react";
import SFIcon from "@bradleyhodges/sfsymbols-react";
import { sfPlus, sfXmark } from "@bradleyhodges/sfsymbols";
// @ts-expect-error - ignoring type errors for pre-built bundle
import jsmediatags from "jsmediatags/dist/jsmediatags.min.js";
import { AudioPreview } from "../items/AudioCard";
import { useSettings } from "@/lib/settings";

interface InputBarProps {
  onSubmit: (
    content: string,
    tags: string[],
    type: "note" | "image" | "link" | "audio" | "video",
    imageData?: string,
    imageName?: string,
    metadata?: Record<string, any>,
  ) => void | Promise<void>;
}

export function InputBar({ onSubmit }: InputBarProps) {
  const { settings } = useSettings();
  const [content, setContent] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [showTagInput, setShowTagInput] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageName, setImageName] = useState<string | null>(null);
  const [audioMetadata, setAudioMetadata] = useState<Record<
    string,
    any
  > | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const tagInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [mounted, setMounted] = useState(false);

  // Wait for hydration before computing layout to avoid SSR mismatch
  useEffect(() => setMounted(true), []);

  // Determine if we should show compact layout
  // Compact mode is true when the setting is on AND content is single-line
  const isMultiLine = content.includes("\n") || content.length > 100;
  const isCompact =
    mounted &&
    settings.compactMode &&
    !isMultiLine &&
    !imagePreview &&
    !showTagInput;

  // Auto-resize textarea based on content
  useEffect(() => {
    const textarea = inputRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    const minHeight = isCompact ? 20 : 28;
    const maxHeight = 600;
    textarea.style.height = `${Math.min(Math.max(textarea.scrollHeight, minHeight), maxHeight)}px`;
    textarea.style.overflowY =
      textarea.scrollHeight > maxHeight ? "auto" : "hidden";
  }, [content, isCompact]);

  // Global window drag-drop
  useEffect(() => {
    const handleWindowDragOver = (e: globalThis.DragEvent) => {
      e.preventDefault();
      setIsDragging(true);
    };

    const handleWindowDragLeave = (e: globalThis.DragEvent) => {
      if (
        e.clientX <= 0 ||
        e.clientY <= 0 ||
        e.clientX >= window.innerWidth ||
        e.clientY >= window.innerHeight
      ) {
        setIsDragging(false);
      }
    };

    const handleWindowDrop = (e: globalThis.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      const files = Array.from(e.dataTransfer?.files ?? []);
      const mediaFile = files.find(
        (f) =>
          f.type.startsWith("image/") ||
          f.type.startsWith("audio/") ||
          f.type.startsWith("video/"),
      );

      if (mediaFile) {
        handleMediaFile(mediaFile);
        return;
      }

      const text = e.dataTransfer?.getData("text/plain");
      if (text) {
        setContent(text);
      }
    };

    window.addEventListener("dragover", handleWindowDragOver);
    window.addEventListener("dragleave", handleWindowDragLeave);
    window.addEventListener("drop", handleWindowDrop);

    return () => {
      window.removeEventListener("dragover", handleWindowDragOver);
      window.removeEventListener("dragleave", handleWindowDragLeave);
      window.removeEventListener("drop", handleWindowDrop);
    };
  }, []);

  const handleMediaFile = useCallback((file: File) => {
    if (file.type.startsWith("audio/")) {
      jsmediatags.read(file, {
        onSuccess: function (tag: any) {
          const tags = tag.tags;
          let base64String: string | undefined;

          if (tags.picture) {
            let base64 = "";
            for (let i = 0; i < tags.picture.data.length; i++) {
              base64 += String.fromCharCode(tags.picture.data[i]);
            }
            base64String = `data:${tags.picture.format};base64,${btoa(base64)}`;
          }

          setAudioMetadata({
            title: tags.title || file.name,
            artist: tags.artist,
            album: tags.album,
            year: tags.year,
            image: base64String,
          });
        },
        onError: function (error: any) {
          console.error("Error reading audio metadata:", error);
        },
      });
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      setImagePreview(dataUrl);
      setImageName(file.name || file.type.split("/")[0]);
      setShowTagInput(true);
      setTimeout(() => tagInputRef.current?.focus(), 0);
    };
    reader.readAsDataURL(file);
  }, []);

  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (const item of items) {
        if (
          item.type.startsWith("image/") ||
          item.type.startsWith("video/") ||
          item.type.startsWith("audio/")
        ) {
          e.preventDefault();
          const file = item.getAsFile();
          if (file) {
            handleMediaFile(file);
          }
          return;
        }
      }
    },
    [handleMediaFile],
  );

  const handleSubmit = useCallback(() => {
    if (!content.trim() && !imagePreview) return;

    let type: "note" | "image" | "link" | "audio" | "video" = "note";
    if (imagePreview) {
      if (imagePreview.startsWith("data:video/")) type = "video";
      else if (imagePreview.startsWith("data:audio/")) type = "audio";
      else type = "image";
    } else if (content.match(/^https?:\/\//)) {
      type = "link";
    }

    onSubmit(
      content.trim(),
      tags,
      type,
      imagePreview ?? undefined,
      imageName ?? undefined,
      audioMetadata ?? undefined,
    );
    setContent("");
    setTags([]);
    setTagInput("");
    setShowTagInput(false);
    setImagePreview(null);
    setImageName(null);
    setAudioMetadata(null);
    inputRef.current?.focus();
  }, [content, tags, imagePreview, imageName, audioMetadata, onSubmit]);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (e.ctrlKey || e.metaKey) {
        handleSubmit();
      } else if (content.trim()) {
        if (showTagInput || tags.length > 0) {
          handleSubmit();
        } else {
          setShowTagInput(true);
          setTimeout(() => tagInputRef.current?.focus(), 0);
        }
      }
    }
    if (e.key === "Escape") {
      setShowTagInput(false);
      setTagInput("");
    }
  };

  const handleTagKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (tagInput.trim()) {
        const newTag = tagInput.trim().toLowerCase();
        if (!tags.includes(newTag)) {
          setTags([...tags, newTag]);
        }
        setTagInput("");
      } else {
        handleSubmit();
      }
    }
    if (e.key === "Backspace" && !tagInput && tags.length > 0) {
      setTags(tags.slice(0, -1));
    }
    if (e.key === "Escape") {
      setShowTagInput(false);
      setTagInput("");
      inputRef.current?.focus();
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  const openFilePicker = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleMediaFile(file);
    }
    e.target.value = "";
  };

  const clearMedia = () => {
    setImagePreview(null);
    setImageName(null);
    setAudioMetadata(null);
    if (!content.trim()) {
      setShowTagInput(false);
      setTags([]);
      setTagInput("");
    }
  };

  const hasContent = content.trim() || imagePreview;

  // Add button
  const addButton = (
    <button
      onClick={openFilePicker}
      className={clsx(
        "cursor-pointer shrink-0",
        "flex items-center justify-center",
        "transition-colors",
        "text-black/30 hover:text-black/60",
        "dark:text-white/15 dark:hover:text-white/30",
      )}
      title="Add image or file"
      aria-label="Add image or file"
    >
      <SFIcon icon={sfPlus} size={16} weight={1.5} />
    </button>
  );

  // Save button
  const saveButton = (
    <button
      onClick={handleSubmit}
      disabled={!hasContent}
      className={clsx(
        "shrink-0 cursor-pointer",
        "rounded-full px-4 py-1.5",
        "text-sm font-medium text-white",
        "transition-colors",
        "bg-[var(--accent-600)] hover:bg-[var(--accent-700)]",
        "disabled:opacity-50 disabled:hover:bg-[var(--accent-600)]",
      )}
    >
      Save
    </button>
  );

  // Tag row content (shared between layouts)
  const showTags =
    (showTagInput || tags.length > 0) && (content.trim() || imagePreview);

  return (
    <>
      {/* Global drop overlay with animated dashed border */}
      {isDragging && (
        <div className="fixed inset-0 z-50 size-full opacity-50 pointer-events-none">
          <svg
            className="absolute inset-0"
            style={{ width: "calc(100% - 0px)", height: "calc(100% - 0px)" }}
          >
            <rect
              x="1.5"
              y="1.5"
              width="calc(100% - 3px)"
              height="calc(100% - 3px)"
              rx="6"
              ry="6"
              fill="none"
              stroke="var(--accent-500)"
              strokeWidth="3"
              strokeDasharray="12 8"
              className="animate-[march_0.4s_linear_infinite]"
            />
          </svg>
          <style>{`
            @keyframes march {
              to { stroke-dashoffset: -20; }
            }
          `}</style>
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*,audio/*"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Tag input pill — separate element above the main input bar */}
      <AnimatePresence>
        {showTags && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className={clsx(
              "mb-2 flex flex-wrap items-center gap-2",
              "rounded-full border p-2.5",
              "bg-white dark:bg-neutral-900/95",
              "transparent:dark:bg-neutral-900/95",
              "backdrop-blur-[24px] backdrop-saturate-150",
              "border-black/10 dark:border-white/10",
              "shadow-sm select-none",
            )}
          >
            {tags.map((tag) => (
              <motion.span
                key={tag}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="inline-flex items-center gap-1 rounded-full bg-[var(--accent-100)] px-2.5 py-0.5 pr-1 text-sm font-medium text-[var(--accent-800)] dark:bg-[var(--accent-900)] dark:text-[var(--accent-200)]"
              >
                #{tag}
                <button
                  onClick={() => removeTag(tag)}
                  className="ml-0.5 size-4 cursor-pointer flex items-center justify-center rounded-full p-0.5 hover:bg-[var(--accent-200)] dark:hover:bg-[var(--accent-800)]"
                >
                  <SFIcon icon={sfXmark} size={7} weight={2} />
                </button>
              </motion.span>
            ))}
            <input
              ref={tagInputRef}
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={handleTagKeyDown}
              placeholder="Enter tags"
              className="flex-1 rounded-full pl-1 bg-transparent text-sm text-neutral-900 placeholder-neutral-400 outline-none dark:text-neutral-100 dark:placeholder-neutral-500"
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main input container */}
      <motion.div
        layout
        transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
        className={clsx(
          "select-none border shadow-sm",
          "bg-white dark:bg-neutral-900/95",
          "transparent:dark:bg-neutral-900/95",
          "backdrop-blur-[24px] backdrop-saturate-150",
          isDragging
            ? "border-[var(--accent-500)] bg-[var(--accent-50)] dark:bg-[var(--accent-950)]"
            : "border-black/10 dark:border-white/10",
        )}
        style={{
          borderRadius: isCompact ? 9999 : 25,
          padding: isCompact ? "8px 8px 8px 16px" : 16,
        }}
        suppressHydrationWarning
      >
        {/* Image/Audio Preview */}
        <AnimatePresence>
          {imagePreview && !isCompact && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="group/img relative mb-3 inline-block overflow-hidden"
            >
              {imagePreview.startsWith("data:image/") ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="max-h-32 rounded-lg object-cover"
                />
              ) : imagePreview.startsWith("data:video/") ? (
                <video
                  src={imagePreview}
                  className="max-h-32 rounded-lg object-cover bg-black"
                  muted
                />
              ) : audioMetadata ? (
                <AudioPreview
                  metadata={audioMetadata}
                  filename={imageName || "Audio File"}
                />
              ) : (
                <div className="h-16 px-4 py-2 flex items-center justify-center rounded-lg bg-neutral-100 dark:bg-neutral-800 text-sm font-medium">
                  Audio File
                </div>
              )}
              <button
                onClick={clearMedia}
                className={clsx(
                  "cursor-pointer",
                  "absolute top-2 right-2 transition-all",
                  "opacity-0 group-hover/img:opacity-100",
                  "flex items-center justify-center",
                  "rounded-full p-1 size-5",
                  "backdrop-blur-xl backdrop-saturate-150",
                  "bg-black/10 hover:bg-black/25 dark:bg-white/10 dark:hover:bg-white/25",
                  "text-black/25 hover:text-black/50 dark:text-white/25 dark:hover:text-white/50",
                )}
                aria-label="Remove media"
              >
                <SFIcon icon={sfXmark} size={8} weight={2} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Input row */}
        <motion.div
          layout="position"
          className={clsx(
            "flex",
            isCompact ? "items-center gap-3" : "flex-col",
          )}
        >
          {/* In compact mode: [+] before textarea */}
          {isCompact && addButton}

          {/* Textarea */}
          <textarea
            ref={inputRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            placeholder="Drop an image, paste a link, or type a quick note…"
            className={clsx(
              "caret-[var(--accent-500)]",
              "resize-none",
              "bg-transparent !outline-none",
              "text-neutral-900 placeholder-neutral-400",
              "dark:text-white dark:placeholder-white/25",
              isCompact ? "flex-1 text-sm" : "w-full text-base",
            )}
            rows={1}
            style={{ minHeight: isCompact ? 20 : 28 }}
          />

          {/* In compact mode: [Save] after textarea */}
          {isCompact && saveButton}

          {/* Regular mode: bottom bar */}
          {!isCompact && (
            <div className="mt-2 flex items-center justify-between">
              {addButton}
              {saveButton}
            </div>
          )}
        </motion.div>
      </motion.div>
    </>
  );
}
