"use client";

import { useEffect, useRef, useState } from "react";
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
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

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

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div
      ref={menuRef}
      className={clsx(
        "absolute z-50 min-w-[160px] overflow-hidden rounded-lg border shadow-lg",
        "backdrop-blur-xl",
        "border-black/5 bg-white/20 dark:border-white/10 dark:bg-neutral-800/70",
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
            "cursor-pointer flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors",
            item.variant === "danger"
              ? "text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
              : "text-neutral-700 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-700",
          )}
        >
          {item.icon && <SFIcon icon={item.icon} size={16} />}
          {item.label}
        </button>
      ))}
    </div>,
    document.body,
  );
}
