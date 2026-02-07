"use client";

import Image from "next/image";
import { formatDistanceToNow } from "@/lib/utils";

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

const typeIcons: Record<Item["type"], string> = {
  note: "📝",
  image: "🖼️",
  link: "🔗",
  reminder: "⏰",
};

export function ItemCard({ item, onTagClick, onDelete }: ItemCardProps) {
  const isLink = item.type === "link";
  const isImage = item.type === "image";
  const isReminder = item.type === "reminder";

  return (
    <article className="group rounded-xl border border-neutral-200 bg-white p-4 shadow-sm transition-all hover:shadow-md dark:border-neutral-800 dark:bg-neutral-900">
      {/* Header */}
      <div className="mb-2 flex items-start justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">{typeIcons[item.type]}</span>
          <span className="text-xs text-neutral-500 dark:text-neutral-400">
            {formatDistanceToNow(item.createdAt)}
          </span>
        </div>
        <button
          onClick={() => onDelete?.(item.id)}
          className="rounded p-1 text-neutral-400 opacity-0 transition-opacity hover:bg-neutral-100 hover:text-neutral-600 group-hover:opacity-100 dark:hover:bg-neutral-800 dark:hover:text-neutral-300"
          aria-label="Delete item"
        >
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
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
            />
          </svg>
        </button>
      </div>

      {/* Content */}
      <div className="mb-3">
        {isImage && item.imageUrl && (
          <Image
            src={item.imageUrl}
            alt="Saved image"
            width={400}
            height={192}
            className="mb-2 max-h-48 rounded-lg object-cover"
          />
        )}

        {isLink ? (
          <a
            href={item.content}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline dark:text-blue-400"
          >
            {item.content}
          </a>
        ) : (
          <p className="whitespace-pre-wrap text-sm text-neutral-800 dark:text-neutral-200">
            {item.content}
          </p>
        )}

        {isReminder && item.reminder && (
          <div className="mt-2 flex items-center gap-1.5 text-sm text-amber-600 dark:text-amber-400">
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
      </div>

      {/* Tags */}
      {item.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {item.tags.map((tag) => (
            <button
              key={tag}
              onClick={() => onTagClick?.(tag)}
              className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-600 transition-colors hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-700"
            >
              #{tag}
            </button>
          ))}
        </div>
      )}
    </article>
  );
}
