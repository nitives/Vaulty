import { formatTimeShort } from "@/lib/utils";
import {
  sfCircleFill,
  sfEllipsis,
  sfTrash,
  sfPencil,
  sfFolder,
} from "@bradleyhodges/sfsymbols";
import SFIcon from "@bradleyhodges/sfsymbols-react";
import { DropdownMenu } from "../ui/DropdownMenu";
import { renderMarkdown } from "@/lib/markdown";
import { useSettings } from "@/lib/settings";
import { useState } from "react";
import clsx from "clsx";
import { buttonStyles } from "@/styles/Button";
import { Lightbox } from "../modals/Lightbox";
import { AudioCard } from "./AudioCard";

export interface Item {
  id: string;
  type: "note" | "image" | "link" | "reminder" | "audio" | "video";
  content: string;
  tags: string[];
  createdAt: Date;
  reminder?: Date;
  imageUrl?: string;
  size?: number;
  analyzed?: {
    tags: string[];
    content: string;
  };
  metadata?: {
    title?: string;
    description?: string;
    image?: string;
    artist?: string;
    album?: string;
    year?: string;
  };
  pageId?: string;
}

export interface ItemCardProps {
  item: Item;
  onTagClick?: (tag: string) => void;
  onDelete?: (id: string) => void;
  onEdit?: (id: string, newContent: string) => void;
  onMove?: (id: string) => void;
}

// URL regex pattern
// Render text with clickable links (moved to markdown.tsx but we still need some for other uses, or just completely removed)
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
  // Already a relative path like "images/file.jpg" or "audios/file.mp3"
  if (imageUrl.startsWith("images/") || imageUrl.startsWith("audios/")) {
    return `vaulty-image://${imageUrl}`;
  }
  // Absolute path (legacy) — extract the relative portion after the vaulty data dir
  // e.g. "C:\Users\...\vaulty\images\file.jpg" → "images/file.jpg"
  const normalised = imageUrl.replace(/\\/g, "/");
  const imagesIdx = normalised.lastIndexOf("/images/");
  if (imagesIdx !== -1) {
    return `vaulty-image://${normalised.slice(imagesIdx + 1)}`;
  }
  const audiosIdx = normalised.lastIndexOf("/audios/");
  if (audiosIdx !== -1) {
    return `vaulty-image://${normalised.slice(audiosIdx + 1)}`;
  }
  // Fallback: extract filename and assume images/
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

function formatSize(bytes?: number): string {
  if (bytes === undefined) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function ItemCard({
  item,
  onTagClick,
  onDelete,
  onEdit,
  onMove,
}: ItemCardProps) {
  const { settings } = useSettings();
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(item.content);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  const isLink = item.type === "link";
  const isImage = item.type === "image";
  const isAudio = item.type === "audio";
  const isVideo = item.type === "video";
  const isReminder = item.type === "reminder";
  const showContent = hasTextContent(item.content, item.imageUrl);

  const handleSaveEdit = () => {
    if (editContent.trim() !== item.content) {
      onEdit?.(item.id, editContent);
    }
    setIsEditing(false);
  };

  return (
    <article className="group relative flex gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-black/5 dark:hover:bg-white/5">
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
          <span className="text-xs text-black/50 dark:text-white/50">
            {formatTimeShort(item.createdAt)}
            {settings.showImageSize &&
              item.type === "image" &&
              item.size !== undefined && <> • {formatSize(item.size)}</>}
          </span>
        </div>

        {/* Text content */}
        {showContent && (
          <div className="mt-1">
            {isEditing ? (
              <div className="flex flex-col gap-2 mt-2 w-full">
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="w-full resize rounded-lg border border-white/5 dark:border-white/5 bg-white dark:bg-neutral-800 p-2 text-sm text-neutral-900 dark:text-neutral-100 placeholder-neutral-400  focus:ring-1 focus:ring-white/0 outline-none"
                  rows={4}
                  autoFocus
                />
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => {
                      setEditContent(item.content);
                      setIsEditing(false);
                    }}
                    className={clsx(buttonStyles.base)}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveEdit}
                    className={clsx(buttonStyles.primary)}
                  >
                    Save
                  </button>
                </div>
              </div>
            ) : isLink ? (
              <div className="flex flex-col gap-2">
                <a
                  href={item.content}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[var(--accent-500)] hover:underline dark:text-[var(--accent-400)] break-words"
                >
                  {item.content}
                </a>
                {item.metadata && (
                  <a
                    href={item.content}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group/card flex flex-col sm:flex-row gap-3 mt-1 overflow-hidden rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white/50 dark:bg-neutral-800/50 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
                  >
                    {item.metadata.image && (
                      <div className="sm:w-32 h-32 shrink-0 overflow-hidden bg-neutral-100 dark:bg-neutral-900">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={item.metadata.image}
                          alt=""
                          className="h-full w-full object-cover transition-transform duration-300 group-hover/card:scale-105"
                        />
                      </div>
                    )}
                    <div className="flex flex-col justify-center p-3 sm:px-0 sm:py-3 sm:pr-3 min-w-0">
                      {item.metadata.title && (
                        <h4 className="font-semibold text-sm text-neutral-900 dark:text-neutral-100 line-clamp-2">
                          {item.metadata.title}
                        </h4>
                      )}
                      {item.metadata.description && (
                        <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400 line-clamp-2">
                          {item.metadata.description}
                        </p>
                      )}
                    </div>
                  </a>
                )}
              </div>
            ) : (
              <div className="text-sm text-neutral-700 dark:text-neutral-300 break-words">
                {renderMarkdown(item.content)}
              </div>
            )}
          </div>
        )}

        {/* Image / Video / Audio */}
        {isImage && item.imageUrl && (
          <div className="mt-2 max-w-md">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={getImageUrl(item.imageUrl)}
              alt="Saved image"
              className="rounded-sm object-cover cursor-pointer transition-opacity hover:opacity-90"
              style={{ maxHeight: "300px", maxWidth: "100%" }}
              onClick={() => setIsLightboxOpen(true)}
            />
            <Lightbox
              isOpen={isLightboxOpen}
              onClose={() => setIsLightboxOpen(false)}
              imageUrl={getImageUrl(item.imageUrl)}
              alt="Saved image"
            />
          </div>
        )}
        {/* Image Filename */}
        {settings.showImageFileName && isImage && item.imageUrl && (
          <div className="mt-2 text-sm text-black/50 dark:text-white/50 mb-2">
            {item.content}
          </div>
        )}

        {isAudio && item.imageUrl && (
          <AudioCard item={item} audioUrl={getImageUrl(item.imageUrl)} />
        )}

        {isVideo && item.imageUrl && (
          <div className="mt-2 max-w-md">
            <video
              controls
              src={getImageUrl(item.imageUrl)}
              className="rounded-lg object-cover bg-black"
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
                className={clsx(
                  "rounded-full cursor-pointer px-1.5 py-0.5 text-xs text-neutral-500 transition-colors hover:bg-white/15 hover:text-neutral-700 dark:text-neutral-400 dark:hover:bg-neutral-700 dark:hover:text-neutral-200",
                )}
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
            ...(onEdit
              ? [
                  {
                    label: "Edit",
                    icon: sfPencil,
                    onClick: () => setIsEditing(true),
                  },
                ]
              : []),
            {
              label: "Move to Page",
              icon: sfFolder,
              onClick: () => onMove?.(item.id),
            },
            {
              label: "Delete",
              icon: sfTrash,
              onClick: () => onDelete?.(item.id),
              variant: "danger",
            },
          ]}
        />
      </div>
    </article>
  );
}
