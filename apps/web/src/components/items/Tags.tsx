import clsx from "clsx";
import { ItemCardProps } from "./ItemCard";
import { sfPlus, sfXmark } from "@bradleyhodges/sfsymbols";
import SFIcon from "@bradleyhodges/sfsymbols-react";

export const Tags = ({
  tag,
  onTagClick,
  onUpdateTags,
  handleRemoveTag,
}: {
  tag: string;
  onTagClick: ItemCardProps["onTagClick"];
  onUpdateTags: ItemCardProps["onUpdateTags"];
  handleRemoveTag: (tag: string) => void;
}) => {
  return (
    <div
      key={tag}
      className={clsx(
        "group/tag relative inline-flex items-center",
        "rounded-full px-1.5 py-0.5",
        "transition-all duration-200",
        "text-xs text-black/50 hover:text-neutral-700",
        "hover:bg-black/5 dark:text-neutral-400 dark:hover:text-neutral-200",
        "dark:hover:bg-white/5",
      )}
    >
      <button
        onClick={(e) => {
          e.stopPropagation();
          onTagClick?.(tag);
        }}
        className="cursor-pointer flex items-center outline-none"
      >
        #{tag}
      </button>

      {onUpdateTags && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleRemoveTag(tag);
          }}
          title="Remove tag"
          className={clsx(
            "cursor-pointer flex items-center justify-center",
            "transition-all duration-200 ease-in-out",
            "overflow-hidden opacity-0 max-w-[0px] group-hover/tag:max-w-[16px] group-hover/tag:opacity-100 group-hover/tag:ml-1.5",
            "text-black/40 hover:!text-red-500 dark:text-neutral-500 dark:hover:!text-red-400",
          )}
        >
          <SFIcon icon={sfXmark} weight={1} size={8} />
        </button>
      )}
    </div>
  );
};

export const AddTagButton = ({
  isEditing,
  setIsAddingTag,
}: {
  isEditing: boolean;
  setIsAddingTag: (isAddingTag: boolean) => void;
}) => {
  return (
    <button
      onClick={() => setIsAddingTag(true)}
      title="Add tag"
      className={clsx(
        "cursor-pointer flex size-4.5 items-center justify-center rounded-full bg-black/5 text-neutral-500 dark:bg-white/5 dark:text-neutral-400 transition-all hover:bg-black/10 hover:text-neutral-700 dark:hover:bg-white/10 dark:hover:text-neutral-200",
        isEditing ? "opacity-100" : "opacity-0 group-hover:opacity-100",
      )}
    >
      <SFIcon icon={sfPlus} size={10} />
    </button>
  );
};
