import clsx from "clsx";

interface TaskCheckboxProps {
  checked: boolean;
  onCheckedChange?: (checked: boolean) => void;
  className?: string;
  "aria-label"?: string;
}

export function TaskCheckbox({
  checked,
  onCheckedChange,
  className,
  "aria-label": ariaLabel,
}: TaskCheckboxProps) {
  const isInteractive = Boolean(onCheckedChange);

  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-disabled={isInteractive ? undefined : true}
      aria-label={ariaLabel ?? (checked ? "Completed task" : "Incomplete task")}
      tabIndex={isInteractive ? 0 : -1}
      onClick={(event) => {
        event.stopPropagation();
        onCheckedChange?.(!checked);
      }}
      className={clsx(
        "grid size-4 shrink-0 place-items-center rounded-md border transition-colors",
        checked
          ? "border-[var(--accent-600)] bg-[var(--accent-600)] text-white"
          : "border-black/20 bg-white/70 text-transparent dark:border-white/20 dark:bg-white/10",
        isInteractive
          ? "cursor-pointer hover:border-black/30 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-500)] focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:hover:border-white/30 dark:focus-visible:ring-offset-neutral-950"
          : "cursor-default",
        className,
      )}
    >
      <svg
        viewBox="0 0 12 12"
        aria-hidden="true"
        className={clsx(
          "size-3 transition-all",
          checked ? "scale-100 opacity-100" : "scale-0 opacity-0",
        )}
      >
        <path
          d="M2.4 6.2 4.8 8.5 9.8 3.5"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
        />
      </svg>
    </button>
  );
}
