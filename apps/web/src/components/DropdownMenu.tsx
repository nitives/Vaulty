"use client";

import { useState, useRef, useEffect, ReactNode } from "react";
import clsx from "clsx";

export interface DropdownMenuItem {
  label: string;
  icon?: ReactNode;
  onClick: () => void;
  variant?: "default" | "danger";
}

interface DropdownMenuProps {
  trigger: ReactNode;
  items: DropdownMenuItem[];
  align?: "left" | "right";
}

export function DropdownMenu({
  trigger,
  items,
  align = "right",
}: DropdownMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  // Close on escape
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      return () => document.removeEventListener("keydown", handleEscape);
    }
  }, [isOpen]);

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        onClick={() => setIsOpen(!isOpen)}
        className="rounded-full size-6 flex items-center justify-center cursor-pointer text-neutral-400 transition-colors hover:bg-neutral-200 hover:text-neutral-600 dark:hover:bg-neutral-700 dark:hover:text-neutral-300"
        aria-label="More options"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        {trigger}
      </button>

      {isOpen && (
        <div
          ref={menuRef}
          className={clsx(
            "absolute z-50 mt-1 min-w-[140px] overflow-hidden rounded-2xl border py-1 shadow-lg",
            "border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-800",
            align === "right" ? "right-0" : "left-0",
          )}
        >
          {items.map((item, index) => (
            <button
              key={index}
              onClick={() => {
                item.onClick();
                setIsOpen(false);
              }}
              className={clsx(
                "flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors",
                item.variant === "danger"
                  ? "text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                  : "text-neutral-700 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-700",
              )}
            >
              {item.icon && <span className="h-4 w-4">{item.icon}</span>}
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
