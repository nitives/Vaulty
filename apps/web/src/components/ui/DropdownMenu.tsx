"use client";

import { useState, useRef, useEffect, ReactNode } from "react";
import clsx from "clsx";
import SFIcon from "@bradleyhodges/sfsymbols-react";
import { IconDefinition } from "@bradleyhodges/sfsymbols-types";

export interface DropdownMenuItem {
  label: string;
  icon?: IconDefinition;
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
        className="rounded-sm size-6 flex items-center justify-center cursor-pointer text-black/50 transition-colors hover:bg-black/5 hover:text-black dark:hover:bg-white/5 dark:hover:text-white"
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
            "p-1",
            "absolute z-50 min-w-[160px]",
            "overflow-hidden rounded-xl",
            "backdrop-blur-xl shadow-lg",
            "bg-neutral-100 dark:bg-neutral-900",
            "border border-black/10 dark:border-white/10",
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
              // className={clsx(
              //   "cursor-pointer",
              //   "flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors",
              //   item.variant === "danger"
              //     ? "text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
              //     : "text-neutral-700 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-700",
              // )}
              className={clsx(
                "cursor-pointer rounded-lg flex w-full items-center gap-2 px-3 py-2 compact:px-2 compact:py-1 text-left text-sm transition-colors",
                item.variant === "danger"
                  ? "text-red-600 hover:bg-red-100 dark:text-red-400 dark:hover:bg-red-400/10"
                  : "text-neutral-900 hover:bg-black/5 dark:text-white dark:hover:bg-white/5",
              )}
            >
              {item.icon && <SFIcon icon={item.icon} size={14} />}
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
