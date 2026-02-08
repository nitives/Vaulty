"use client";

import { ItemCard, Item } from "./ItemCard";

interface ItemListProps {
  items: Item[];
  onTagClick?: (tag: string) => void;
  onDeleteItem?: (id: string) => void;
  emptyMessage?: string;
  isLoading?: boolean;
}

export function ItemList({
  items,
  onTagClick,
  onDeleteItem,
  emptyMessage = "No items yet. Add something above!",
  isLoading = false,
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
    return (
      <div className="flex flex-1 flex-col items-center justify-center py-16 text-center">
        <p className="text-neutral-500 dark:text-neutral-400">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      {items.map((item) => (
        <ItemCard
          key={item.id}
          item={item}
          onTagClick={onTagClick}
          onDelete={onDeleteItem}
        />
      ))}
    </div>
  );
}
