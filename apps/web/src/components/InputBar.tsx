"use client";

import clsx from "clsx";
import {
  useState,
  useRef,
  useCallback,
  useEffect,
  KeyboardEvent,
  DragEvent,
} from "react";
import SFIcon from "@bradleyhodges/sfsymbols-react";
import { sfXmark } from "@bradleyhodges/sfsymbols";

interface InputBarProps {
  onSubmit: (
    content: string,
    tags: string[],
    type: "note" | "image" | "link",
    imageData?: string,
    imageName?: string,
  ) => void | Promise<void>;
}

export function InputBar({ onSubmit }: InputBarProps) {
  const [content, setContent] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [showTagInput, setShowTagInput] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageName, setImageName] = useState<string | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const tagInputRef = useRef<HTMLInputElement>(null);

  // Auto-resize textarea based on content
  useEffect(() => {
    const textarea = inputRef.current;
    if (!textarea) return;
    // Reset height to auto to get the correct scrollHeight
    textarea.style.height = "auto";
    // Set to scrollHeight, but keep minimum of 1 row (~24px)
    const minHeight = 24;
    textarea.style.height = `${Math.max(textarea.scrollHeight, minHeight)}px`;
  }, [content]);

  // Convert image file to data URL
  const handleImageFile = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      setImagePreview(dataUrl);
      setImageName(file.name || "Image");
      setShowTagInput(true);
      setTimeout(() => tagInputRef.current?.focus(), 0);
    };
    reader.readAsDataURL(file);
  }, []);

  // Handle paste events (for images)
  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (const item of items) {
        if (item.type.startsWith("image/")) {
          e.preventDefault();
          const file = item.getAsFile();
          if (file) {
            handleImageFile(file);
          }
          return;
        }
      }
    },
    [handleImageFile],
  );

  const handleSubmit = useCallback(() => {
    if (!content.trim() && !imagePreview) return;

    // Detect type based on content
    let type: "note" | "image" | "link" = "note";
    if (imagePreview) {
      type = "image";
    } else if (content.match(/^https?:\/\//)) {
      type = "link";
    }

    onSubmit(
      content.trim(),
      tags,
      type,
      imagePreview ?? undefined,
      imageName ?? undefined,
    );
    setContent("");
    setTags([]);
    setTagInput("");
    setShowTagInput(false);
    setImagePreview(null);
    setImageName(null);
    inputRef.current?.focus();
  }, [content, tags, imagePreview, imageName, onSubmit]);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (e.ctrlKey || e.metaKey) {
        // Ctrl/Cmd + Enter: submit
        handleSubmit();
      } else if (content.trim()) {
        // Enter: show tag input or submit if tags already added
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
        // Add tag
        const newTag = tagInput.trim().toLowerCase();
        if (!tags.includes(newTag)) {
          setTags([...tags, newTag]);
        }
        setTagInput("");
      } else {
        // Submit if no tag input
        handleSubmit();
      }
    }
    if (e.key === "Backspace" && !tagInput && tags.length > 0) {
      // Remove last tag
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

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    // Handle dropped files
    const files = Array.from(e.dataTransfer.files);
    const imageFile = files.find((f) => f.type.startsWith("image/"));

    if (imageFile) {
      handleImageFile(imageFile);
      return;
    }

    // Handle dropped text
    const text = e.dataTransfer.getData("text/plain");
    if (text) {
      setContent(text);
    }
  };

  return (
    <div
      className={clsx(
        "rounded-[24px] border p-4 shadow-sm transition-all",
        "bg-white dark:bg-neutral-900/95 transparent:dark:bg-neutral-900/95 backdrop-blur-[24px] backdrop-saturate-150",
        `${
          isDragging
            ? " bg-[var(--accent-50)] dark:bg-[var(--accent-950)]"
            : "border-black/10 dark:border-white/10"
        }`,
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Image Preview */}
      {imagePreview && (
        <div className="group/img relative mb-3 inline-block">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imagePreview}
            alt="Preview"
            className="max-h-32 rounded-lg object-cover"
          />
          <button
            onClick={() => {
              setImagePreview(null);
              setImageName(null);
              if (!content.trim()) {
                setShowTagInput(false);
                setTags([]);
                setTagInput("");
              }
            }}
            className={clsx(
              "cursor-pointer",
              "absolute top-2 right-2 transition-all",
              "opacity-0 group-hover/img:opacity-100",
              "flex items-center justify-center",
              "rounded-full p-1 size-5",
              "mix-blend-plus-lighter",
              "backdrop-blur-xl backdrop-saturate-150",
              "bg-white/10 hover:bg-neutral-100 dark:hover:bg-neutral-800",
              "text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300",
            )}
            aria-label="Remove image"
          >
            <SFIcon icon={sfXmark} size={8} weight={2} />
          </button>
        </div>
      )}

      {/* Main Input */}
      <textarea
        ref={inputRef}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        placeholder="Drop an image, paste a link, or type a quick note…"
        className={clsx(
          "w-full resize-none overflow-hidden",
          "bg-transparent !outline-none text-base",
          "text-neutral-900 placeholder-neutral-400 dark:text-white dark:placeholder-white/25",
        )}
        rows={1}
        style={{ minHeight: 28 }}
      />

      {/* Tags Row */}
      {(showTagInput || tags.length > 0) &&
        (content.trim() || imagePreview) && (
          <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-neutral-100 pt-3 dark:border-neutral-800">
            {/* Existing Tags */}
            {tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 rounded-full bg-[var(--accent-100)] px-2.5 py-0.5 text-sm font-medium text-[var(--accent-800)] dark:bg-[var(--accent-900)] dark:text-[var(--accent-200)]"
              >
                #{tag}
                <button
                  onClick={() => removeTag(tag)}
                  className="ml-0.5 rounded-full p-0.5 hover:bg-[var(--accent-200)] dark:hover:bg-[var(--accent-800)]"
                >
                  <svg
                    className="h-3 w-3"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </span>
            ))}

            {/* Tag Input */}
            <input
              ref={tagInputRef}
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={handleTagKeyDown}
              placeholder="Add tag…"
              className="flex-1 bg-transparent text-sm text-neutral-900 placeholder-neutral-400 outline-none dark:text-neutral-100 dark:placeholder-neutral-500"
            />
          </div>
        )}

      {/* Footer with hints */}
      <div className="flex items-center justify-between text-xs text-neutral-400 dark:text-neutral-500">
        <span className="h-8 flex items-center">
          {isDragging
            ? "Drop to add…"
            : showTagInput
              ? "Enter to add tag, Enter again to save"
              : "Enter for tags, Ctrl+Enter to save quickly"}
        </span>
        <button
          onClick={handleSubmit}
          disabled={!content.trim() && !imagePreview}
          className="rounded-full bg-[var(--accent-600)] px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-[var(--accent-700)] disabled:opacity-50 disabled:hover:bg-[var(--accent-600)]"
        >
          Save
        </button>
      </div>
    </div>
  );
}
