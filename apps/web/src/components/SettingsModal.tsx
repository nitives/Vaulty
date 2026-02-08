"use client";
import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { useSettings } from "@/lib/settings";
import { Icon, type IconName } from "./Icon";
import { Toggle } from "./Toggle";
import { Select } from "./Select";
import SFIcon from "@bradleyhodges/sfsymbols-react";
import { sfXmark } from "@bradleyhodges/sfsymbols";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// -- Sidebar sections --

type SectionId = "appearance" | "behavior" | "storage" | "about";

interface SectionDef {
  id: SectionId;
  label: string;
  icon: IconName;
}

const sections: SectionDef[] = [
  { id: "appearance", label: "Appearance", icon: "paintbrush" },
  { id: "behavior", label: "Behavior", icon: "sliderHorizontal3" },
  { id: "storage", label: "Storage", icon: "internaldrive" },
  { id: "about", label: "About", icon: "infoCircle" },
];

// -- Reusable settings row --

interface SettingsRowProps {
  label: string;
  description?: string;
  children: React.ReactNode;
}

function SettingsRow({ label, description, children }: SettingsRowProps) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg bg-neutral-100 px-4 py-3 dark:bg-neutral-800">
      <div className="flex-1">
        <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
          {label}
        </p>
        {description && (
          <p className="text-xs text-neutral-500 w-[90%] dark:text-neutral-400">
            {description}
          </p>
        )}
      </div>
      <div className="flex-shrink-0">{children}</div>
    </div>
  );
}

// -- Section content components --

function AppearanceSection() {
  const { settings, update } = useSettings();

  return (
    <div className="space-y-2">
      <SettingsRow
        label="Theme"
        description="Choose your preferred color scheme"
      >
        <Select
          value={settings.theme ?? "system"}
          onChange={(v) => update({ theme: v as "system" | "light" | "dark" })}
          options={[
            { value: "system", label: "System" },
            { value: "light", label: "Light" },
            { value: "dark", label: "Dark" },
          ]}
        />
      </SettingsRow>
      <SettingsRow
        label="Input bar position"
        description="Place the input bar at the top or bottom of the content area (also reverses the content order)"
      >
        <Select
          value={settings.inputBarPosition ?? "bottom"}
          onChange={(v) => update({ inputBarPosition: v as "top" | "bottom" })}
          options={[
            { value: "top", label: "Top" },
            { value: "bottom", label: "Bottom" },
          ]}
        />
      </SettingsRow>
      <SettingsRow label="Compact mode" description="Reduce spacing in the UI">
        <Toggle
          checked={settings.compactMode ?? false}
          onChange={(v) => update({ compactMode: v })}
        />
      </SettingsRow>
      <SettingsRow
        label="Transparent titlebar"
        description="Make the titlebar background transparent (Requires window transparency to be visible)"
      >
        <Toggle
          checked={settings.titlebarTransparent ?? false}
          onChange={(v) => update({ titlebarTransparent: v })}
        />
      </SettingsRow>
      <SettingsRow
        label="Window transparency"
        description="Enable transparent blur background"
      >
        <Toggle
          checked={settings.transparency ?? false}
          onChange={(v) => update({ transparency: v })}
        />
      </SettingsRow>
      {settings.transparency && (
        <SettingsRow
          label="Blur style"
          description="Mica uses your wallpaper tint, Acrylic uses a frosted glass effect"
        >
          <Select
            value={settings.backgroundMaterial ?? "mica"}
            onChange={(v) =>
              update({ backgroundMaterial: v as "mica" | "acrylic" })
            }
            options={[
              { value: "mica", label: "Mica" },
              { value: "acrylic", label: "Acrylic" },
            ]}
          />
        </SettingsRow>
      )}
    </div>
  );
}

function BehaviorSection() {
  const { settings, update } = useSettings();

  return (
    <div className="space-y-2">
      <SettingsRow
        label="Start with sidebar collapsed"
        description="Sidebar will be collapsed on app launch"
      >
        <Toggle
          checked={settings.startCollapsed ?? false}
          onChange={(v) => update({ startCollapsed: v })}
        />
      </SettingsRow>
      <SettingsRow
        label="Confirm before deleting"
        description="Show confirmation dialog when deleting items"
      >
        <Toggle
          checked={settings.confirmBeforeDelete ?? true}
          onChange={(v) => update({ confirmBeforeDelete: v })}
        />
      </SettingsRow>
    </div>
  );
}

