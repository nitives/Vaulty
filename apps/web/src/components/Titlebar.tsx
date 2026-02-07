"use client";

import { useState, useEffect, useCallback, useSyncExternalStore } from "react";
import SFIcon from "@bradleyhodges/sfsymbols-react";
import {
  sfEllipsis,
  sfInsetFilledLeadingthirdRectanglePortrait,
  sfRectangle,
  sfSidebarLeft,
} from "@bradleyhodges/sfsymbols";
import { useSettings } from "@/lib/settings";
import { SidebarIcon } from "./SidebarIcon";

// Get electronAPI safely
function getElectronAPI() {
  if (typeof window !== "undefined") {
    return window.electronAPI;
  }
  return undefined;
}

// Subscribe to nothing - we just use this to detect if we're in the browser
function subscribe() {
  return () => {};
}

function getIsElectronSnapshot() {
  return !!getElectronAPI();
}

function getIsElectronServerSnapshot() {
  return false;
}

// Shared styles for window control buttons
const windowControlBase =
  "flex h-full w-12 items-center justify-center text-neutral-500 transition-colors dark:text-neutral-400";
const windowControlHover = "hover:bg-black/10 dark:hover:bg-white/10";
const windowControlCloseHover = "hover:bg-red-600 hover:text-white";

interface TitlebarProps {
  sidebarCollapsed?: boolean;
  onToggleSidebar?: () => void;
  onOpenSettings?: () => void;
}

export function Titlebar({
  sidebarCollapsed,
  onToggleSidebar,
  onOpenSettings,
}: TitlebarProps) {
  const { settings } = useSettings();
  const transparency = settings.transparency;
  const isElectron = useSyncExternalStore(
    subscribe,
    getIsElectronSnapshot,
    getIsElectronServerSnapshot,
  );
  const [isMaximized, setIsMaximized] = useState(false);

  const updateMaximizedState = useCallback(async () => {
    const api = getElectronAPI();
    if (api) {
      const maximized = await api.isMaximized();
      setIsMaximized(maximized);
    }
  }, []);

  useEffect(() => {
    if (!isElectron) return;

    // Check initial state - schedule after effect to avoid cascading render warning
    const checkInitialState = () => {
      updateMaximizedState();
    };
    queueMicrotask(checkInitialState);

    // Listen for window resize to update maximize state
    const handleResize = () => {
      updateMaximizedState();
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [isElectron, updateMaximizedState]);

  const handleMinimize = () => {
    getElectronAPI()?.minimizeWindow();
  };

  const handleMaximize = async () => {
    await getElectronAPI()?.maximizeWindow();
    updateMaximizedState();
  };

  const handleClose = () => {
    getElectronAPI()?.closeWindow();
  };

  // Don't render titlebar in browser (non-Electron)
  // if (!isElectron) {
  //   return null;
  // }

  return (
    <header
      className={`flex h-9 select-none items-center justify-between border-b  ${
        transparency
          ? "bg-neutral-50/50 dark:bg-neutral-900/50 backdrop-blur-sm border-[var(--edge-border-color-light)] dark:border-[var(--edge-border-color-dark)]"
          : "bg-neutral-50 dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800"
      }`}
      style={{ WebkitAppRegion: "drag" } as React.CSSProperties}
    >
      {/* App Title */}
      <div
        className="flex h-full items-center pl-3"
        style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
      >
        <div
          className="flex items-center gap-2 pr-3"
          style={{ WebkitAppRegion: "drag" } as React.CSSProperties}
        >
          <svg
            className="h-4 w-4 text-blue-600 dark:text-blue-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"
            />
          </svg>
          <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
            Vaulty
          </span>
        </div>
        {/* Settings Button */}
        <button
          onClick={onOpenSettings}
          tabIndex={-1}
          className="flex h-6 w-9 rounded-[5px] items-center justify-center cursor-pointer text-neutral-900 transition-colors hover:bg-black/10 dark:text-neutral-100 mix-blend-plus-lighter dark:hover:bg-white/5"
          aria-label="Open settings"
        >
          <SFIcon icon={sfEllipsis} size={16} />
        </button>
        {/* Sidebar Toggle */}
        <button
          onClick={onToggleSidebar}
          tabIndex={-1}
          className="flex h-6 w-9 rounded-[5px] items-center justify-center cursor-pointer text-neutral-900 transition-colors hover:bg-black/10 dark:text-neutral-100 mix-blend-plus-lighter dark:hover:bg-white/5"
          aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <SidebarIcon size={18} collapsed={sidebarCollapsed} />
        </button>
      </div>

      {/* Window Controls */}
      <div
        className="flex h-full"
        style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
      >
        {/* Minimize */}
        <button
          onClick={handleMinimize}
          tabIndex={-1}
          className={`${windowControlBase} ${windowControlHover}`}
          aria-label="Minimize"
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
              d="M20 12H4"
            />
          </svg>
        </button>

        {/* Maximize/Restore */}
        <button
          onClick={handleMaximize}
          tabIndex={-1}
          className={`${windowControlBase} ${windowControlHover}`}
          aria-label={isMaximized ? "Restore" : "Maximize"}
        >
          {isMaximized ? (
            // Restore icon (two overlapping squares)
            <svg
              className="h-3.5 w-3.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 4h12v12M4 8h12v12H4z"
              />
            </svg>
          ) : (
            // Maximize icon (single square)
            <svg
              className="h-3.5 w-3.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <rect x="4" y="4" width="16" height="16" rx="1" strokeWidth={2} />
            </svg>
          )}
        </button>

        {/* Close */}
        <button
          onClick={handleClose}
          tabIndex={-1}
          className={`${windowControlBase} ${windowControlCloseHover}`}
          aria-label="Close"
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
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>
    </header>
  );
}
