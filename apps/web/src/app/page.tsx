"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import {
  Sidebar,
  InputBar,
  ItemList,
  SearchBar,
  Item,
  Titlebar,
  SettingsModal,
} from "@/components";
import { generateId, parseTimeQuery } from "@/lib/utils";
import { SettingsProvider, useSettings } from "@/lib/settings";

// Demo items for initial state
const demoItems: Item[] = [
  {
    id: "demo-1",
    type: "note",
    content:
      "Minecraft cave coords: X: -234, Y: 45, Z: 892 - Found diamonds here!",
    tags: ["minecraft", "coords", "cave"],
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
  },
  {
    id: "demo-2",
    type: "note",
    content:
      "Neuvillette build: 4pc Marechaussee Hunter, Hydro DMG goblet, prioritize Crit Rate",
    tags: ["genshin", "build", "neuvillette"],
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
  },
  {
    id: "demo-3",
    type: "link",
    content: "https://github.com/features/copilot",
    tags: ["dev", "ai", "tools"],
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3), // 3 days ago
  },
  {
    id: "demo-4",
    type: "reminder",
    content: "Sample the beat from Bound 2 (1:23-1:35)",
    tags: ["sample", "music", "fl-studio"],
    createdAt: new Date(Date.now() - 1000 * 60 * 30), // 30 min ago
    reminder: new Date(Date.now() + 1000 * 60 * 60 * 24), // tomorrow
  },
];

export default function Home() {
  return (
    <SettingsProvider>
      <HomeContent />
    </SettingsProvider>
  );
}

function HomeContent() {
  const { settings } = useSettings();
  const [items, setItems] = useState<Item[]>(demoItems);
  const [activeFilter, setActiveFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTagFilter, setActiveTagFilter] = useState<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Toggle body class for transparent background
  useEffect(() => {
    if (settings.transparency) {
      document.body.classList.add("transparent-mode");
    } else {
      document.body.classList.remove("transparent-mode");
    }
    return () => {
      document.body.classList.remove("transparent-mode");
    };
  }, [settings.transparency]);

  const handleAddItem = useCallback(
    (content: string, tags: string[], type: "note" | "image" | "link") => {
      const newItem: Item = {
        id: generateId(),
        type,
        content,
        tags,
        createdAt: new Date(),
      };
      setItems((prev) => [newItem, ...prev]);
    },
    [],
  );

  const handleDeleteItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const handleTagClick = useCallback((tag: string) => {
    setActiveTagFilter((prev) => (prev === tag ? null : tag));
  }, []);

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    // Reset tag filter when searching
    if (query) {
      setActiveTagFilter(null);
    }
  }, []);

  // Filter items based on active filter, search query, and tag filter
  const filteredItems = useMemo(() => {
    let result = items;

    // Filter by type
    if (activeFilter !== "all") {
      const typeMap: Record<string, Item["type"]> = {
        notes: "note",
        images: "image",
        links: "link",
        reminders: "reminder",
      };
      const filterType = typeMap[activeFilter];
      if (filterType) {
        result = result.filter((item) => item.type === filterType);
      }
    }

    // Filter by tag
    if (activeTagFilter) {
      result = result.filter((item) => item.tags.includes(activeTagFilter));
    }

    // Filter by search query
    if (searchQuery) {
      const { cleanQuery, startDate, endDate } = parseTimeQuery(searchQuery);
      const lowerQuery = cleanQuery.toLowerCase();

      result = result.filter((item) => {
        // Date filter
        if (startDate && item.createdAt < startDate) return false;
        if (endDate && item.createdAt > endDate) return false;

        // Text search
        if (lowerQuery) {
          const matchesContent = item.content
            .toLowerCase()
            .includes(lowerQuery);
          const matchesTags = item.tags.some((tag) =>
            tag.toLowerCase().includes(lowerQuery),
          );
          return matchesContent || matchesTags;
        }

        return true;
      });
    }

    return result;
  }, [items, activeFilter, searchQuery, activeTagFilter]);

  return (
    <div
      className={`flex h-screen flex-col overflow-hidden ${settings.transparency ? "bg-transparent" : "bg-neutral-50 dark:bg-neutral-950"}`}
    >
      {/* Custom Titlebar */}
      <Titlebar
        sidebarCollapsed={sidebarCollapsed}
        onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
        onOpenSettings={() => setSettingsOpen(true)}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <Sidebar
          activeFilter={activeFilter}
          onFilterChange={setActiveFilter}
          isCollapsed={sidebarCollapsed}
        />

        {/* Main Content */}
        <main className="flex flex-1 flex-col overflow-hidden">
          {/* Header with Search */}
          <header
            className={`border-b border-neutral-200 px-6 py-4 dark:border-neutral-800 ${
              settings.transparency
                ? "bg-white/50 dark:bg-neutral-900/50 backdrop-blur-sm"
                : "bg-white dark:bg-neutral-900"
            }`}
          >
            <div className="mx-auto max-w-4xl">
              <SearchBar
                value={searchQuery}
                onChange={setSearchQuery}
                onSearch={handleSearch}
              />
            </div>
          </header>

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto px-6 py-6">
            <div className="mx-auto max-w-4xl space-y-6">
              {/* Input Bar */}
              <InputBar onSubmit={handleAddItem} />

              {/* Active Tag Filter Badge */}
              {activeTagFilter && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-neutral-500 dark:text-neutral-400">
                    Filtering by tag:
                  </span>
                  <button
                    onClick={() => setActiveTagFilter(null)}
                    className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                  >
                    #{activeTagFilter}
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
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>
              )}

              {/* Item List */}
              <ItemList
                items={filteredItems}
                onTagClick={handleTagClick}
                onDeleteItem={handleDeleteItem}
                emptyMessage={
                  searchQuery
                    ? "No items match your search."
                    : "No items yet. Add something above!"
                }
              />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
