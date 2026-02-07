"use client";

import { ItemCard, Item } from "./ItemCard";

interface ItemListProps {
  items: Item[];
  onTagClick?: (tag: string) => void;
  onDeleteItem?: (id: string) => void;
  emptyMessage?: string;
}

export function ItemList({
  items,
  onTagClick,
  onDeleteItem,
  emptyMessage = "No items yet. Add something above!",
}: ItemListProps) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="mb-4 text-5xl">📦</div>
        <p className="text-neutral-500 dark:text-neutral-400">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