function StorageSection() {
  return (
    <div className="space-y-2">
      <SettingsRow
        label="Data location"
        description="Where your items are stored"
      >
        <button className="rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-50 dark:border-neutral-600 dark:bg-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-600">
          Change
        </button>
      </SettingsRow>
      <SettingsRow
        label="Clear all data"
        description="Delete all saved items permanently"
      >
        <button className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-red-700">
          Clear Data
        </button>
      </SettingsRow>
    </div>
  );
}

function AboutSection() {
  return (
    <div className="rounded-lg bg-neutral-100 px-4 py-3 dark:bg-neutral-800">
      <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
        Vaulty
      </p>
      <p className="text-xs text-neutral-500 dark:text-neutral-400">
        Version 0.1.0
      </p>
      <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">
        A local-first scrapbook for screenshots, notes, links, and reminders.
      </p>
    </div>
  );
}

const sectionContent: Record<SectionId, React.FC> = {
  appearance: AppearanceSection,
  behavior: BehaviorSection,
  storage: StorageSection,
  about: AboutSection,
};

// -- Modal --

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const [activeSection, setActiveSection] = useState<SectionId>("appearance");
  const modalRef = useRef<HTMLDivElement>(null);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Close when clicking outside
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const ActiveContent = sectionContent[activeSection];
  const activeLabel = sections.find((s) => s.id === activeSection)?.label ?? "";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/5"
      onClick={handleBackdropClick}
    >
      <div
        ref={modalRef}
        className={clsx(
          "relative flex h-[70vh] w-full max-w-3xl overflow-hidden rounded-xl border",
          "bg-white/75 dark:bg-neutral-900/85",
          "transparent:bg-neutral-100/95 transparent:dark:bg-neutral-900/95",
          "border-neutral-200 dark:border-neutral-700",
          "transparent:border-white/25 transparent:dark:border-white/10",
          "backdrop-blur-[24px]",
        )}
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
        style={{ boxShadow: "var(--shadow-1)" }}
      >
        {/* Sidebar */}
        <nav
          className={clsx(
            "flex w-52 flex-shrink-0 flex-col border-r",
            "bg-white/0 dark:bg-black/0",
            "border-neutral-200 dark:border-neutral-700",
          )}
        >
          <div className="px-5 pt-5 pb-3">
            <h2
              id="settings-title"
              className="text-2xl select-none font-bold text-neutral-900 dark:text-neutral-100"
            >
              Settings
            </h2>
          </div>

          <div className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-3 pb-3">
            {sections.map((section) => {
              const isActive = section.id === activeSection;
              return (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`flex select-none items-center gap-2.5 rounded-lg px-3 py-1.5 text-left text-sm font-medium transition-colors cursor-pointer ${
                    isActive
                      ? "bg-blue-600 text-white"
                      : "text-neutral-700 hover:bg-neutral-200/70 transparent:hover:bg-white/50 dark:text-neutral-300 dark:hover:bg-white/5 transparent:dark:hover:bg-black/10"
                  }`}
                >
                  <Icon
                    name={section.icon}
                    className={`text-[16px] ${isActive ? "text-white" : "text-neutral-500 dark:text-neutral-400"}`}
                  />
                  {section.label}
                </button>
              );
            })}
          </div>
        </nav>

        {/* Main content */}
        <div className="flex flex-1 flex-col overflow-hidden bg-white dark:bg-neutral-800">
          {/* Section header */}
          <div className="flex items-center justify-between border-b border-neutral-200 px-6 py-4 dark:border-neutral-700">
            <h3 className="text-base select-none font-semibold text-neutral-900 dark:text-neutral-100">
              {activeLabel}
            </h3>
            <button
              onClick={onClose}
              className={clsx(
                "rounded-full flex items-center justify-center size-7 -mr-2",
                "transition-colors cursor-pointer",
                "text-neutral-400 hover:text-neutral-500 dark:text-neutral-400 dark:hover:text-neutral-200",
                "bg-black/10 hover:bg-black/15 dark:bg-white/10 dark:hover:bg-white/15",
              )}
              aria-label="Close settings"
            >
              <SFIcon icon={sfXmark} size={12} weight={1} />
            </button>
          </div>

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto p-2">
            <ActiveContent />
          </div>
        </div>
      </div>
    </div>
  );
}
