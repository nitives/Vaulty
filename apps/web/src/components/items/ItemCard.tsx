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
import { renderMarkdown, setMarkdownTaskChecked } from "@/lib/markdown";
import { useSettings } from "@/lib/settings";
import { useResolvedMediaUrl } from "@/hooks/useResolvedMediaUrl";
import { useState, useRef, useEffect, useCallback } from "react";
import clsx from "clsx";
import { buttonStyles } from "@/styles/Button";
import { Lightbox } from "../modals/Lightbox";
import { AudioCard } from "./AudioCard";
import { LinkWidget } from "./LinkWidget";
import { AddTagButton, Tags } from "./Tags";
import { VideoCard } from "./types/VideoCard";

export interface Item {
  id: string;
  type: "note" | "image" | "link" | "reminder" | "audio" | "video";
  content: string;
  tags: string[];
  createdAt: Date;
  updatedAt?: Date;
  reminder?: Date;
  imageUrl?: string;
  imageUrls?: string[];
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
  onUpdateTags?: (id: string, newTags: string[]) => void;
  onDelete?: (id: string) => void;
  onEdit?: (id: string, newContent: string) => void;
  onMove?: (id: string) => void;
}

// Check if content is meaningful text (not just a filename)
function hasTextContent(
  content: string,
  imageUrl?: string,
  imageUrls?: string[],
): boolean {
  if (!content || content.trim() === "") return false;
  if (imageUrls && imageUrls.length > 1 && /^\d+\s+images$/i.test(content)) {
    return false;
  }
  // If content matches the image filename, it's not meaningful text
  const imagePaths = [imageUrl, ...(imageUrls ?? [])].filter(
    (path): path is string => Boolean(path),
  );
  for (const imagePath of imagePaths) {
    const filename = imagePath.split(/[\\/]/).pop() || "";
    // Remove timestamp prefix from filename for comparison
    const cleanFilename = filename.replace(/^\d+_(?:\d+_)?/, "");
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

interface ImageTileProps {
  imagePath: string;
  imageCount: number;
  index: number;
  extraCount: number;
  onOpen: (imagePath: string) => void;
}

function ImageTile({
  imagePath,
  imageCount,
  index,
  extraCount,
  onOpen,
}: ImageTileProps) {
  const imageUrl = useResolvedMediaUrl(imagePath);

  return (
    <button
      type="button"
      onClick={() => onOpen(imagePath)}
      className={clsx(
        "relative block overflow-hidden bg-black/5 text-left dark:bg-white/5",
        "cursor-pointer transition-opacity hover:opacity-90",
        imageCount === 1 ? "max-w-full rounded-sm" : "aspect-[4/3]",
      )}
      aria-label={`Open saved image ${index + 1}`}
    >
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imageUrl}
          alt={`Saved image ${index + 1}`}
          className={clsx(
            imageCount === 1
              ? "block max-h-[300px] max-w-full object-contain"
              : "h-full w-full object-cover",
          )}
        />
      ) : (
        <div
          className={clsx(
            "animate-pulse bg-black/5 dark:bg-white/5",
            imageCount === 1 ? "h-32 w-48" : "h-full w-full",
          )}
        />
      )}
      {index === 3 && extraCount > 0 && (
        <span className="absolute inset-0 grid place-items-center bg-black/55 text-xl font-semibold text-white">
          +{extraCount}
        </span>
      )}
    </button>
  );
}

