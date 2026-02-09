"use client";

import { formatTimeShort } from "@/lib/utils";
import { sfCircleFill, sfEllipsis, sfTrash } from "@bradleyhodges/sfsymbols";
import SFIcon from "@bradleyhodges/sfsymbols-react";
import { DropdownMenu } from "./DropdownMenu";

export interface Item {
  id: string;
  type: "note" | "image" | "link" | "reminder";
  content: string;
  tags: string[];
  createdAt: Date;
  reminder?: Date;
  imageUrl?: string;
}

interface ItemCardProps {
  item: Item;
  onTagClick?: (tag: string) => void;
  onDelete?: (id: string) => void;
}

// URL regex pattern
const urlRegex = /(https?:\/\/[^\s]+)/g;

// Render text with clickable links
function renderContentWithLinks(content: string) {
  const parts = content.split(urlRegex);

  return parts.map((part, index) => {
    if (urlRegex.test(part)) {
      // Reset regex lastIndex since we're reusing it
      urlRegex.lastIndex = 0;
      return (
        <a
          key={index}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[var(--accent-600)] hover:underline dark:text-[var(--accent-400)]"
          onClick={(e) => e.stopPropagation()}
        >
          {part}
        </a>
      );
    }
    return part;
  });
}

// Convert image path to display URL
function getImageUrl(imageUrl: string): string {
  // Data URLs (base64) - use as-is
  if (imageUrl.startsWith("data:")) {
    return imageUrl;
  }
  // Already a vaulty-image:// URL
  if (imageUrl.startsWith("vaulty-image://")) {
    return imageUrl;
  }
  // File path - extract just the filename and use custom protocol
  const filename = imageUrl.split(/[\\/]/).pop() || imageUrl;
  return `vaulty-image://images/${filename}`;
}

// Check if content is meaningful text (not just a filename)
function hasTextContent(content: string, imageUrl?: string): boolean {
  if (!content || content.trim() === "") return false;
  // If content matches the image filename, it's not meaningful text
  if (imageUrl) {
    const filename = imageUrl.split(/[\\/]/).pop() || "";
    // Remove timestamp prefix from filename for comparison
    const cleanFilename = filename.replace(/^\d+_/, "");
    if (content === filename || content === cleanFilename) return false;
  }
  return true;
}

export function ItemCard({ item, onTagClick, onDelete }: ItemCardProps) {
  const isLink = item.type === "link";
  const isImage = item.type === "image";
  const isReminder = item.type === "reminder";
  const showContent = hasTextContent(item.content, item.imageUrl);

  return (
    <article className="group relative flex gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-black/5 dark:hover:bg-white/5">
      {/* Avatar/Type Badge */}

      {/* Content */}
      <div className="min-w-0 flex-1">
        {/* Header: type label + timestamp */}
        <div className="flex items-center gap-2 -mt-[5px]">
          {/* <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
            {item.type}
          </span> */}
          <SFIcon
            className="text-neutral-900/10 group-hover:text-neutral-900/50 transition-colors dark:text-white/10 group-hover:dark:text-white"
            icon={sfCircleFill}
            size={6}
          />
          <span className="text-xs text-black/50 dark:text-neutral-400">
            {formatTimeShort(item.createdAt)}
          </span>
        </div>

        {/* Text content */}
        {showContent && (
          <div className="mt-0.5">
            {isLink ? (
              <a
                href={item.content}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--accent-500)] hover:underline dark:text-[var(--accent-400)]"
              >
                {item.content}
              </a>
            ) : (
              <p className="whitespace-pre-wrap text-sm text-neutral-700 dark:text-neutral-300">
                {renderContentWithLinks(item.content)}
              </p>
            )}
          </div>
        )}

        {/* Image */}
        {isImage && item.imageUrl && (
          <div className="mt-2 max-w-md">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={getImageUrl(item.imageUrl)}
              alt="Saved image"
              className="rounded-lg object-cover"
              style={{ maxHeight: "300px", maxWidth: "100%" }}
            />
          </div>
        )}

        {/* Reminder */}
        {isReminder && item.reminder && (
          <div className="mt-1 flex items-center gap-1.5 text-sm text-amber-600 dark:text-amber-400">
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span>Reminder: {item.reminder.toLocaleDateString()}</span>
          </div>
        )}

        {/* Tags */}
        {item.tags.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {item.tags.map((tag) => (
              <button
                key={tag}
                onClick={() => onTagClick?.(tag)}
                className="rounded-full px-1.5 py-0.5 text-xs text-neutral-500 transition-colors hover:bg-white/15 hover:text-neutral-700 dark:text-neutral-400 dark:hover:bg-neutral-700 dark:hover:text-neutral-200"
              >
                #{tag}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* More menu - appears on hover */}
      <div className="absolute top-2 right-2 opacity-0 transition-opacity group-hover:opacity-100">
        <DropdownMenu
          trigger={<SFIcon icon={sfEllipsis} size={12} />}
          items={[
            {
              label: "Delete",
              icon: <SFIcon icon={sfTrash} size={14} />,
              onClick: () => onDelete?.(item.id),
              variant: "danger",
            },
          ]}
        />
      </div>
    </article>
  );
}
