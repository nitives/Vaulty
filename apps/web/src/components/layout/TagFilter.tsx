import { sfXmark } from "@bradleyhodges/sfsymbols";
import SFIcon from "@bradleyhodges/sfsymbols-react";
import clsx from "clsx";
import { motion } from "motion/react";

export const TagFilter = ({
  activeTagFilter,
  setActiveTagFilter,
}: {
  activeTagFilter: string;
  setActiveTagFilter: (tag: string | null) => void;
}) => {
  return (
    <motion.div
      key="tag-filter"
      layout="position"
      layoutId="tag-filter-layout"
      initial={{ y: -10, opacity: 0, filter: "blur(12px)" }}
      animate={{ y: 0, opacity: 1, filter: "blur(0px)" }}
      exit={{ y: -10, opacity: 0, filter: "blur(12px)" }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
    >
      <div
        className={clsx(
          "rounded-full",
          "flex items-center",
          "pl-2 pr-1 py-1 gap-2",
          "backdrop-blur-xl shadow-lg",
          "bg-white/80 dark:bg-neutral-800/80",
          "text-neutral-900 dark:text-neutral-100",
          "border border-neutral-200 dark:border-neutral-700",
        )}
      >
        <span className="text-xs text-black/50 dark:text-white/50">
          Filtering by tag:
        </span>
        <button
          onClick={() => setActiveTagFilter(null)}
          className={clsx(
            "cursor-pointer",
            "rounded-full",
            "inline-flex items-center",
            "px-1.5 py-0.5",
            "text-xs font-medium",
            "backdrop-blur-xl",
            "bg-[var(--accent-100)] dark:bg-[var(--accent-900)]",
            "text-[var(--accent-800)] dark:text-[var(--accent-200)]",
            "border border-black/10 dark:border-white/10",
          )}
        >
          #{activeTagFilter}
        </button>
      </div>
    </motion.div>
  );
};
