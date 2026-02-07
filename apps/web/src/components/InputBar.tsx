"use client";

import { useState, useRef, useCallback, KeyboardEvent, DragEvent } from "react";

interface InputBarProps {
  onSubmit: (
    content: string,
    tags: string[],
    type: "note" | "image" | "link",
  ) => void;
}

export function InputBar({ onSubmit }: InputBarProps) {
  const [content, setContent] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [showTagInput, setShowTagInput] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const tagInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = useCallback(() => {
    if (!content.trim()) return;

    // Detect type based on content
    let type: "note" | "image" | "link" = "note";
    if (content.match(/^https?:\/\//)) {
      type = "link";
    }

    onSubmit(content.trim(), tags, type);
    setContent("");
    setTags([]);
    setTagInput("");
    setShowTagInput(false);
    inputRef.current?.focus();
  }, [content, tags, onSubmit]);

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
      // For now, just show the filename - later we'll handle actual file storage
      setContent(`[Image: ${imageFile.name}]`);
      setShowTagInput(true);
      setTimeout(() => tagInputRef.current?.focus(), 0);
    }

    // Handle dropped text
    const text = e.dataTransfer.getData("text/plain");
    if (text && !imageFile) {
      setContent(text);
    }
  };

  return (
    <div
      className={`rounded-xl border-2 bg-white p-4 shadow-sm transition-all dark:bg-neutral-900/10 bg-blend-overlay ${
        isDragging
          ? "border-blue-500 bg-blue-50 dark:bg-blue-950"
          : "border-neutral-200 dark:border-neutral-700"
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Main Input */}
      <textarea
        ref={inputRef}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Drop an image, paste a link, or type a quick note..."
        className="w-full resize-none bg-transparent text-base text-neutral-900 placeholder-neutral-400 outline-none dark:text-neutral-100 dark:placeholder-neutral-500"
        rows={2}
      />

      {/* Tags Row */}
      {(showTagInput || tags.length > 0) && (
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-neutral-100 pt-3 dark:border-neutral-800">
          {/* Existing Tags */}
          {tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-0.5 text-sm font-medium text-blue-800 dark:bg-blue-900 dark:text-blue-200"
            >
              #{tag}
              <button
                onClick={() => removeTag(tag)}
                className="ml-0.5 rounded-full p-0.5 hover:bg-blue-200 dark:hover:bg-blue-800"
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
            placeholder="Add tag..."
            className="flex-1 bg-transparent text-sm text-neutral-900 placeholder-neutral-400 outline-none dark:text-neutral-100 dark:placeholder-neutral-500"
          />
        </div>
      )}

      {/* Footer with hints */}
      <div className="mt-3 flex items-center justify-between text-xs text-neutral-400 dark:text-neutral-500">
        <span>
          {isDragging
            ? "Drop to add..."
            : showTagInput
              ? "Enter to add tag, Enter again to save"
              : "Enter for tags, Ctrl+Enter to save quickly"}
        </span>
        <button
          onClick={handleSubmit}
          disabled={!content.trim()}
          className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50 disabled:hover:bg-blue-600"
        >
          Save
        </button>
      </div>
    </div>
  );
}