export function ItemCard({
  item,
  onTagClick,
  onUpdateTags,
  onDelete,
  onEdit,
  onMove,
}: ItemCardProps) {
  const { settings } = useSettings();
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(item.content);
  const [selectedImagePath, setSelectedImagePath] = useState<string | null>(
    null,
  );
  const selectedImageUrl = useResolvedMediaUrl(selectedImagePath);

  const isLink = item.type === "link";
  const isImage = item.type === "image";
  const isAudio = item.type === "audio";
  const isVideo = item.type === "video";
  const isReminder = item.type === "reminder";
  const imagePaths =
    item.imageUrls && item.imageUrls.length > 0
      ? item.imageUrls
      : item.imageUrl
        ? [item.imageUrl]
        : [];
  const showContent = hasTextContent(
    item.content,
    item.imageUrl,
    item.imageUrls,
  );

  // Tags Editing State
  const [tagInput, setTagInput] = useState("");
  const [isAddingTag, setIsAddingTag] = useState(false);
  const tagInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isAddingTag && tagInputRef.current) {
      tagInputRef.current.focus();
    }
  }, [isAddingTag]);

  const handleTaskToggle = useCallback(
    (lineIndex: number, checked: boolean) => {
      if (!onEdit) return;

      const nextContent = setMarkdownTaskChecked(
        item.content,
        lineIndex,
        checked,
      );
      if (nextContent !== item.content) {
        onEdit(item.id, nextContent);
      }
    },
    [item.content, item.id, onEdit],
  );

  const handleAddTag = () => {
    if (!tagInput.trim() || !onUpdateTags) {
      setIsAddingTag(false);
      return;
    }
    const currentTags = item.tags || [];
    if (!currentTags.includes(tagInput.trim())) {
      onUpdateTags(item.id, [...currentTags, tagInput.trim()]);
    }
    setTagInput("");
    setIsAddingTag(false);
  };

  const handleRemoveTag = (tagToRemove: string) => {
    if (!onUpdateTags) return;
    onUpdateTags(
      item.id,
      item.tags.filter((t) => t !== tagToRemove),
    );
  };

  const handleSaveEdit = () => {
    const currentContent = showContent ? item.content : "";
    if (editContent.trim() !== currentContent.trim()) {
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
          <SFIcon
            className="text-neutral-900/10 group-hover:text-neutral-900/50 transition-colors dark:text-white/10 group-hover:dark:text-white"
            icon={sfCircleFill}
            size={6}
          />
          <span
            data-vaulty-hierarchy="secondary"
            id="item-time"
            className="text-xs text-black/50 dark:text-white/50"
          >
            {formatTimeShort(item.createdAt)}
            {settings.showImageSize &&
              item.type === "image" &&
              item.size !== undefined && <> • {formatSize(item.size)}</>}
          </span>
        </div>

        {/* Text content */}
        {(showContent || isEditing) && (
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
                      setEditContent(showContent ? item.content : "");
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
              <LinkWidget item={item} />
            ) : (
              <div className="text-sm text-neutral-700 dark:text-neutral-300 break-words">
                {renderMarkdown(item.content, {
                  onTaskToggle: onEdit ? handleTaskToggle : undefined,
                })}
              </div>
            )}
          </div>
        )}

        {/* Image / Video / Audio */}
        {isImage && imagePaths.length > 0 && (
          <div
            className={clsx(
              "mt-2 overflow-hidden rounded-lg",
              imagePaths.length === 1
                ? "max-w-md"
                : "grid max-w-2xl grid-cols-2 gap-1",
            )}
          >
            {imagePaths.slice(0, 4).map((imagePath, index) => {
              const extraCount = imagePaths.length - 4;

              return (
                <ImageTile
                  key={`${imagePath}-${index}`}
                  imagePath={imagePath}
                  imageCount={imagePaths.length}
                  index={index}
                  extraCount={extraCount}
                  onOpen={setSelectedImagePath}
                />
              );
            })}
            <Lightbox
              isOpen={selectedImagePath !== null && Boolean(selectedImageUrl)}
              onClose={() => setSelectedImagePath(null)}
              imageUrl={selectedImageUrl}
              alt="Saved image"
            />
          </div>
        )}
        {/* Image Filename */}
        {settings.showImageFileName && isImage && imagePaths.length > 0 && (
          <div className="mt-2 text-sm text-black/50 dark:text-white/50 mb-2">
            {item.content}
          </div>
        )}

        {isAudio && item.imageUrl && (
          <AudioCard item={item} audioUrl={item.imageUrl} />
        )}

        {isVideo && item.imageUrl && <VideoCard item={item} />}

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
        {(item.tags.length > 0 || isEditing || isAddingTag) && (
          <div className="mt-1.5 flex flex-wrap items-center gap-1 group/tags">
            {item.tags.map((tag) => (
              <Tags
                key={tag}
                tag={tag}
                onTagClick={onTagClick}
                onUpdateTags={onUpdateTags}
                handleRemoveTag={handleRemoveTag}
              />
            ))}

            {onUpdateTags && isAddingTag ? (
              <div className="flex items-center ml-1">
                <input
                  ref={tagInputRef}
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleAddTag();
                    if (e.key === "Escape") {
                      setIsAddingTag(false);
                      setTagInput("");
                    }
                  }}
                  onBlur={handleAddTag}
                  className="w-20 rounded border border-white/5 bg-black/5 dark:bg-white/5 px-1 text-xs text-black/50 dark:text-white/50 outline-none focus:ring-1 focus:ring-neutral-500/30"
                  placeholder="tag"
                />
              </div>
            ) : null}

            {onUpdateTags && !isAddingTag && (
              <AddTagButton
                isEditing={isEditing}
                setIsAddingTag={setIsAddingTag}
              />
            )}
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
                    onClick: () => {
                      setEditContent(showContent ? item.content : "");
                      setIsEditing(true);
                    },
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
