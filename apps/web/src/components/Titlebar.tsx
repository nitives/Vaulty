"use client";
import { useState, useEffect, useCallback, useSyncExternalStore } from "react";
import clsx from "clsx";
import SFIcon from "@bradleyhodges/sfsymbols-react";
import {
  sfEllipsis,
  sfMinus,
  sfSquare,
  sfSquareOnSquare,
  sfXmark,
  sfMagnifyingglass,
} from "@bradleyhodges/sfsymbols";
import { useSettings } from "@/lib/settings";
import { SidebarIcon } from "./SidebarIcon";
import { Spinner } from "./Spinner";

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
  "flex h-full w-12 items-center justify-center transition-colors text-neutral-900/75 dark:text-neutral-100";
const windowControlHover = "hover:bg-black/10 dark:hover:bg-white/10";
const windowControlCloseHover = "hover:bg-red-600 hover:text-white";

interface TitlebarProps {
  sidebarCollapsed?: boolean;
  onToggleSidebar?: () => void;
  onOpenSettings?: () => void;
  onToggleSearch?: () => void;
  isProcessing?: boolean;
}

export function Titlebar({
  sidebarCollapsed,
  onToggleSidebar,
  onOpenSettings,
  onToggleSearch,
  isProcessing,
}: TitlebarProps) {
  const { settings } = useSettings();
  const isElectron = useSyncExternalStore(
    subscribe,
    getIsElectronSnapshot,
    getIsElectronServerSnapshot,
  );
  const [isMaximized, setIsMaximized] = useState(false);

  // Keep the HTML class in sync with settings changes
  // The blocking script sets the initial class, this keeps it updated
  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.classList.toggle(
      "titlebar-transparent",
      !!settings.titlebarTransparent,
    );
  }, [settings.titlebarTransparent]);

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

  const sidebarButtonClassnames = clsx(
    "cursor-pointer",
    "flex h-6 w-9 rounded-[5px] items-center justify-center",
    "transition-colors dark:mix-blend-plus-lighter",
    "text-neutral-900/75 dark:text-neutral-100",
    "hover:bg-black/10 dark:hover:bg-white/5",
  );

  return (
    <header
      className={clsx(
        "titlebar",
        "flex h-9 select-none items-center justify-between",
        "border-b",
        "border-[var(--edge-border-color-light)] dark:border-[var(--edge-border-color-dark)]",
        "bg-white dark:bg-neutral-900",
      )}
      style={{ WebkitAppRegion: "drag" } as React.CSSProperties}
    >
      {/* App Title */}
      <div
        className="flex h-full items-center -ml-1.5"
        style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
      >
        <div
          className="flex items-center gap-2 pr-3"
          style={{ WebkitAppRegion: "drag" } as React.CSSProperties}
        >
          {/* <svg
            className="h-4 w-4 text-[var(--accent-600)] dark:text-[var(--accent-400)]"
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
          </svg> */}
          {/* <span className="pl-3 text-sm font-medium text-neutral-700 dark:text-neutral-300">
            Vaulty
          </span> */}
        </div>
        {/* Settings Button */}
        <button
          onClick={onOpenSettings}
          tabIndex={-1}
          className={sidebarButtonClassnames}
          aria-label="Open settings"
        >
          <SFIcon icon={sfEllipsis} size={16} />
        </button>
        {/* Sidebar Toggle */}
        <button
          onClick={onToggleSidebar}
          tabIndex={-1}
          className={sidebarButtonClassnames}
          aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <SidebarIcon size={18} collapsed={sidebarCollapsed} />
        </button>
        {/* Search Toggle Button */}
        <button
          onClick={onToggleSearch}
          tabIndex={-1}
          className={sidebarButtonClassnames}
          aria-label="Toggle search"
        >
          <SFIcon icon={sfMagnifyingglass} size={16} />
        </button>
        {isProcessing && (
          <div className="flex h-6 w-9 rounded-[5px] text-white items-center justify-center">
            <Spinner size="md" />
          </div>
        )}
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
          <SFIcon icon={sfMinus} size={12} weight={0.5} />
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
            <SFIcon icon={sfSquareOnSquare} size={12} weight={0.5} />
          ) : (
            // Maximize icon (single square)
            <SFIcon icon={sfSquare} size={12} weight={0.5} />
          )}
        </button>

        {/* Close */}
        <button
          onClick={handleClose}
          tabIndex={-1}
          className={`${windowControlBase} ${windowControlCloseHover}`}
          aria-label="Close"
        >
          <SFIcon icon={sfXmark} size={12} weight={0.25} />
        </button>
      </div>
    </header>
  );
}
