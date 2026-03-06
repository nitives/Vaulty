"use client";
import { ItemCard, Item } from "./ItemCard";
import clsx from "clsx";

interface ItemListProps {
  items: Item[];
  onTagClick?: (tag: string) => void;
  onDelete?: (id: string) => void;
  onEdit?: (id: string, newContent: string) => void;
  onUpdateTags?: (id: string, newTags: string[]) => void;
  onMove?: (id: string) => void;
  emptyMessage?:
    | {
        main: string;
        sub?: string;
        inputIsTop?: boolean;
      }
    | string;
  isLoading?: boolean;
  compact?: boolean;
}

export function ItemList({
  items,
  onTagClick,
  onDelete,
  onEdit,
  onUpdateTags,
  onMove,
  emptyMessage,
  isLoading = false,
  compact = false,
}: ItemListProps) {
  if (isLoading) {
    return (
      <div className="flex flex-col gap-1">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex gap-3 px-2 py-2">
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <div className="h-3 w-16 animate-pulse rounded bg-black/15 dark:bg-white/10" />
                <div className="h-3 w-12 animate-pulse rounded bg-black/15 dark:bg-white/10" />
              </div>
              <div className="h-4 w-3/4 animate-pulse rounded bg-black/15 dark:bg-white/10" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    const mainMessage =
      typeof emptyMessage === "string" ? emptyMessage : emptyMessage?.main;
    const subMessage =
      typeof emptyMessage === "object" ? emptyMessage?.sub : undefined;

    return (
      <div className="flex flex-col h-full max-w-sm mx-auto items-center justify-center py-16 text-center">
        <h1 className="font-bold text-black/90 dark:text-white/90">
          {mainMessage || "No items yet."}
        </h1>
        {subMessage && (
          <p className="text-sm text-black/50 dark:text-white/50">
            {subMessage}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className={clsx("flex flex-col gap-1", compact && "gap-0.5")}>
      {items.map((item) => (
        <ItemCard
          key={item.id}
          item={item}
          onTagClick={onTagClick}
          onDelete={onDelete}
          onEdit={onEdit}
          onUpdateTags={onUpdateTags}
          onMove={onMove}
        />
      ))}
    </div>
  );
}
