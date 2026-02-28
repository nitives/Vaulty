import { useRef, useEffect } from "react";
import { motion } from "motion/react";
import clsx from "clsx";
import SFIcon from "@bradleyhodges/sfsymbols-react";
import { sfMagnifyingglass, sfXmark } from "@bradleyhodges/sfsymbols";

interface FloatingSearchBarProps {
  searchQuery: string;
  setSearchQuery: (val: string) => void;
  onSearch: (val: string) => void;
  onClose: () => void;
}

export function FloatingSearchBar({
  searchQuery,
  setSearchQuery,
  onSearch,
  onClose,
}: FloatingSearchBarProps) {
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Focus when mounted
    setTimeout(() => searchInputRef.current?.focus(), 50);
  }, []);

  return (
    <motion.div
      key="search-bar"
      layout="position"
      layoutId="search-bar-layout"
      initial={{ y: -10, opacity: 0, filter: "blur(12px)" }}
      animate={{ y: 0, opacity: 1, filter: "blur(0px)" }}
      exit={{ y: -10, opacity: 0, filter: "blur(12px)" }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="relative flex items-center">
        <SFIcon
          icon={sfMagnifyingglass}
          size={16}
          className="absolute left-3 text-neutral-900 dark:text-white/50 z-10"
        />
        <input
          ref={searchInputRef}
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") onSearch(searchQuery);
            if (e.key === "Escape") {
              onClose();
              setSearchQuery("");
            }
          }}
          placeholder="Search…"
          className={clsx(
            "h-9 w-72 rounded-lg pl-10 pr-8 text-sm shadow-lg backdrop-blur",
            "bg-white/80 dark:bg-neutral-800/80",
            "text-neutral-900 dark:text-neutral-100",
            "placeholder:text-neutral-400 dark:placeholder:text-neutral-500",
            "border border-neutral-200 dark:border-neutral-700",
            "!outline-none transition-all focus:ring-2 focus:ring-[var(--accent-500)] focus:border-transparent",
          )}
        />
        <button
          onClick={() => {
            onClose();
            setSearchQuery("");
          }}
          className="absolute cursor-pointer right-0 size-8 flex items-center justify-center z-10 transition-colors text-neutral-900 hover:text-neutral-600 dark:text-white/50 dark:hover:text-white/50"
        >
          <SFIcon icon={sfXmark} size={12} weight={0.5} />
        </button>
      </div>
    </motion.div>
  );
}
