"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import clsx from "clsx";
import SFIcon from "@bradleyhodges/sfsymbols-react";
import { IconDefinition } from "@bradleyhodges/sfsymbols-types";

export interface ContextMenuItem {
  label: string;
  icon?: IconDefinition;
  onClick: () => void;
  variant?: "default" | "danger";
}

interface ContextMenuProps {
  isOpen: boolean;
  x: number;
  y: number;
  onClose: () => void;
  items: ContextMenuItem[];
}

export function ContextMenu({
  isOpen,
  x,
  y,
  onClose,
  items,
}: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      // Disable right-click on document while menu is open to prevent native menu appearing outside
      const handleContextMenu = (e: MouseEvent) => {
        if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
          e.preventDefault();
          onClose();
        }
      };
      document.addEventListener("contextmenu", handleContextMenu);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
        document.removeEventListener("contextmenu", handleContextMenu);
      };
    }
  }, [isOpen, onClose]);

  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      return () => document.removeEventListener("keydown", handleEscape);
    }
  }, [isOpen, onClose]);

  if (!isOpen || typeof window === "undefined") return null;

  return createPortal(
    <div
      ref={menuRef}
      id="context-menu"
      className={clsx(
        "p-1",
        "absolute z-50 min-w-[160px]",
        "overflow-hidden rounded-xl",
        "backdrop-blur-xl shadow-lg",
        "bg-neutral-100 dark:bg-neutral-900",
        "border border-black/10 dark:border-white/10 ",
      )}
      style={{
        top: Math.min(y, window.innerHeight - 100),
        left: Math.min(x, window.innerWidth - 160),
      }}
    >
      {items.map((item, index) => (
        <button
          key={index}
          onClick={(e) => {
            e.stopPropagation();
            item.onClick();
            onClose();
          }}
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
    </div>,
    document.body,
  );
}
